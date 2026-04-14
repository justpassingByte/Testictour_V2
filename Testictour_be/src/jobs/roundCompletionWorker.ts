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

    // ── PLACEMENT MODE: Eliminate per-lobby IMMEDIATELY (don't wait for all lobbies) ──
    const advancementType = (round.phase as any).advancementCondition?.type;
    if (advancementType === 'placement') {
      const topNPerLobby = (round.phase as any).advancementCondition?.value;
      if (topNPerLobby) {
        try {
          await RoundService.eliminateCompletedLobbies(roundId, topNPerLobby, round.phase.tournamentId);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.error(`[Placement/Immediate] Per-lobby elimination error for round ${roundId}: ${errMsg}`);
        }
      }
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
          RoundService.autoAdvance(roundId)
            .then(async (result) => {
              if (result && typeof result === 'object' && '_action' in result) {
                if (result._action === 'payout_prizes' && result.tournamentId) {
                  logger.info(`[NoRedis] Handling deferred payout_prizes for tournament: ${result.tournamentId}`);
                  try {
                    // DO NOT distribute prizes automatically!
                    // We have an Escrow system. The host must trigger the payout manually via the EscrowService.
                    logger.info(`[NoRedis] Skipped automatic payout for tournament ${result.tournamentId} (Delegating to Escrow System).`);
                    
                    if ((global as any).io) {
                      (global as any).io.to(`tournament:${result.tournamentId}`).emit('leaderboard_update', { tournamentId: result.tournamentId });
                      (global as any).io.to(`tournament:${result.tournamentId}`).emit('tournament_update', { type: 'tournament_completed' });
                    }
                  } catch (err) {
                    logger.error(`[NoRedis] Failed to distribute prizes: ${err instanceof Error ? err.message : String(err)}`);
                  }
                } else if (result._action === 'create_next_phase_rounds' && result.completedPhaseId && result.nextPhaseId) {
                  logger.info(`[NoRedis] Handling deferred round creation for phase: ${result.nextPhaseId}`);
                  const { prisma } = await import('../services/prisma');
                  const numberOfRounds = result.numberOfRounds || 1;
                  try {
                    for (let i = 1; i <= numberOfRounds; i++) {
                      await prisma.round.create({
                        data: {
                          phaseId: result.nextPhaseId,
                          roundNumber: i,
                          startTime: new Date(Date.now() + 5 * 60 * 1000),
                          status: 'pending'
                        }
                      });
                    }
                    if ((global as any).io && result.tournamentId) {
                      (global as any).io.to(`tournament:${result.tournamentId}`).emit('bracket_update', { tournamentId: result.tournamentId });
                      (global as any).io.to(`tournament:${result.tournamentId}`).emit('tournament_update', { type: 'phase_started' });
                    }
                  } catch (err) {
                    logger.error(`[NoRedis] Failed to create rounds: ${err instanceof Error ? err.message : String(err)}`);
                  }
                }
              }
            })
            .catch(err => {
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

