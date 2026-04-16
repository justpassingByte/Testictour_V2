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
        if (autoAdvanceRoundQueue) {
          await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: round.id });
          logger.info(`Queued round ${round.id} to be started.`);
        } else {
          logger.info(`[NoRedis] Queue unavailable — scheduling direct autoAdvance for round ${round.id}`);
          setTimeout(() => {
            RoundService.autoAdvance(round.id).catch(err => {
              logger.error(`[NoRedis] Direct autoAdvance failed for round ${round.id}: ${err instanceof Error ? err.message : String(err)}`);
            });
          }, 0);
        }
      } catch (error) {
        logger.error(`Failed to start/queue round ${round.id}: ${error instanceof Error ? error.message : String(error)}`);
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
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    const now = new Date();

    // Find tournaments that are about to start (within 5 minutes) and have pending/upcoming status
    const tournamentsToPreAssign = await prisma.tournament.findMany({
      where: {
        status: { in: ['pending', 'UPCOMING', 'REGISTRATION'] },
        startTime: {
          gte: now,
          lte: thirtyMinutesFromNow,
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
        logger.info(`[PreAssignCron] Tournament ${tournament.id} starts at ${tournament.startTime}. Pre-assigning groups now (30m trigger).`);
        await RoundService.preAssignGroups(tournament.id);
      } catch (error) {
        logger.error(`[PreAssignCron] Failed to pre-assign for tournament ${tournament.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    logger.error(`[PreAssignCron] Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Auto-cancel cron: Runs every minute, checks for tournaments that have passed their start time
// If they are escrow-backed and not fully funded, cancel them automatically.
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    const tournamentsToCancel = await prisma.tournament.findMany({
      where: {
        status: { in: ['pending', 'UPCOMING', 'REGISTRATION'] },
        isCommunityMode: false,
        startTime: {
          lte: now,
        },
        escrowStatus: { notIn: ['funded', 'locked', 'released', 'cancelled', 'disputed'] },
      },
    });

    if (tournamentsToCancel.length > 0) {
      logger.info(`[AutoCancelCron] Found ${tournamentsToCancel.length} unfunded tournaments that passed their start time.`);
      const EscrowService = (await import('../services/EscrowService')).default;

      for (const tournament of tournamentsToCancel) {
        try {
          logger.info(`[AutoCancelCron] Canceling tournament ${tournament.id} due to insufficient escrow funding at start time.`);
          await EscrowService.markTournamentCancelled(
            tournament.id, 
            'Giải đấu đã bị hủy tự động do không được nạp đủ quỹ Escrow khi đến giờ thi đấu.'
          );
        } catch (error) {
          logger.error(`[AutoCancelCron] Failed to cancel tournament ${tournament.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } catch (error) {
    logger.error(`[AutoCancelCron] Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// STUCK ROUND RECOVERY CRON: Runs every minute
// Finds rounds that are 'in_progress' but whose lobbies are all 'fetchedResult: true'.
// This is a safety net for race conditions or failed event triggers.
cron.schedule('* * * * *', async () => {
  try {
    const stuckRounds = await prisma.round.findMany({
      where: {
        status: 'in_progress',
        lobbies: {
          every: { fetchedResult: true }
        }
      },
      include: {
        lobbies: { select: { id: true } }
      }
    });

    // Filtering out rounds that actually have NO lobbies yet (just in case)
    const trulyStuck = stuckRounds.filter(r => r.lobbies.length > 0);

    if (trulyStuck.length > 0) {
      logger.warn(`[RecoveryCron] Found ${trulyStuck.length} stuck rounds. Advancing them now.`);
      for (const round of trulyStuck) {
        try {
          logger.info(`[RecoveryCron] Triggering autoAdvance for stuck round: ${round.id}`);
          if (autoAdvanceRoundQueue) {
            await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: round.id }, {
              jobId: `recovery-${round.id}`,
              removeOnComplete: true,
              removeOnFail: true
            });
          } else {
            // Direct call for NoRedis
            RoundService.autoAdvance(round.id).catch(err => {
              logger.error(`[RecoveryCron] Direct autoAdvance failed for round ${round.id}: ${err instanceof Error ? err.message : String(err)}`);
            });
          }
        } catch (err) {
          logger.error(`[RecoveryCron] Failed to queue/advance round ${round.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (error) {
    logger.error(`[RecoveryCron] Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});
 