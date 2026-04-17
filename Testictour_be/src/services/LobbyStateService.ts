import { prisma } from './prisma';
import { LOBBY_STATE, LobbyState, assertValidState, PHASE_DURATIONS_MS } from '../constants/lobbyStates';
import LobbyTimerService from './LobbyTimerService';
import logger from '../utils/logger';
import { fetchMatchDataQueue } from '../lib/queues';
import { bracketCache } from './BracketCacheService';
import ConsistencyPipeline from './ConsistencyPipeline';
import TournamentEventBus from './TournamentEventBus';

// Redis client (ioredis) — imported lazily to support environments where Redis is optional
let _redis: any = null;

async function getRedis() {
  if (_redis) return _redis;
  const { createClient } = await import('../lib/redis');
  _redis = createClient();
  return _redis;
}

// ── Redis key helpers ──────────────────────────────────────────────────────────
const READY_KEY = (lobbyId: string) => `lobby:ready:${lobbyId}`;
const READY_COOLDOWN_KEY = (lobbyId: string, userId: string) => `lobby:ready_cooldown:${lobbyId}:${userId}`;
const LOCK_KEY = (lobbyId: string) => `lock:lobby:ready:${lobbyId}`;

// Simple Redis lock helpers (SET NX PX pattern)
async function acquireRedisLock(redis: any, key: string, ttlMs: number): Promise<string | null> {
  const token = `${Date.now()}-${Math.random()}`;
  const result = await redis.set(key, token, 'NX', 'PX', ttlMs);
  return result === 'OK' ? token : null;
}

async function releaseRedisLock(redis: any, key: string, token: string): Promise<void> {
  // Atomic: only delete if our token matches (Lua script for safety)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  if (typeof redis.eval === 'function') {
    await redis.eval(script, 1, key, token);
  } else {
    // MockRedis fallback — single-threaded so non-atomic is safe
    const current = await redis.get(key);
    if (current === token) await redis.del(key);
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DelayRequest {
  userId: string;
  requestedAt: string;
  extensionSeconds: 60;
}

export interface LobbyStateSnapshot {
  lobbyId: string;
  state: LobbyState;
  readyPlayerIds: string[];
  readyCount: number;
  lobbySize: number;
  phaseStartedAt: string;
  phaseDuration: number;            // seconds
  delayRequests: DelayRequest[];
  totalDelaysUsed: number;
  pausedAt?: string;
  remainingDurationOnPause?: number; // seconds
  fetchedResult?: boolean;
}

export interface IncomingMatch {
  lobbyId: string;
  lobbyName: string;
  tournamentId: string;
  tournamentName: string;
  roundNumber: number;
  phaseName: string;
  state: LobbyState;
  phaseStartedAt: string;
  phaseDuration: number; // seconds
}

// ── LobbyStateService ──────────────────────────────────────────────────────────

export default class LobbyStateService {
  // ── Snapshot ──

  static async getLobbyState(lobbyId: string): Promise<LobbyStateSnapshot> {
    const lobby = await prisma.lobby.findUniqueOrThrow({ where: { id: lobbyId } });
    assertValidState(lobby.state);

    const redis = await getRedis();
    const readyPlayerIds: string[] = await redis.smembers(READY_KEY(lobbyId));

    return {
      lobbyId,
      state: lobby.state,
      readyPlayerIds,
      readyCount: readyPlayerIds.length,
      lobbySize: (lobby.participants as unknown as string[]).length,
      phaseStartedAt: lobby.phaseStartedAt?.toISOString() ?? new Date().toISOString(),
      phaseDuration: Math.floor(PHASE_DURATIONS_MS[lobby.state] / 1000),
      delayRequests: (lobby.delayRequests as unknown as DelayRequest[]) ?? [],
      totalDelaysUsed: lobby.totalDelaysUsed,
      pausedAt: lobby.state === LOBBY_STATE.PAUSED ? lobby.phaseStartedAt?.toISOString() : undefined,
      remainingDurationOnPause: lobby.remainingDurationOnPause ?? undefined,
      fetchedResult: lobby.fetchedResult,
    };
  }

  // ── Phase Transition ──

  /**
   * Atomic state transition — validates enum + optimistic concurrency (expectedCurrentState).
   * Uses Prisma updateMany to atomically guard against race conditions.
   */
  static async transitionPhase(lobbyId: string, from: LobbyState, to: LobbyState): Promise<void> {
    assertValidState(from);
    assertValidState(to);

    const updated = await prisma.lobby.updateMany({
      where: { id: lobbyId, state: from },
      data: { state: to, phaseStartedAt: new Date() },
    });

    if (updated.count === 0) {
      logger.warn(`LobbyStateService.transitionPhase: lobby ${lobbyId} was not in state ${from} — transition to ${to} skipped`);
      return;
    }

    logger.info(`LobbyStateService: lobby ${lobbyId} ${from} → ${to}`);

    // Side effects per target state
    if (to === LOBBY_STATE.PLAYING) {
      // matchStartedAt = now (used by the worker to calculate elapsed time)
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { matchStartedAt: new Date() },
      });

      // ── Critical: enqueue match polling job ──────────────────
      // TFT matches take ~25-30min. First poll after 20 minutes, then every 30s.
      if (fetchMatchDataQueue) {
        await fetchMatchDataQueue.add('fetchMatchData', { lobbyId, region: '' }, {
          delay: 1_200_000, // 20 minutes — first poll after game likely ends
          jobId: `fetch-init-${lobbyId}`,
          removeOnComplete: true,
          removeOnFail: { count: 20 },
          attempts: 30,
          backoff: { type: 'exponential', delay: 30_000 },
        });
        logger.info(`LobbyStateService: enqueued fetchMatchData job for lobby ${lobbyId} (first poll in 20min)`);
      } else {
        logger.warn(`LobbyStateService: fetchMatchDataQueue not available — match won't be auto-polled for lobby ${lobbyId}`);
      }
    }

    if (to === LOBBY_STATE.FINISHED || to === LOBBY_STATE.ADMIN_INTERVENTION) {
      // Clean up ready set — lobby is done
      const redis = await getRedis();
      await redis.del(READY_KEY(lobbyId));
    }

    if (to === LOBBY_STATE.ADMIN_INTERVENTION) {
      // Schedule auto-resolve after 15 min — uses a special job type so the
      // worker can call autoResolveIntervention() (not just transitionPhase)
      await LobbyTimerService.scheduleAutoResolve(lobbyId, 900_000);
    }

    // ── Post-transition: DB → Cache → Socket via ConsistencyPipeline ──
    try {
      const lobbyWithTourn = await prisma.lobby.findUnique({
        where: { id: lobbyId },
        include: { round: { include: { phase: true } } }
      });

      const tournamentId = lobbyWithTourn?.round?.phase?.tournamentId;

      // Pipeline handles: cache invalidation → typed socket emission
      await ConsistencyPipeline.onLobbyStateChanged(lobbyId, tournamentId, from, to);

      // Broadcast the new LobbyStateSnapshot to the lobby room
      try {
        const snapshot = await LobbyStateService.getLobbyState(lobbyId);
        const io = (global as any).__io || (global as any).io;
        if (io) {
          io.to(`lobby:${lobbyId}`).emit('lobby:state_update', snapshot);
        }
      } catch (stateErr) {
        logger.error(`LobbyStateService: failed to fetch state snapshot for lobby ${lobbyId} after transition ${stateErr}`);
      }
    } catch (_) {}
  }

  // ── Player Actions ──

  /**
   * Toggle a player's ready state. Protected by:
   * - 3s per-player cooldown (Redis TTL)
   * - Distributed lock on quorum check (Redis NX)
   * - State guard (only in READY_CHECK)
   */
  static async toggleReady(lobbyId: string, userId: string): Promise<LobbyStateSnapshot> {
    const redis = await getRedis();

    // 1. Check cooldown
    const onCooldown = await redis.get(READY_COOLDOWN_KEY(lobbyId, userId));
    if (onCooldown) throw new Error('Ready toggle on cooldown (3s)');

    // 2. Acquire distributed lock
    const lockKey = LOCK_KEY(lobbyId);
    const lockToken = await acquireRedisLock(redis, lockKey, 10000);
    if (!lockToken) throw new Error('Could not acquire lobby lock — retry in a moment');

    try {
      // 3. Check lobby state
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
      if (!lobby) throw new Error(`Lobby ${lobbyId} not found`);
      if (![LOBBY_STATE.WAITING, LOBBY_STATE.READY_CHECK, LOBBY_STATE.GRACE_PERIOD].includes(lobby.state as any)) {
        throw new Error(`Cannot toggle ready in state: ${lobby.state}`);
      }

      // 4. Toggle in Redis Set
      const isMember = await redis.sismember(READY_KEY(lobbyId), userId);
      if (isMember) {
        await redis.srem(READY_KEY(lobbyId), userId);
      } else {
        await redis.sadd(READY_KEY(lobbyId), userId);
      }

      // 5. Set 3s cooldown
      await redis.set(READY_COOLDOWN_KEY(lobbyId, userId), '1', 'EX', 3);

      // 6. Check quorum (inside lock — no race condition)
      const readyCount = await redis.scard(READY_KEY(lobbyId));
      const lobbySize = (lobby.participants as string[]).length;

      if (readyCount >= lobbySize) {
        // 8/8 → instant start, cancel grace timer
        await LobbyTimerService.cancelTransition(lobbyId);
        await LobbyTimerService.scheduleTransition(lobbyId, LOBBY_STATE.STARTING, 0);
      } else if (readyCount >= 6 && lobby.state === LOBBY_STATE.READY_CHECK) {
        // ≥6 → enter grace period
        await LobbyTimerService.cancelTransition(lobbyId);
        await LobbyStateService.transitionPhase(lobbyId, LOBBY_STATE.READY_CHECK, LOBBY_STATE.GRACE_PERIOD);
        await LobbyTimerService.scheduleTransition(lobbyId, LOBBY_STATE.STARTING, 60_000);
      }

      return LobbyStateService.getLobbyState(lobbyId);
    } finally {
      await releaseRedisLock(redis, lockKey, lockToken);
    }
  }

  /**
   * Request a +60s delay extension.
   * Rules: 1 delay per player per lobby, max 3 total per lobby.
   */
  static async requestDelay(lobbyId: string, userId: string): Promise<LobbyStateSnapshot> {
    const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
    if (!lobby) throw new Error(`Lobby ${lobbyId} not found`);

    const currentState = lobby.state as LobbyState;
    if (currentState === LOBBY_STATE.FINISHED || currentState === LOBBY_STATE.PAUSED) {
      throw new Error(`Cannot request delay in state: ${currentState}`);
    }

    let delayRequests: DelayRequest[] = [];
    if (lobby.delayRequests) {
      delayRequests = lobby.delayRequests as unknown as DelayRequest[];
    }

    // Check per-player limit
    if (delayRequests.some(d => d.userId === userId)) {
      throw new Error('You have already used your delay request for this lobby');
    }

    // Check per-lobby limit
    if (lobby.totalDelaysUsed >= 3) {
      throw new Error('Maximum delays (3) already used for this lobby');
    }

    const newDelay: DelayRequest = {
      userId,
      requestedAt: new Date().toISOString(),
      extensionSeconds: 60,
    };

    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        delayRequests: [...delayRequests, newDelay] as any,
        totalDelaysUsed: { increment: 1 },
      },
    });

    // Extend BullMQ timer by 60s
    await LobbyTimerService.rescheduleTransition(lobbyId, 60_000);

    return LobbyStateService.getLobbyState(lobbyId);
  }

  // ── Player Queries ──

  static async getPlayerIncomingMatches(userId: string): Promise<IncomingMatch[]> {
    const lobbies = await prisma.lobby.findMany({
      where: {
        state: { notIn: [LOBBY_STATE.FINISHED, LOBBY_STATE.ADMIN_INTERVENTION] },
      },
      include: {
        round: {
          include: {
            phase: {
              include: { tournament: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    const result: IncomingMatch[] = [];
    for (const lobby of lobbies) {
      // participants is stored as an array of userIds (strings)
      const participants = lobby.participants as string[];
      const isParticipant = Array.isArray(participants) && participants.includes(userId);
      if (!isParticipant) continue;

      const state = lobby.state as LobbyState;
      const tournament = lobby.round.phase.tournament;
      result.push({
        lobbyId: lobby.id,
        lobbyName: lobby.name,
        tournamentId: tournament?.id ?? '',
        tournamentName: tournament?.name ?? '',
        roundNumber: lobby.round.roundNumber,
        phaseName: lobby.round.phase.name,
        state,
        phaseStartedAt: lobby.phaseStartedAt?.toISOString() ?? new Date().toISOString(),
        phaseDuration: Math.floor(PHASE_DURATIONS_MS[state] / 1000),
      });
    }

    result.sort((a, b) => new Date(b.phaseStartedAt).getTime() - new Date(a.phaseStartedAt).getTime());
    return result;
  }

  // ── Admin Controls ──


  static async forceStart(lobbyId: string): Promise<void> {
    const lobby = await prisma.lobby.findUniqueOrThrow({ where: { id: lobbyId } });
    const currentState = lobby.state as LobbyState;

    // Cancel existing timer and go straight to STARTING
    await LobbyTimerService.cancelTransition(lobbyId);
    await LobbyStateService.transitionPhase(lobbyId, currentState, LOBBY_STATE.STARTING);
    // STARTING → PLAYING after 10s
    await LobbyTimerService.scheduleTransition(lobbyId, LOBBY_STATE.PLAYING, 10_000);

    logger.info(`LobbyStateService.forceStart: lobby ${lobbyId} forced to STARTING`);
  }

  static async pauseLobby(lobbyId: string): Promise<void> {
    const lobby = await prisma.lobby.findUniqueOrThrow({ where: { id: lobbyId } });
    const currentState = lobby.state as LobbyState;

    if (currentState === LOBBY_STATE.PAUSED || currentState === LOBBY_STATE.FINISHED) {
      throw new Error(`Cannot pause lobby in state: ${currentState}`);
    }

    // Calculate remaining time
    const phaseStartedAt = lobby.phaseStartedAt?.getTime() ?? Date.now();
    const phaseDurationMs = PHASE_DURATIONS_MS[currentState];
    const elapsed = Date.now() - phaseStartedAt;
    const remainingSeconds = Math.max(0, Math.floor((phaseDurationMs - elapsed) / 1000));

    // Cancel BullMQ job
    await LobbyTimerService.cancelTransition(lobbyId);

    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        state: LOBBY_STATE.PAUSED,
        pausedFromState: currentState,
        remainingDurationOnPause: remainingSeconds,
        phaseStartedAt: new Date(),
      },
    });

    logger.info(`LobbyStateService.pauseLobby: lobby ${lobbyId} paused (was ${currentState}, ${remainingSeconds}s remaining)`);
  }

  static async resumeLobby(lobbyId: string): Promise<void> {
    const lobby = await prisma.lobby.findUniqueOrThrow({ where: { id: lobbyId } });

    if (lobby.state !== LOBBY_STATE.PAUSED) {
      throw new Error(`Lobby ${lobbyId} is not paused (state: ${lobby.state})`);
    }

    const resumeToState = (lobby.pausedFromState ?? LOBBY_STATE.WAITING) as LobbyState;
    assertValidState(resumeToState);

    const remainingMs = (lobby.remainingDurationOnPause ?? 120) * 1000;

    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        state: resumeToState,
        phaseStartedAt: new Date(),
        pausedFromState: null,
        remainingDurationOnPause: null,
      },
    });

    // Resume timer with remaining time (ready list is preserved in Redis)
    const { getNextState } = await import('../constants/lobbyStates');
    await LobbyTimerService.scheduleTransition(lobbyId, getNextState(resumeToState), remainingMs);

    logger.info(`LobbyStateService.resumeLobby: lobby ${lobbyId} resumed to ${resumeToState} (${remainingMs}ms remaining)`);
  }

  static async remakeLobby(lobbyId: string, io?: any): Promise<void> {
    const redis = await getRedis();

    // 1. Cancel timer
    await LobbyTimerService.cancelTransition(lobbyId);

    // 2. Clear Redis ready set
    await redis.del(READY_KEY(lobbyId));

    // 3. Reset lobby state
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        state: LOBBY_STATE.WAITING,
        delayRequests: [],
        totalDelaysUsed: 0,
        phaseStartedAt: new Date(),
        pausedFromState: null,
        remainingDurationOnPause: null,
      },
    });

    // 4. Schedule WAITING → READY_CHECK after 120s
    await LobbyTimerService.scheduleTransition(lobbyId, LOBBY_STATE.READY_CHECK, 120_000);

    // 5. Notify players (requires the io server instance)
    if (io) {
      io.to(`lobby:${lobbyId}`).emit('lobby:remade', {
        lobbyId,
        reason: 'Admin remade the lobby',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`LobbyStateService.remakeLobby: lobby ${lobbyId} reset to WAITING`);
  }

  static async flagForAdminReview(lobbyId: string, reason: string): Promise<void> {
    await LobbyStateService.transitionPhase(
      lobbyId,
      LOBBY_STATE.PLAYING, // may already be in PLAYING
      LOBBY_STATE.ADMIN_INTERVENTION
    );

    logger.warn(`LobbyStateService.flagForAdminReview: lobby ${lobbyId} → ADMIN_INTERVENTION (reason: ${reason})`);
  }

  /**
   * Auto-resolve after 15-min timeout in ADMIN_INTERVENTION.
   * Assigns 8th place (0 points) to all lobby participants, moves to FINISHED.
   */
  static async autoResolveIntervention(lobbyId: string): Promise<void> {
    const lobby = await prisma.lobby.findUniqueOrThrow({
      where: { id: lobbyId },
      include: { round: { include: { phase: true } } },
    });

    if (lobby.state !== LOBBY_STATE.ADMIN_INTERVENTION) {
      logger.info(`LobbyStateService.autoResolveIntervention: lobby ${lobbyId} is no longer in ADMIN_INTERVENTION — skipping`);
      return;
    }

    // Mark as finished with fetchedResult = true so round completion can proceed
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        state: LOBBY_STATE.FINISHED,
        fetchedResult: true,
        phaseStartedAt: new Date(),
      },
    });

    // Create 8th-place match results for all participants
    const participantUserIds = lobby.participants as string[];
    const pointsMapping = (lobby.round.phase.pointsMapping as number[] | null) ?? [8, 7, 6, 5, 4, 3, 2, 1];
    const lastPlacePoints = pointsMapping[pointsMapping.length - 1] ?? 0;

    // Create a placeholder match record
    const placeholderMatch = await prisma.match.create({
      data: {
        matchIdRiotApi: `auto-resolved-${lobbyId}-${Date.now()}`,
        lobbyId,
        fetchedAt: new Date(),
        matchData: { autoResolved: true, reason: 'ADMIN_INTERVENTION timeout' } as any,
      },
    });

    // Insert MatchResults for each participant (upsert on matchId+userId unique constraint)
    for (let i = 0; i < participantUserIds.length; i++) {
      const userId = participantUserIds[i];
      await prisma.matchResult.upsert({
        where: { matchId_userId: { matchId: placeholderMatch.id, userId } },
        create: {
          matchId: placeholderMatch.id,
          userId,
          placement: 8,
          points: lastPlacePoints,
        },
        update: {},
      });

      // Update participant score
      await prisma.participant.updateMany({
        where: { userId, tournamentId: lobby.round.phase.tournamentId },
        data: { scoreTotal: { increment: lastPlacePoints } },
      });
    }

    logger.warn(`LobbyStateService.autoResolveIntervention: lobby ${lobbyId} auto-resolved — ${participantUserIds.length} players given 8th place`);

    // ── Sync Redis ZSET + invalidate caches via ConsistencyPipeline ──────────
    // Without this, DB scoreTotal would diverge from the Redis leaderboard ZSET.
    const tournamentId = lobby.round.phase.tournamentId;
    const roundId = lobby.round.id;
    const pipelineResults = participantUserIds.map(userId => ({
      userId,
      points: lastPlacePoints,
      placement: 8,
    }));
    try {
      await ConsistencyPipeline.onMatchProcessed({
        tournamentId,
        roundId,
        lobbyId,
        matchId: placeholderMatch.id,
        results: pipelineResults,
        matchNumber: 1,
        totalMatches: 1,
        isLastMatch: true,
      });
    } catch (pipeErr) {
      logger.warn(`[autoResolve] ConsistencyPipeline failed (non-fatal): ${pipeErr instanceof Error ? pipeErr.message : String(pipeErr)}`);
    }

    // Scoreboard cache is already invalidated by ConsistencyPipeline.onMatchProcessed (Step 2).
    // bracket_update + tournament_update are already emitted by TournamentEventBus.emitMatchResult (Step 3).
    // No further manual emissions needed.
  }
}
