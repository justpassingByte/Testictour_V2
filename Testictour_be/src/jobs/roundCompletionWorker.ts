import { Worker } from 'bullmq';
import { prisma } from '../services/prisma';
import logger from '../utils/logger';
import { autoAdvanceRoundQueue, redisConnectionOptions, REDIS_ENABLED } from '../lib/queues';
import RoundService from '../services/RoundService';

async function checkAndAdvanceRound(roundId: string) {
  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        phase: true,
        _count: { select: { lobbies: true } }
      }
    });

    if (!round) {
      logger.warn(`Round ${roundId} not found during completion check.`);
      return;
    }

    if (round.status !== 'in_progress') {
      logger.info(`Round ${roundId} is not in 'in_progress' state (${round.status}). Skipping completion check.`);
      return;
    }

    const incompleteLobbiesCount = await prisma.lobby.count({
      where: { roundId: roundId, fetchedResult: false },
    });

    const allLobbiesComplete = incompleteLobbiesCount === 0;
    logger.info(`Round Completion Check for ${roundId}: All lobbies complete? ${allLobbiesComplete}. Incomplete: ${incompleteLobbiesCount}.`);

    if (allLobbiesComplete) {
      logger.info(`All lobbies for round ${roundId} are complete. Triggering auto-advance.`);

      if (autoAdvanceRoundQueue) {
        // Redis available — use BullMQ queue for reliable processing
        await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: round.id }, {
          removeOnComplete: true,
          removeOnFail: true,
          jobId: `advance-${round.id}` // Deterministic ID prevents duplicate jobs
        });
      } else {
        // No Redis — call directly with a small delay so this handler finishes first
        logger.info(`[NoRedis] Queue unavailable — directly advancing round ${roundId}`);
        setTimeout(() => {
          RoundService.autoAdvance(roundId).catch(err => {
            logger.error(`[NoRedis] Direct autoAdvance failed for round ${roundId}: ${err instanceof Error ? err.message : String(err)}`);
          });
        }, 200);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in checkAndAdvanceRound for round ${roundId}: ${errorMessage}`);
    throw error;
  }
}

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
export { checkAndAdvanceRound };

