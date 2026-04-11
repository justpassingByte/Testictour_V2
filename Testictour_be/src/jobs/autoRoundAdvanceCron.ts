import cron from 'node-cron';
import { prisma } from '../services/prisma';
import logger from '../utils/logger';
import { autoAdvanceRoundQueue } from '../lib/queues';
import RoundService from '../services/RoundService';

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

// Pre-assignment cron: Runs every minute, checks for tournaments starting within 5 minutes
// If they haven't been pre-assigned yet (no lobbies in first phase), trigger preAssignGroups
cron.schedule('* * * * *', async () => {
  try {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const now = new Date();

    // Find tournaments that are about to start (within 5 minutes) and have pending/upcoming status
    const tournamentsToPreAssign = await prisma.tournament.findMany({
      where: {
        status: { in: ['pending', 'UPCOMING', 'REGISTRATION'] },
        startTime: {
          gte: now,
          lte: fiveMinutesFromNow,
        },
      },
      include: {
        phases: {
          where: { phaseNumber: 1 },
          include: {
            rounds: {
              include: { lobbies: true },
              take: 1,
            }
          }
        }
      }
    });

    for (const tournament of tournamentsToPreAssign) {
      const firstPhase = tournament.phases[0];
      if (!firstPhase) continue;

      const firstRound = firstPhase.rounds[0];
      // Only pre-assign if no lobbies exist yet
      if (firstRound && firstRound.lobbies.length > 0) continue;

      try {
        logger.info(`[PreAssignCron] Tournament ${tournament.id} starts at ${tournament.startTime}. Pre-assigning groups now.`);
        await RoundService.preAssignGroups(tournament.id);
      } catch (error) {
        logger.error(`[PreAssignCron] Failed to pre-assign for tournament ${tournament.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    logger.error(`[PreAssignCron] Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}); 