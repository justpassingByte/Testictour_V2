import cron from 'node-cron';
import { prisma } from '../services/prisma';
import logger from '../utils/logger';
import { autoAdvanceRoundQueue } from '../lib/queues';

// This cron job will run every minute to start rounds that are due
cron.schedule('* * * * *', async () => {
  logger.info('Running cron to start pending rounds...');
  try {
    // Find all rounds that are pending and whose startTime is in the past
    const roundsToStart = await prisma.round.findMany({
      where: {
        status: 'pending',
        startTime: {
          lte: new Date(),
        },
      },
    });

    if (roundsToStart.length === 0) {
      // This is normal, no need to log every minute
      return;
    }

    logger.info(`Found ${roundsToStart.length} rounds to start. Queuing them now.`);

    for (const round of roundsToStart) {
      try {
        // Add job to the queue, the worker will pick it up and call RoundService.autoAdvance
        await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: round.id });
        logger.info(`Queued round ${round.id} to be started.`);
      } catch (error) {
        logger.error(`Failed to queue round ${round.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    logger.error(`Error in start pending rounds cron job: ${error instanceof Error ? error.message : String(error)}`);
  }
}); 