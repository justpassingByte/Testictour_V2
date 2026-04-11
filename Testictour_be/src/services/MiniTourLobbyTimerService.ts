import { Queue } from 'bullmq';
import { redisConnectionOptions, REDIS_ENABLED } from '../lib/queues';
import { LOBBY_STATE, LobbyState } from '../constants/lobbyStates';
import logger from '../utils/logger';
import MiniTourLobbyStateService from './MiniTourLobbyStateService';

export interface LobbyTimerJobData {
  lobbyId: string;
  targetState: LobbyState;
  fromState: LobbyState;
}

// Dedicated BullMQ queue for lobby phase transitions
let _minitourTimerQueue: Queue | null = null;
const _localTimers = new Map<string, NodeJS.Timeout>();

function getLobbyTimerQueue(): Queue | null {
  // We can just use the memory fallback for MiniTour right now, OR wire it to BullMQ later.
  // Returning null forces local setTimeout which is fine since minitour timers are fast (<60s)
  return null;
}

const JOB_NAME = 'minitourTransition';
const jobId = (lobbyId: string) => `minitour-transition:${lobbyId}`;

export default class MiniTourLobbyTimerService {
  static async scheduleTransition(lobbyId: string, targetState: LobbyState, delayMs: number): Promise<void> {
    const jid = jobId(lobbyId);

    const { prisma } = await import('../services/prisma');
    const lobby = await prisma.miniTourLobby.findUnique({ where: { id: lobbyId }, select: { status: true } });
    const fromState = (lobby?.status ?? LOBBY_STATE.WAITING) as LobbyState;

    if (_localTimers.has(jid)) clearTimeout(_localTimers.get(jid)!);
    const timer = setTimeout(async () => {
      _localTimers.delete(jid);
      await MiniTourLobbyStateService.transitionPhase(lobbyId, fromState, targetState).catch(() => {});
    }, delayMs);
    _localTimers.set(jid, timer);

    logger.info(`MiniTourLobbyTimerService: scheduled ${fromState} → ${targetState} for lobby ${lobbyId} in ${delayMs}ms`);
  }

  static async cancelTransition(lobbyId: string): Promise<boolean> {
    const jid = jobId(lobbyId);
    if (_localTimers.has(jid)) {
      clearTimeout(_localTimers.get(jid)!);
      _localTimers.delete(jid);
      return true;
    }
    return false;
  }
}

