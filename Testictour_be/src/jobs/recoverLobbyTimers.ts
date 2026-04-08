import { prisma } from '../services/prisma';
import LobbyTimerService from '../services/LobbyTimerService';
import { LOBBY_STATE, LobbyState, getNextState, PHASE_DURATIONS_MS } from '../constants/lobbyStates';
import logger from '../utils/logger';

/**
 * On server startup, scan for lobbies with non-terminal states
 * and reschedule their BullMQ transition timers.
 *
 * This ensures that if the server restarts mid-game, no lobby
 * gets stuck because its scheduled job was lost.
 */
export async function recoverStaleLobbyTimers(): Promise<void> {
  logger.info('recoverStaleLobbyTimers: scanning for active lobbies...');

  const terminalStates = [LOBBY_STATE.FINISHED, LOBBY_STATE.ADMIN_INTERVENTION];

  const activeLobbies = await prisma.lobby.findMany({
    where: {
      state: { notIn: terminalStates },
    },
    select: {
      id: true,
      state: true,
      phaseStartedAt: true,
    },
  });

  logger.info(`recoverStaleLobbyTimers: found ${activeLobbies.length} active lobbies`);

  for (const lobby of activeLobbies) {
    try {
      const state = lobby.state as LobbyState;

      // PAUSED lobbies don't need a timer — they resume on admin action
      if (state === LOBBY_STATE.PAUSED) {
        logger.info(`recoverStaleLobbyTimers: lobby ${lobby.id} is PAUSED — skipping timer recovery`);
        continue;
      }

      const phaseDurationMs = PHASE_DURATIONS_MS[state];
      const phaseStartedAt = lobby.phaseStartedAt?.getTime() ?? Date.now();
      const elapsed = Date.now() - phaseStartedAt;
      const remaining = phaseDurationMs - elapsed;

      const targetState = getNextState(state);

      if (remaining <= 0) {
        // Timer already expired — transition immediately
        logger.info(`recoverStaleLobbyTimers: lobby ${lobby.id} (${state}) — timer expired, transitioning to ${targetState} immediately`);
        await LobbyTimerService.scheduleTransition(lobby.id, targetState, 0);
      } else {
        // Reschedule with remaining time
        logger.info(`recoverStaleLobbyTimers: lobby ${lobby.id} (${state}) — rescheduling ${targetState} in ${remaining}ms`);
        await LobbyTimerService.scheduleTransition(lobby.id, targetState, remaining);
      }
    } catch (err) {
      logger.error(`recoverStaleLobbyTimers: failed to recover lobby ${lobby.id}: ${String(err)}`);
    }
  }

  logger.info('recoverStaleLobbyTimers: recovery complete');
}
