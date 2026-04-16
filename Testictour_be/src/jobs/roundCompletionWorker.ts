import { Worker } from 'bullmq';
import { prisma } from '../services/prisma';
import logger from '../utils/logger';
import { autoAdvanceRoundQueue, redisConnectionOptions, REDIS_ENABLED } from '../lib/queues';
import RoundService from '../services/RoundService';

// Only start the BullMQ Worker if Redis is available
export let roundCompletionWorker: Worker | null = null;

if (REDIS_ENABLED) {
  roundCompletionWorker = new Worker('checkRoundCompletionQueue', async job => {
    const { roundId } = job.data;
    if (!roundId) {
      logger.warn('checkRoundCompletion job is missing roundId.', job.data);
      return;
    }
    await checkAndAdvanceRound(roundId);
  }, { connection: redisConnectionOptions });

  logger.info('Round Completion Worker started.');
} else {
  logger.warn('[NoRedis] Round Completion Worker NOT started (Redis unavailable). Round completion will be triggered synchronously.');
}

// Export the check function so it can be called directly when Redis is unavailable
export async function checkAndAdvanceRound(roundId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Acquire an exclusive lock on the Round to prevent parallel completion checks
      const round = await tx.round.findUnique({
        where: { id: roundId },
        include: {
          phase: true,
        }
      });

      if (!round) {
        logger.warn(`Round ${roundId} not found during completion check.`);
        return;
      }

      if (round.status !== 'in_progress') {
        if (round.status === 'completed' && round.phase.status === 'in_progress') {
          logger.info(`[Recovery] Round ${roundId} is completed but phase ${round.phase.id} is stuck. Triggering logic.`);
        } else {
          return;
        }
      }

      // 2. Count incomplete lobbies INSIDE the transaction with the lock
      const incompleteLobbiesCount = await tx.lobby.count({
        where: { roundId: roundId, fetchedResult: false },
      });

      const allLobbiesComplete = incompleteLobbiesCount === 0;
      logger.info(`[LockingCheck] Round ${roundId}: Incomplete lobbies count = ${incompleteLobbiesCount}. All complete? ${allLobbiesComplete}`);

      if (allLobbiesComplete) {
        // 3. Trigger auto-advance (it will start its own transaction, which is fine since we return here)
        if (autoAdvanceRoundQueue) {
          await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: round.id }, {
            removeOnComplete: true,
            removeOnFail: true,
            jobId: `advance-${round.id}`
          });
        } else {
          // No Redis
          setTimeout(async () => {
            try {
              const result = await RoundService.autoAdvance(round.id);
              if (result && typeof result === 'object' && result._action === 'schedule_lobby_timers' && result.lobbyIds) {
                logger.info(`[NoRedis] Scheduling ready check timers for ${result.lobbyIds.length} lobbies with ${result.delayMs}ms delay`);
                const LobbyTimerService = (await import('../services/LobbyTimerService')).default;
                const { LOBBY_STATE } = await import('../constants/lobbyStates');
                
                for (const lobbyId of result.lobbyIds) {
                  try {
                    await LobbyTimerService.scheduleTransition(lobbyId, LOBBY_STATE.READY_CHECK, result.delayMs || 300_000);
                  } catch (err) {
                    logger.error(`[NoRedis] Failed to schedule timer for lobby ${lobbyId}: ${err}`);
                  }
                }
              }
            } catch (e) {
              logger.error(`[NoRedis] autoAdvance failed: ${e}`);
            }
          }, 0);
        }
      }
    }, { timeout: 10000 }); // 10s timeout for the lock
  } catch (error) {
    logger.error(`Error in checkAndAdvanceRound for round ${roundId}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

