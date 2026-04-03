import { Worker } from 'bullmq';
import { prisma } from '../services/prisma';
import logger from '../utils/logger';
import { autoAdvanceRoundQueue, redisConnectionOptions } from '../lib/queues';

export const roundCompletionWorker = new Worker('checkRoundCompletionQueue', async job => {
  const { roundId } = job.data;
  if (!roundId) {
    logger.warn('checkRoundCompletion job is missing roundId.', job.data);
    return;
  }

  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { 
        phase: true,
        _count: {
          select: { lobbies: true }
        }
      }
    });

    if (!round) {
      logger.warn(`Round ${roundId} not found during completion check.`);
      return;
    }
    
    // Do not process if the round is not in 'in_progress' state
    if (round.status !== 'in_progress') {
        logger.info(`Round ${roundId} is not in 'in_progress' state (${round.status}). Skipping completion check.`);
        return;
    }

    const incompleteLobbiesCount = await prisma.lobby.count({
      where: {
        roundId: roundId,
        fetchedResult: false,
      },
    });

    const allLobbiesComplete = incompleteLobbiesCount === 0;

    logger.info(`Round Completion Check for ${roundId}: All lobbies complete? ${allLobbiesComplete}. Incomplete lobbies count: ${incompleteLobbiesCount}.`);

    // We also need to ensure that the phase type is not checkmate, as it has its own advancement logic
    if (allLobbiesComplete) {
      logger.info(`All lobbies for round ${roundId} are complete. Queuing auto-advance job.`);
      // Ensure we don't queue the same round advancement job multiple times
      // A more robust solution might involve checking if a job for this round already exists
      await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: round.id }, {
        removeOnComplete: true,
        removeOnFail: true,
        jobId: `advance-${round.id}` // Use a deterministic job ID to prevent duplicates
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in roundCompletionWorker for round ${roundId}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
    throw error;
  }
}, { connection: redisConnectionOptions });

logger.info('Round Completion Worker started.'); 
