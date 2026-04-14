import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { autoAdvanceRoundQueue, checkRoundCompletionQueue, fetchMatchDataQueue } from '../lib/queues';
import { checkAndAdvanceRound } from '../jobs/roundCompletionWorker';
import RoundService from './RoundService';
import crypto from 'crypto';
import { Socket } from 'socket.io-client';

// We need a queue instance to add jobs for round advancement
// The queue instance is now imported from a centralized file

interface NewJobData {
  name: string;
  data: any;
}

export default class MatchResultService {
  static async processMatchResults(matchId: string, matchData: any, ioClient: Socket): Promise<{ message: string; newJob?: NewJobData }> {
    logger.info(`Starting to process match results for match ID: ${matchId}`);
    
    let jobToQueue: NewJobData | undefined;

    try {
      const resultMessage = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const match = await tx.match.findUnique({
          where: { id: matchId },
          include: { 
            lobby: { 
              include: { 
                round: {
                  include: {
                    phase: {
                      include: {
                        tournament: true
                      }
                    }
                  }
                }
              } 
            } 
          }
        });

        if (!match || !match.lobby || !match.lobby.round || !match.lobby.round.phase || !match.lobby.round.phase.tournament) {
          throw new ApiError(404, 'Match, lobby, round, phase, or tournament not found');
        }

        const { lobby } = match;
        const { round } = lobby;
        const { phase } = round;
        const tournamentId = phase.tournamentId;
        
        const phaseConfig = phase.advancementCondition as any;
        const pointsMapping: number[] | undefined = (phase as any).pointsMapping;

        if (matchData?.info?.participants) {
          // Get all participants for this lobby/match once, and order them to ensure consistent locking.
          // This acquires shared locks on all relevant participant rows upfront in a consistent order.
          const participantIdsInMatchData = matchData.info.participants.map((p: any) => p.puuid);
          const participantsInvolved = await tx.participant.findMany({
            where: {
              userId: { in: participantIdsInMatchData },
              tournamentId: tournamentId
            },
            orderBy: { userId: 'asc' } // Canonical order for locking to prevent deadlocks
          });
          const participantMap = new Map(participantsInvolved.map(p => [p.userId, p]));

          // ── BULK UPSERT: MatchResults (single SQL statement for all players) ──
          // Build arrays of values for all participants in this match
          const bulkMatchResultValues: { matchId: string; userId: string; placement: number; points: number }[] = [];
          const bulkScoreIncrements: { participantId: string; points: number }[] = [];

          for (const participant of participantsInvolved) {
            const p_data = matchData.info.participants.find((d: any) => d.puuid === participant.userId);
            if (!p_data) {
              logger.warn(`Participant data not found in matchData for user ID: ${participant.userId}. Skipping.`);
              continue;
            }

            const pointsFromPlacement = (pointsMapping && p_data.placement <= pointsMapping.length) 
              ? pointsMapping[p_data.placement - 1] 
              : 0;

            bulkMatchResultValues.push({
              matchId: matchId,
              userId: p_data.puuid,
              placement: p_data.placement,
              points: pointsFromPlacement,
            });

            bulkScoreIncrements.push({
              participantId: participant.id,
              points: pointsFromPlacement,
            });
          }

          // Execute bulk INSERT ... ON CONFLICT for MatchResult (1 query instead of N)
          if (bulkMatchResultValues.length > 0) {
            const valuesClause = bulkMatchResultValues
              .map(v => `(gen_random_uuid(), '${v.matchId}', '${v.userId}', ${v.placement}, ${v.points})`)
              .join(', ');

            await tx.$executeRawUnsafe(`
              INSERT INTO "MatchResult" ("id", "matchId", "userId", "placement", "points")
              VALUES ${valuesClause}
              ON CONFLICT ("matchId", "userId")
              DO UPDATE SET "placement" = EXCLUDED."placement", "points" = EXCLUDED."points"
            `);
            logger.debug(`Bulk upserted ${bulkMatchResultValues.length} match results for match ${matchId}`);
          }

          // Execute bulk UPDATE for Participant.scoreTotal (1 query instead of N)
          if (bulkScoreIncrements.length > 0) {
            const caseClauses = bulkScoreIncrements
              .map(v => `WHEN id = '${v.participantId}' THEN "scoreTotal" + ${v.points}`)
              .join(' ');
            const participantIds = bulkScoreIncrements
              .map(v => `'${v.participantId}'`)
              .join(', ');

            await tx.$executeRawUnsafe(`
              UPDATE "Participant"
              SET "scoreTotal" = CASE ${caseClauses} ELSE "scoreTotal" END
              WHERE "id" IN (${participantIds})
            `);
            logger.debug(`Bulk updated scoreTotal for ${bulkScoreIncrements.length} participants`);
          }

          // ── PER-PLAYER: Checkmate-specific logic (requires conditional evaluation) ──
          if (phase.type === 'checkmate') {
            const pointsToActivate = (phase.advancementCondition as any)?.pointsToActivate;

            for (const participant of participantsInvolved) {
              const p_data = matchData.info.participants.find((d: any) => d.puuid === participant.userId);
              if (!p_data) continue;
              
              // Calculate the player's total points in the current round
              const matchResultsInCurrentRound = await tx.matchResult.findMany({
                where: {
                  userId: participant.userId,
                  match: {
                    lobby: {
                      roundId: round.id
                    }
                  }
                },
                select: {
                  points: true
                }
              });
              
              const scoreInRound = matchResultsInCurrentRound.reduce((sum, result) => sum + (result.points || 0), 0);
              
              // Store the scoreInRound in RoundOutcome
              await tx.roundOutcome.upsert({
                where: {
                  participantId_roundId: {
                    participantId: participant.id,
                    roundId: round.id
                  }
                },
                update: {
                  scoreInRound: scoreInRound
                },
                create: {
                  participantId: participant.id,
                  roundId: round.id,
                  status: 'in_progress',
                  scoreInRound: scoreInRound
                }
              });
              
              // Re-fetch participant to get latest checkmateActive status
              const updatedParticipantForCheckmate = await tx.participant.findUnique({
                where: { id: participant.id },
                select: { checkmateActive: true, userId: true }
              });

              if (pointsToActivate && updatedParticipantForCheckmate) {
                if (scoreInRound >= pointsToActivate && !(updatedParticipantForCheckmate.checkmateActive ?? false)) {
                  await tx.participant.update({
                    where: { id: participant.id },
                    data: { checkmateActive: true },
                  });
                  logger.info(`Participant ${participant.userId} is now in CHECKMATE with scoreInRound: ${scoreInRound}!`);
                }
              }
            }
          }
        }

        // After processing all participants for the match, perform checkmate logic if applicable.
          if (phase.type === 'checkmate') {
            const lobbyParticipantPuids = matchData.info.participants.map((p: any) => p.puuid);
            const lobbyParticipants = await tx.participant.findMany({
              where: { userId: { in: lobbyParticipantPuids }, tournamentId: tournamentId }
            });

            const winnerResult = matchData.info.participants.find((p: any) => p.placement === 1);
            const winnerParticipant = lobbyParticipants.find(p => p.userId === winnerResult?.puuid);
            
            if (winnerParticipant?.checkmateActive) {
              // WINNER FOUND!
              logger.info(`CHECKMATE WINNER! Participant ${winnerParticipant.userId} won the tournament!`);
              await tx.tournament.update({
                where: { id: tournamentId },
                data: { status: 'completed', endTime: new Date() }
              });
              await RoundService.payoutPrizes(tx, tournamentId, [winnerParticipant]);
            } else {
              // NO WINNER YET. Queue the next match for the same lobby.
              logger.info(`Checkmate phase: No winner yet. Preparing to create next match for lobby ${lobby.id}.`);
              const newRiotMatchId = 'mock_riot_match_id_' + crypto.randomUUID();

              const newMatch = await tx.match.create({
                data: {
                  matchIdRiotApi: newRiotMatchId,
                  lobbyId: lobby.id,
                },
              });

              jobToQueue = {
                name: 'fetchMatchData',
                data: {
                  matchId: newMatch.id,
                  riotMatchId: newRiotMatchId,
                  region: phase.tournament.region || 'default',
                  lobbyId: lobby.id
                }
              };
          }
        }

        await tx.match.update({
          where: { id: matchId },
          data: { matchData: matchData } as any
        });

        // --- REAL-TIME UPDATE: Lightweight signal + lobby-scoped match results ---
        if (ioClient) {
          // Query only placement/points — NEVER emit raw matchData over sockets
          const leanMatchResults = await tx.matchResult.findMany({
            where: { matchId },
            select: { userId: true, placement: true, points: true },
          });

          logger.info(`Emitting lightweight update after match ${matchId} for tournament ${tournamentId}, lobby ${lobby.id}.`);
          ioClient.emit('worker_lobby_update', {
            tournamentId,
            lobbyId: lobby.id,
            roundId: round.id,
            type: 'match_processed',
            fetchedResult: false,
            matchResults: leanMatchResults,
          });
        }

        // --- LOBBY COMPLETION LOGIC: Check if all matches in this lobby are fetched and update flag --- 
        // For checkmate phases, fetchedResult is managed by the advancement logic itself, not a fixed match count.
        // We only set fetchedResult to true if the phase is NOT checkmate AND all matches are fetched.
        const isCheckmatePhase = phase.type === 'checkmate';

        if (!isCheckmatePhase) {
            const allMatchesInLobbyFetched = await tx.match.count({
                where: {
                    lobbyId: lobby.id,
                    matchData: {
                        not: Prisma.DbNull, // Correct way to check for non-null JSON field
                    },
                },
            });
            
            const expectedMatchesInLobby = await tx.match.count({
                where: { lobbyId: lobby.id }
            }); 
    
            if (allMatchesInLobbyFetched === expectedMatchesInLobby && !lobby.fetchedResult) { 
                logger.info(`All matches for non-checkmate lobby ${lobby.id} are fetched. Updating lobby.fetchedResult to true.`); 
                await tx.lobby.update({ 
                    where: { id: lobby.id }, 
                    data: { fetchedResult: true, completedMatchesCount: { increment: 1 } }, 
                }); 
                
                logger.info(`Emitting 'lobby_completed' for tournament ${tournamentId}, lobby ${lobby.id}. All matches complete.`);
                // Emit lightweight signal — lobby completion (no heavy re-query)
                if (ioClient) {
                    ioClient.emit('worker_lobby_update', {
                        tournamentId,
                        lobbyId: lobby.id,
                        roundId: round.id,
                        type: 'lobby_completed',
                        fetchedResult: true,
                    });
                }

                // Trigger round completion check — queue if Redis available, else call directly
                logger.info(`Triggering completion check for round ${round.id} (non-checkmate).`);
                if (checkRoundCompletionQueue) {
                  await checkRoundCompletionQueue.add('checkRoundCompletion', { roundId: round.id }, { jobId: `check-round-completion-${round.id}`, removeOnComplete: true, removeOnFail: true });
                } else {
                  const _roundIdCheck = round.id;
                  setTimeout(() => { checkAndAdvanceRound(_roundIdCheck).catch(e => logger.error(`[NoRedis] checkAndAdvanceRound: ${e}`)); }, 300);
                } 
            } 
        } else { // It's a checkmate phase
            // For checkmate, the fetchedResult should be true immediately after a match for the lobby it just updated
            // as the checkmate logic will create new matches as needed.
            if (!lobby.fetchedResult) {
                logger.info(`Lobby ${lobby.id} is in a checkmate phase. Setting fetchedResult to true after match completion.`);
                await tx.lobby.update({
                    where: { id: lobby.id },
                    data: { fetchedResult: true },
                });
                // Emit lightweight signal for checkmate lobby completion — no heavy re-query
                logger.info(`Emitting 'lobby_completed' for tournament ${tournamentId}, lobby ${lobby.id}. Checkmate lobby fetchedResult updated.`);
                if (ioClient) {
                    ioClient.emit('worker_lobby_update', {
                        tournamentId,
                        lobbyId: lobby.id,
                        roundId: round.id,
                        type: 'lobby_completed',
                        fetchedResult: true,
                    });
                }

                // Trigger round completion check — queue if Redis available, else call directly
                logger.info(`Triggering completion check for round ${round.id} (checkmate).`);
                if (checkRoundCompletionQueue) {
                  await checkRoundCompletionQueue.add('checkRoundCompletion', { roundId: round.id }, { jobId: `check-round-completion-${round.id}`, removeOnComplete: true, removeOnFail: true });
                } else {
                  const _roundIdCheck = round.id;
                  setTimeout(() => { checkAndAdvanceRound(_roundIdCheck).catch(e => logger.error(`[NoRedis] checkAndAdvanceRound: ${e}`)); }, 300);
                }
            }
        }

        return { message: 'Match results processed', newJob: jobToQueue };
      });

      return resultMessage;
    } catch (error: unknown) {
      logger.error(`Error processing match results for match ${matchId}: ${error instanceof Error ? error.message : String(error)}`, error as Error);
      throw error;
    }
  }
} 