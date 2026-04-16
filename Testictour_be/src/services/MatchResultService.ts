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

          // Execute bulk INSERT ... ON CONFLICT for MatchResult (parameterized — no SQL injection risk)
          if (bulkMatchResultValues.length > 0) {
            // Build parameterized values for each row: ($1::uuid, $2, $3, $4, $5)
            const rowPlaceholders = bulkMatchResultValues
              .map((_, i) => `(gen_random_uuid(), $${i * 4 + 1}::uuid, $${i * 4 + 2}, $${i * 4 + 3}::int, $${i * 4 + 4}::int)`)
              .join(', ');
            const flatValues = bulkMatchResultValues.flatMap(v => [v.matchId, v.userId, v.placement, v.points]);

            await tx.$executeRawUnsafe(
              `INSERT INTO "MatchResult" ("id", "matchId", "userId", "placement", "points")
               VALUES ${rowPlaceholders}
               ON CONFLICT ("matchId", "userId")
               DO UPDATE SET "placement" = EXCLUDED."placement", "points" = EXCLUDED."points"`,
              ...flatValues
            );
            logger.debug(`Bulk upserted ${bulkMatchResultValues.length} match results for match ${matchId}`);
          }

          // Execute bulk UPDATE for Participant.scoreTotal (parameterized)
          if (bulkScoreIncrements.length > 0) {
            // Use updateMany per participant to stay fully parameterized (avoids CASE string interpolation)
            // For N ≤ 8 players per match this is acceptable (8 queries vs N-injection risk)
            await Promise.all(
              bulkScoreIncrements.map(v =>
                tx.participant.update({
                  where: { id: v.participantId },
                  data: { scoreTotal: { increment: v.points } },
                })
              )
            );
            logger.debug(`Incremented scoreTotal for ${bulkScoreIncrements.length} participants`);
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

        // --- LOBBY COMPLETION LOGIC ---
        // Determine if ALL matches for this lobby in this round are now done.
        //
        // ⚠️  CRITICAL: Do NOT count existing match records to decide this.
        //    In multi-match phases (BO2, BO3, Swiss), Match 2/3 are created on-demand after Match 1
        //    completes. At the time Match 1 finishes: existingMatchCount=1, fetchedMatchCount=1 → 1===1
        //    would incorrectly set fetchedResult=true too early.
        //
        // FIX: Read matchesPerRound from phase and compare against completedMatchesCount+1.
        //    completedMatchesCount tracks how many matches this lobby has completed within the round.
        //    The lobby is "done" when completedMatchesCount+1 (after this match) >= matchesPerRound.
        const isCheckmatePhase = phase.type === 'checkmate';
        const matchesPerRound = (phase as any).matchesPerRound || 1;
        // Read the current completedMatchesCount from DB (not the stale in-memory lobby object)
        const freshLobby = await tx.lobby.findUnique({
          where: { id: lobby.id },
          select: { completedMatchesCount: true, fetchedResult: true },
        });
        const currentCompletedMatches = freshLobby?.completedMatchesCount ?? 0;
        // After processing this match, the lobby will have completed `currentCompletedMatches + 1` matches
        const matchesAfterThis = currentCompletedMatches + 1;
        const isLobbyFullyDone = !isCheckmatePhase && matchesAfterThis >= matchesPerRound;

        if (!isCheckmatePhase) {
          // Always increment completedMatchesCount AND set fetchedResult=true after each match.
          // For multi-match rounds (BO2/BO3), autoAdvance detects intermediate completion
          // (minCompletedMatches < matchesPerRound) and reshuffles lobbies, resetting
          // fetchedResult=false and state='WAITING' for the next match.
          await tx.lobby.update({
            where: { id: lobby.id },
            data: {
              completedMatchesCount: { increment: 1 },
              fetchedResult: true,
            },
          });

          if (isLobbyFullyDone) {
            logger.info(`[LobbyCompletion] Lobby ${lobby.id}: match ${matchesAfterThis}/${matchesPerRound} done — final match completed.`);
            if (ioClient) {
              ioClient.emit('worker_lobby_update', {
                tournamentId,
                lobbyId: lobby.id,
                roundId: round.id,
                type: 'lobby_completed',
                fetchedResult: true,
                matchNumber: matchesAfterThis,
                matchesPerRound,
              });
            }
          } else {
            logger.info(`[LobbyCompletion] Lobby ${lobby.id}: match ${matchesAfterThis}/${matchesPerRound} done — autoAdvance will reshuffle for next match.`);
            if (ioClient) {
              ioClient.emit('worker_lobby_update', {
                tournamentId,
                lobbyId: lobby.id,
                roundId: round.id,
                type: 'match_completed',
                matchNumber: matchesAfterThis,
                matchesPerRound,
              });
            }
          }

          // Always trigger round completion check after each match.
          // For final match: autoAdvance finalizes the round.
          // For intermediate match (BO2/BO3): autoAdvance reshuffles lobbies
          // and schedules READY_CHECK timers via schedule_lobby_timers sentinel.
          logger.info(`[LobbyCompletion] Triggering round completion check for round ${round.id}.`);
          if (checkRoundCompletionQueue) {
            await checkRoundCompletionQueue.add(
              'checkRoundCompletion',
              { roundId: round.id },
              { jobId: `check-round-completion-${round.id}`, removeOnComplete: true, removeOnFail: true }
            );
          } else {
            const _roundIdCheck = round.id;
            setTimeout(() => { checkAndAdvanceRound(_roundIdCheck).catch(e => logger.error(`[NoRedis] checkAndAdvanceRound: ${e}`)); }, 300);
          }
        } else {
          // Checkmate: fetchedResult is reset by the checkmate advancement logic after each match.
          // We just set it to true here to signal the worker; checkmate logic will reset it when
          // it creates the next match.
          if (!freshLobby?.fetchedResult) {
            logger.info(`[LobbyCompletion] Checkmate lobby ${lobby.id}: setting fetchedResult=true after match.`);
            await tx.lobby.update({
              where: { id: lobby.id },
              data: { fetchedResult: true },
            });

            if (ioClient) {
              ioClient.emit('worker_lobby_update', {
                tournamentId,
                lobbyId: lobby.id,
                roundId: round.id,
                type: 'lobby_completed',
                fetchedResult: true,
              });
            }

            logger.info(`[LobbyCompletion] Triggering completion check for checkmate round ${round.id}.`);
            if (checkRoundCompletionQueue) {
              await checkRoundCompletionQueue.add(
                'checkRoundCompletion',
                { roundId: round.id },
                { jobId: `check-round-completion-${round.id}`, removeOnComplete: true, removeOnFail: true }
              );
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