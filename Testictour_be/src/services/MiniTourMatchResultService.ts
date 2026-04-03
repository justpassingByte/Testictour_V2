import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { Socket } from 'socket.io-client';
import crypto from 'crypto';
import SummaryManagerService from './SummaryManagerService';

interface NewJobData {
  name: string;
  data: any;
}

const PLACEMENT_POINTS_MAP: { [key: number]: number } = {
  1: 8,
  2: 7,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
  8: 1,
};

export default class MiniTourMatchResultService {
  static async processMiniTourMatchResults(miniTourMatchId: string, matchData: any, ioClient: Socket): Promise<{ message: string; newJob?: NewJobData }> {
    logger.info(`Starting to process MiniTour match results for match ID: ${miniTourMatchId}`);
    
    let jobToQueue: NewJobData | undefined;

    try {
      const resultMessage = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const miniTourMatch = await tx.miniTourMatch.findUnique({
          where: { id: miniTourMatchId },
          include: { 
            miniTourLobby: true
          }
        });

        if (!miniTourMatch || !miniTourMatch.miniTourLobby) {
          throw new ApiError(404, 'MiniTour Match or Lobby not found');
        }

        const { miniTourLobby } = miniTourMatch;

        if (!matchData?.info) {
          throw new ApiError(400, 'Invalid match data: missing info section.');
        }

        const riotGameStartTimestamp = matchData.info.gameStartTimestamp * 1000; // Convert epoch seconds to milliseconds
        if (!miniTourMatch.startTime) {
          throw new ApiError(500, 'MiniTour match start time is missing.');
        }
        const localMatchStartTime = miniTourMatch.startTime.getTime(); // JavaScript Date object to milliseconds

        // Check 1: Start time comparison (allowing for a small tolerance, e.g., 5 minutes = 300000 milliseconds)
        const timeDifference = Math.abs(riotGameStartTimestamp - localMatchStartTime);
        const TEN_MINUTES_IN_MS = 600000;

        if (timeDifference > TEN_MINUTES_IN_MS) {
          logger.error(`Start time mismatch for match ${miniTourMatchId}. Riot: ${riotGameStartTimestamp}, Local: ${localMatchStartTime}. Difference: ${timeDifference}ms`);
          throw new ApiError(400, 'Match start time mismatch with Riot API data.');
        }

        if (matchData?.info?.participants) {
          const participantPuidsInMatchData = matchData.info.participants.map((p: any) => p.puuid);
          const totalParticipantsInMatchData = matchData.info.participants.length;

          // Find participants linked to this MiniTourLobby by their Riot PUUID
          const participantsInvolved = await tx.miniTourLobbyParticipant.findMany({
            where: {
              miniTourLobbyId: miniTourLobby.id,
              user: {
                puuid: {
                  in: participantPuidsInMatchData,
                },
              },
            },
            include: { user: true },
          });

          // Check 2: Participant count comparison
          if (participantsInvolved.length !== totalParticipantsInMatchData) {
            logger.error(`Participant count mismatch for match ${miniTourMatchId}. Local: ${participantsInvolved.length}, Riot: ${totalParticipantsInMatchData}.`);
            throw new ApiError(400, 'Participant count mismatch with Riot API data.');
          }
          
          for (const lobbyParticipant of participantsInvolved) {
            if (!lobbyParticipant.user.puuid) {
              logger.warn(`Lobby participant with user ID ${lobbyParticipant.userId} is missing a PUUID. Skipping.`);
              continue;
            }

            const p_data = matchData.info.participants.find((d: any) => d.puuid === lobbyParticipant.user.puuid);

            if (!p_data || typeof p_data.placement !== 'number' || p_data.placement < 0) {
              logger.warn(`Invalid or missing placement data for PUUID: ${lobbyParticipant.user.puuid} in match ${miniTourMatchId}. Skipping.`);
              continue;
            }

            // New point calculation using a map
            const points = PLACEMENT_POINTS_MAP[p_data.placement] || 0;
            
            logger.info(`[ResultProcessing] Match: ${miniTourMatchId}, PUUID: ${lobbyParticipant.user.puuid}, Placement: ${p_data.placement}, Points: ${points}`);

            // Use upsert for MiniTourMatchResult, linking by internal userId
            await tx.miniTourMatchResult.upsert({
              where: { miniTourMatchId_userId: { miniTourMatchId: miniTourMatchId, userId: lobbyParticipant.userId } },
              update: { placement: p_data.placement, points: points },
              create: { miniTourMatchId: miniTourMatchId, userId: lobbyParticipant.userId, placement: p_data.placement, points: points },
            });

            // After processing a participant's result, queue a summary update for them.
            await SummaryManagerService.queueMiniTourSummary(miniTourLobby.id, lobbyParticipant.userId);
          }
        }

        /*
         * The full match data is already summarized and saved in the job (`fetchMiniTourMatchData.ts`).
         * This service's responsibility is to process the results into the `MiniTourMatchResult` table and emit updates.
         * The redundant update call below is removed.
        
        await tx.miniTourMatch.update({
          where: { id: miniTourMatchId },
          data: { matchData: matchData } as any
        });
        */

        // --- REAL-TIME UPDATE LOGIC: Emit mini_tour_lobby_update after each match processing --- 
        if (ioClient) { 
          // Fetch the latest state of the miniTourLobby to send to frontend 
          const updatedMiniTourLobby = await tx.miniTourLobby.findUnique({ 
            where: { id: miniTourLobby.id },
            include: { 
              matches: { 
                include: { miniTourMatchResults: true } 
              }, 
              participants: { 
                include: { user: true } 
              } 
            } 
          }); 

          if (updatedMiniTourLobby) { 
            logger.info(`Emitting 'mini_tour_lobby_update' after match ${miniTourMatchId} for miniTourLobby ${miniTourLobby.id}.`); 
            ioClient.emit('worker_mini_tour_lobby_update', {
              miniTourLobbyId: updatedMiniTourLobby.id,
              status: updatedMiniTourLobby.status,
              matches: updatedMiniTourLobby.matches,
              participants: updatedMiniTourLobby.participants,
              name: updatedMiniTourLobby.name,
              // Add any other relevant lobby data you want to send to the frontend
            });
          }
        }

        // After processing all participants and emitting updates, mark the match as COMPLETED
        await tx.miniTourMatch.update({
          where: { id: miniTourMatchId },
          data: { status: 'COMPLETED' },
        });
        
        const updatedStatusCheck = await tx.miniTourMatch.findUnique({ where: { id: miniTourMatchId }, select: { status: true } });
        logger.info(`MiniTourMatch ${miniTourMatchId} status after update: ${updatedStatusCheck?.status}`);

        // Check if all matches for this lobby are COMPLETED
        const remainingInProgressMatches = await tx.miniTourMatch.count({
          where: {
            miniTourLobbyId: miniTourLobby.id,
            status: { not: 'COMPLETED' },
          },
        });

        if (remainingInProgressMatches === 0) {
          await tx.miniTourLobby.update({
            where: { id: miniTourLobby.id },
            data: { status: 'COMPLETED' },
          });
          logger.info(`MiniTourLobby ${miniTourLobby.id} status updated to COMPLETED as all its matches are finished.`);
        }

        return { message: 'MiniTour match results processed', newJob: jobToQueue };
      });

      return resultMessage;
    } catch (error: unknown) {
      logger.error(`Error processing MiniTour match results for match ${miniTourMatchId}: ${error instanceof Error ? error.message : String(error)}`, error as Error);
      throw error;
    }
  }
} 