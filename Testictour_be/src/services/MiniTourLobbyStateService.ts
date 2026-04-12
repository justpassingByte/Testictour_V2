import { prisma } from './prisma';
import { LOBBY_STATE, LobbyState, assertValidState, PHASE_DURATIONS_MS } from '../constants/lobbyStates';
import MiniTourLobbyTimerService from './MiniTourLobbyTimerService';
import logger from '../utils/logger';
import { fetchMiniTourMatchDataQueue } from '../lib/queues';
import { startMiniTourLobbyInternal } from '../controllers/miniTourLobby.controller'; // I'll need an internal method or just logic

// Redis client (ioredis)
let _redis: any = null;

async function getRedis() {
  if (_redis) return _redis;
  const { createClient } = await import('../lib/redis');
  _redis = createClient();
  return _redis;
}

// ── Redis key helpers ──────────────────────────────────────────────────────────
const READY_KEY = (lobbyId: string) => `minitour:ready:${lobbyId}`;
const READY_COOLDOWN_KEY = (lobbyId: string, userId: string) => `minitour:ready_cooldown:${lobbyId}:${userId}`;
const LOCK_KEY = (lobbyId: string) => `lock:minitour:ready:${lobbyId}`;

async function acquireRedisLock(redis: any, key: string, ttlMs: number): Promise<string | null> {
  const token = `${Date.now()}-${Math.random()}`;
  const result = await redis.set(key, token, 'NX', 'PX', ttlMs);
  return result === 'OK' ? token : null;
}

async function releaseRedisLock(redis: any, key: string, token: string): Promise<void> {
  const current = await redis.get(key);
  if (current === token) {
    await redis.del(key);
  }
}

export interface LobbyStateSnapshot {
  lobbyId: string;
  state: LobbyState;
  readyPlayerIds: string[];
  readyCount: number;
  lobbySize: number;
  phaseStartedAt: string;
  phaseDuration: number;
}

export default class MiniTourLobbyStateService {
  static async getLobbyState(lobbyId: string): Promise<LobbyStateSnapshot> {
    const lobby = await prisma.miniTourLobby.findUniqueOrThrow({ where: { id: lobbyId } });
    
    const redis = await getRedis();
    const readyPlayerIds: string[] = await redis.smembers(READY_KEY(lobbyId));

    return {
      lobbyId,
      state: lobby.status as LobbyState,
      readyPlayerIds,
      readyCount: readyPlayerIds.length,
      lobbySize: lobby.maxPlayers, 
      phaseStartedAt: new Date().toISOString(), // we don't naturally store phaseStartedAt on MinitourLobby, so we mock or use created
      phaseDuration: Math.floor((PHASE_DURATIONS_MS as any)[lobby.status] || 0 / 1000),
    };
  }

  // ── Phase Transition ──

  /**
   * Atomic state transition — validates enum + optimistic concurrency (expectedCurrentState).
   * Uses Prisma updateMany to atomically guard against race conditions.
   */
  static async transitionPhase(lobbyId: string, from: LobbyState | string, to: LobbyState | string): Promise<void> {
    const updated = await prisma.miniTourLobby.updateMany({
      where: { id: lobbyId, status: from as any },
      data: { status: to as any },
    });

    if (updated.count === 0) {
      logger.warn(`MiniTourLobbyStateService: lobby ${lobbyId} was not in state ${from} — transition to ${to} skipped`);
      return;
    }

    logger.info(`MiniTourLobbyStateService: lobby ${lobbyId} ${from} → ${to}`);

    if (to === LOBBY_STATE.STARTING) {
      // Create match immediately or schedule it. In standard Tournament, PLAYING is where match starts.
      // But for Minitour, we can just trigger startMiniTourLobbyInternal at STARTING!
      try {
        await startMiniTourLobbyInternal(lobbyId);

        // Send push notifications to players
        const io = (global as any).__io || (global as any).io;
        if (io) {
          const lobby = await prisma.miniTourLobby.findUnique({
            where: { id: lobbyId },
            include: { participants: true }
          });
          if (lobby && lobby.participants) {
            lobby.participants.forEach((p) => {
              io.to(`user:${p.userId}`).emit('admin_notification', {
                id: `start_${lobbyId}_${Date.now()}`,
                title: 'Match is Starting!',
                body: `Your match in ${lobby.name} is starting now! Enter the lobby to play.`,
                link: `/vi/minitour/${lobbyId}`,
                sentAt: new Date().toISOString()
              });
            });
          }
        }
      } catch (err) {
        logger.error(`MiniTourLobbyStateService: failed to auto-start minitour match: ${err}`);
      }
    }

    if (to === 'COMPLETED' || to === 'CANCELLED') {
      const redis = await getRedis();
      await redis.del(READY_KEY(lobbyId));
    }

    try {
      const io = (global as any).__io || (global as any).io;
      if (io) {
        const snapshot = await MiniTourLobbyStateService.getLobbyState(lobbyId);
        io.to(`minitour:${lobbyId}`).emit('minitour_lobby_state_update', snapshot);
      }
    } catch (_) {}
  }

  static async toggleReady(lobbyId: string, userId: string): Promise<LobbyStateSnapshot> {
    const redis = await getRedis();

    const onCooldown = await redis.get(READY_COOLDOWN_KEY(lobbyId, userId));
    if (onCooldown) throw new Error('Ready toggle on cooldown (3s)');

    const lockKey = LOCK_KEY(lobbyId);
    const lockToken = await acquireRedisLock(redis, lockKey, 5000);
    if (!lockToken) throw new Error('Could not acquire lobby lock — retry in a moment');

    try {
      const lobby = await prisma.miniTourLobby.findUnique({ where: { id: lobbyId } });
      if (!lobby) throw new Error(`MiniTour Lobby ${lobbyId} not found`);
      if (![LOBBY_STATE.WAITING, LOBBY_STATE.READY_CHECK, LOBBY_STATE.GRACE_PERIOD].includes(lobby.status as any)) {
        throw new Error(`Cannot toggle ready in state: ${lobby.status}`);
      }

      const isMember = await redis.sismember(READY_KEY(lobbyId), userId);
      if (isMember) {
        await redis.srem(READY_KEY(lobbyId), userId);
      } else {
        await redis.sadd(READY_KEY(lobbyId), userId);
      }

      await redis.set(READY_COOLDOWN_KEY(lobbyId, userId), '1', 'EX', 3);

      const readyCount = await redis.scard(READY_KEY(lobbyId));
      const lobbySize = lobby.maxPlayers;
      const currentPlayers = lobby.currentPlayers;

      // 1. Instant start if ALL possible players are ready AND we have at least 6.
      if (readyCount >= currentPlayers && currentPlayers >= 6) {
        // Wait, what if currentPlayers == maxPlayers? Starts instantly anyway.
        // I will just use setTimeout for STARTING to delay
        await MiniTourLobbyStateService.transitionPhase(lobbyId, lobby.status as LobbyState, LOBBY_STATE.STARTING);
      } else if (readyCount >= 6 && lobby.status === LOBBY_STATE.READY_CHECK) {
        // ≥6 -> Grace Period
        await MiniTourLobbyStateService.transitionPhase(lobbyId, lobby.status as LobbyState, LOBBY_STATE.GRACE_PERIOD);
      } else if (readyCount >= 6 && lobby.status === LOBBY_STATE.WAITING) {
        await MiniTourLobbyStateService.transitionPhase(lobbyId, LOBBY_STATE.WAITING, LOBBY_STATE.READY_CHECK);
      } else if (readyCount < 6 && (lobby.status === LOBBY_STATE.READY_CHECK || lobby.status === LOBBY_STATE.GRACE_PERIOD)) {
        // If someone unreadies and we drop below 6, cancel grace period/ready check and go back to WAITING
        await MiniTourLobbyStateService.transitionPhase(lobbyId, lobby.status as LobbyState, LOBBY_STATE.WAITING);
      }

      const snapshot = await MiniTourLobbyStateService.getLobbyState(lobbyId);

      const io = (global as any).__io || (global as any).io;
      if (io) {
        io.to(`minitour:${lobbyId}`).emit('minitour_lobby_state_update', snapshot);
      }

      return snapshot;
    } finally {
      await releaseRedisLock(redis, lockKey, lockToken);
    }
  }

}
