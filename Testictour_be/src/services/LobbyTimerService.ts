import { Queue } from 'bullmq';
import { redisConnectionOptions, REDIS_ENABLED } from '../lib/queues';
import { LOBBY_STATE, LobbyState } from '../constants/lobbyStates';
import logger from '../utils/logger';

export interface LobbyTimerJobData {
  lobbyId: string;
  targetState: LobbyState;
  fromState: LobbyState;
  jobType?: 'transition' | 'autoResolve'; // 'autoResolve' calls autoResolveIntervention()
}

// Dedicated BullMQ queue for lobby phase transitions
let _lobbyTimerQueue: Queue | null = null;
const _localTimers = new Map<string, NodeJS.Timeout>();

function getLobbyTimerQueue(): Queue | null {
  if (!REDIS_ENABLED) return null;
  if (!_lobbyTimerQueue) {
    throw new Error('LobbyTimerService queue has not been initialized. Call LobbyTimerService.init() first.');
  }
  return _lobbyTimerQueue;
}

export function initLobbyTimerQueue(queue: Queue) {
  _lobbyTimerQueue = queue;
}

// BullMQ job name pattern for easy cancellation: one job per lobby
const JOB_NAME = 'lobbyTransition';
const jobId = (lobbyId: string) => `lobby-transition:${lobbyId}`;

export default class LobbyTimerService {
  /**
   * Schedule a delayed phase transition for a lobby.
   * Replaces any existing pending transition for the same lobbyId (idempotent).
   */
  static async scheduleTransition(lobbyId: string, targetState: LobbyState, delayMs: number): Promise<void> {
    const queue = getLobbyTimerQueue();
    const jid = jobId(lobbyId);

    // Retrieve the current state from DB to use as fromState
    const { prisma } = await import('../services/prisma');
    const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId }, select: { state: true } });
    const fromState = (lobby?.state ?? LOBBY_STATE.WAITING) as LobbyState;

    const data: LobbyTimerJobData = { lobbyId, targetState, fromState };

    if (queue) {
      await queue.add(JOB_NAME, data, {
        delay: delayMs,
        jobId: jid,
        removeOnComplete: true,
        removeOnFail: false,
      });
    } else {
      // Local fallback without Redis
      if (_localTimers.has(jid)) clearTimeout(_localTimers.get(jid)!);
      const timer = setTimeout(async () => {
        _localTimers.delete(jid);
        const LobbyStateService = (await import('./LobbyStateService')).default;
        await LobbyStateService.transitionPhase(lobbyId, fromState, targetState).catch(() => {});
        const io = (global as any).io;
        if (io) {
          const snapshot = await LobbyStateService.getLobbyState(lobbyId).catch(() => null);
          if (snapshot) io.to(`lobby:${lobbyId}`).emit('lobby:state_update', snapshot);
        }
      }, delayMs);
      _localTimers.set(jid, timer);
    }

    logger.info(`LobbyTimerService: scheduled ${fromState} → ${targetState} for lobby ${lobbyId} in ${delayMs}ms`);
  }

  /**
   * Cancel a pending transition job for a lobby (pause, remake, delay extension).
   */
  static async cancelTransition(lobbyId: string): Promise<boolean> {
    const queue = getLobbyTimerQueue();
    const jid = jobId(lobbyId);

    if (queue) {
      const job = await queue.getJob(jid);
      if (job) {
        await job.remove();
        return true;
      }
    } else {
      if (_localTimers.has(jid)) {
        clearTimeout(_localTimers.get(jid)!);
        _localTimers.delete(jid);
        return true;
      }
    }
    return false;
  }

  /**
   * Extend the current timer by additionalMs (used for delay requests).
   * Cancels existing job and re-queues with the new combined delay.
   */
  static async rescheduleTransition(lobbyId: string, additionalMs: number): Promise<void> {
    const queue = getLobbyTimerQueue();
    const jid = jobId(lobbyId);

    if (queue) {
      try {
        const existing = await queue.getJob(jid);
        if (existing) {
          const originalDelay = existing.opts.delay || 0;
          const createdAt = existing.timestamp ?? Date.now();
          const elapsed = Date.now() - createdAt;
          const remaining = Math.max(0, originalDelay - elapsed);
          const newDelay = remaining + additionalMs;

          await existing.remove();

          const data: LobbyTimerJobData = existing.data;
          await queue.add(JOB_NAME, data, {
            delay: newDelay,
            jobId: jid,
            removeOnComplete: true,
            removeOnFail: false,
          });

          logger.info(`LobbyTimerService: extended timer for lobby ${lobbyId} by ${additionalMs}ms (new delay: ${newDelay}ms)`);
        } else {
          logger.warn(`LobbyTimerService: no existing job found for lobby ${lobbyId} — cannot reschedule`);
        }
      } catch (err) {
        logger.warn(`LobbyTimerService: could not reschedule job for lobby ${lobbyId}: ${String(err)}`);
      }
    } else {
      // Local fallback
      if (_localTimers.has(jid)) {
        logger.warn(`LobbyTimerService: Local memory timer does not support dynamic reschedule yet. Cancel and start a new one instead.`);
      }
    }
  }
  /**
   * Schedule auto-resolve for ADMIN_INTERVENTION after timeoutMs.
   * The worker will call LobbyStateService.autoResolveIntervention() — not just transitionPhase().
   * This ensures 8th-place MatchResults are created before moving to FINISHED.
   */
  static async scheduleAutoResolve(lobbyId: string, delayMs: number): Promise<void> {
    const queue = getLobbyTimerQueue();
    const jid = `lobby-autoresolve:${lobbyId}`;

    const data: LobbyTimerJobData = {
      lobbyId,
      targetState: LOBBY_STATE.FINISHED,
      fromState: LOBBY_STATE.ADMIN_INTERVENTION,
      jobType: 'autoResolve',
    };

    if (queue) {
      await queue.add('lobbyAutoResolve', data, {
        delay: delayMs,
        jobId: jid,
        removeOnComplete: true,
        removeOnFail: false,
      });
    } else {
      if (_localTimers.has(jid)) clearTimeout(_localTimers.get(jid)!);
      const timer = setTimeout(async () => {
        _localTimers.delete(jid);
        const LobbyStateService = (await import('./LobbyStateService')).default;
        await LobbyStateService.autoResolveIntervention(lobbyId).catch(() => {});
        const io = (global as any).io;
        if (io) {
          const snapshot = await LobbyStateService.getLobbyState(lobbyId).catch(() => null);
          if (snapshot) io.to(`lobby:${lobbyId}`).emit('lobby:state_update', snapshot);
        }
      }, delayMs);
      _localTimers.set(jid, timer);
    }

    logger.info(`LobbyTimerService: scheduled autoResolve for lobby ${lobbyId} in ${delayMs}ms`);
  }
}
