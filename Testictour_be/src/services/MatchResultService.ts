import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { autoAdvanceRoundQueue, checkRoundCompletionQueue, fetchMatchDataQueue } from '../lib/queues';
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

          // Iterate over the sorted participants to ensure updates are done in a consistent order.
          for (const participant of participantsInvolved) {
            const p_data = matchData.info.participants.find((d: any) => d.puuid === participant.userId);

            if (!p_data) {
              logger.warn(`Participant data not found in matchData for user ID: ${participant.userId}. Skipping.`);
              continue;
            }

            const pointsFromPlacement = (pointsMapping && p_data.placement <= pointsMapping.length) 
              ? pointsMapping[p_data.placement - 1] 
              : 0;

            // Use upsert for MatchResult: this is idempotent and correct.
            await tx.matchResult.upsert({
              where: { matchId_userId: { matchId: matchId, userId: p_data.puuid } },
              update: { placement: p_data.placement, points: pointsFromPlacement },
              create: { matchId: matchId, userId: p_data.puuid, placement: p_data.placement, points: pointsFromPlacement },
            });

            // Use atomic increment which is safer for concurrency for scoreTotal
            await tx.participant.update({
              where: { id: participant.id },
              data: { scoreTotal: { increment: pointsFromPlacement } },
            });
            
            if (phase.type === 'checkmate') {
              const pointsToActivate = (phase.advancementCondition as any)?.pointsToActivate;
              
              // Instead of using scoreTotal, calculate the player's total points in the current round
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
              
              // Calculate scoreInRound as the sum of points from all match results in this round
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

              // Use scoreInRound instead of scoreTotal for the checkmate activation check
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

        // --- REAL-TIME UPDATE LOGIC: Emit lobby_update after each match processing --- 
        if (ioClient) { 
          // Fetch the latest state of the lobby to send to frontend 
          const updatedLobby = await tx.lobby.findUnique({ 
            where: { id: lobby.id },
            include: { 
              matches: { 
                include: { matchResults: true } 
              }, 
              round: { 
                select: { id: true, roundNumber: true, phase: { select: { id: true, name: true } } } 
              } 
            } 
          }); 

          if (updatedLobby) { 
            // Fetch actual participant details based on userIds stored in lobby.participants (JsonValue) 
            const participantUserIds = updatedLobby.participants as string[]; 
            const participantsDetails = await tx.participant.findMany({ 
              where: { userId: { in: participantUserIds } }, 
              include: { user: true } 
            }); 

            logger.info(`Emitting 'lobby_update' after match ${matchId} for tournament ${tournamentId}, lobby ${lobby.id}.`); 
            ioClient.emit('worker_lobby_update', {
              tournamentId: tournamentId,
              lobbyId: updatedLobby.id,
              roundId: updatedLobby.round.id,
              fetchedResult: updatedLobby.fetchedResult,
              matches: updatedLobby.matches,
              participants: participantsDetails,
              name: updatedLobby.name,
            });
          }
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
                    data: { fetchedResult: true }, 
                }); 
                
                // Emit another lobby_update to reflect the fetchedResult status change 
                const updatedLobbyFinal = await tx.lobby.findUnique({ 
                    where: { id: lobby.id }, 
                    include: { 
                        matches: { 
                            include: { matchResults: true } 
                        }, 
                        round: { 
                            select: { id: true, roundNumber: true, phase: { select: { id: true, name: true } } } 
                        } 
                    } 
                }); 
    
                if (updatedLobbyFinal) { 
                    const participantUserIds = updatedLobbyFinal.participants as string[]; 
                    const participantsDetails = await tx.participant.findMany({ 
                        where: { userId: { in: participantUserIds } }, 
                        include: { user: true } 
                    }); 
    
                    logger.info(`Emitting 'lobby_update' for tournament ${tournamentId}, lobby ${lobby.id}. All matches complete.`); 
                    ioClient.emit('worker_lobby_update', {
                        tournamentId: tournamentId,
                        lobbyId: updatedLobbyFinal.id,
                        roundId: updatedLobbyFinal.round.id,
                        fetchedResult: updatedLobbyFinal.fetchedResult,
                        matches: updatedLobbyFinal.matches,
                        participants: participantsDetails,
                        name: updatedLobbyFinal.name,
                    }); 

                    // Add job to check round completion after a lobby is marked fetchedResult = true
                    logger.info(`Adding job to checkRoundCompletionQueue for round ${updatedLobbyFinal.round.id} (from non-checkmate branch).`);
                    await checkRoundCompletionQueue.add(
                      'checkRoundCompletion', 
                      { roundId: updatedLobbyFinal.round.id }, 
                      { jobId: `check-round-completion-${updatedLobbyFinal.round.id}`, removeOnComplete: true, removeOnFail: true }
                    );
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
                // Emit an update to reflect this status change for checkmate lobbies
                const updatedLobbyCheckmate = await tx.lobby.findUnique({
                    where: { id: lobby.id },
                    include: {
                        matches: {
                            include: { matchResults: true }
                        },
                        round: {
                            select: { id: true, roundNumber: true, phase: { select: { id: true, name: true } } }
                        },
                    },
                });
                if (updatedLobbyCheckmate) {
                    const participantUserIds = updatedLobbyCheckmate.participants as string[];
                    const participantsDetails = await tx.participant.findMany({
                        where: { userId: { in: participantUserIds } },
                        include: { user: true },
                    });
                    logger.info(`Emitting 'lobby_update' for tournament ${tournamentId}, lobby ${lobby.id}. Checkmate lobby fetchedResult updated.`);
                    ioClient.emit('worker_lobby_update', {
                        tournamentId: tournamentId,
                        lobbyId: updatedLobbyCheckmate.id,
                        roundId: updatedLobbyCheckmate.round.id,
                        fetchedResult: updatedLobbyCheckmate.fetchedResult,
                        matches: updatedLobbyCheckmate.matches,
                        participants: participantsDetails,
                        name: updatedLobbyCheckmate.name,
                    });

                    // Add job to check round completion after a checkmate lobby is marked fetchedResult = true
                    logger.info(`Adding job to checkRoundCompletionQueue for round ${updatedLobbyCheckmate.round.id} (from checkmate branch).`);
                    await checkRoundCompletionQueue.add(
                      'checkRoundCompletion', 
                      { roundId: updatedLobbyCheckmate.round.id }, 
                      { jobId: `check-round-completion-${updatedLobbyCheckmate.round.id}`, removeOnComplete: true, removeOnFail: true }
                    );
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