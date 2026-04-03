import { Job } from 'bullmq';
import RiotApiService from '../services/RiotApiService';
import logger from '../utils/logger';
import { prisma } from '../services/prisma';
import MiniTourMatchResultService from '../services/MiniTourMatchResultService';
import { Socket } from 'socket.io-client';

interface FetchMiniTourMatchDataJobData {
  miniTourMatchId: string;
}

export default async function (job: Job<FetchMiniTourMatchDataJobData>, ioClient: Socket) {
  const { miniTourMatchId } = job.data;
  logger.info(`MiniTourMatchWorker: Processing job ${job.id} for miniTourMatchId: ${miniTourMatchId}`);

  try {
    const miniTourMatch = await prisma.miniTourMatch.findUnique({
      where: { id: miniTourMatchId },
      include: {
        miniTourLobby: {
          include: {
            participants: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!miniTourMatch) {
      throw new Error(`MiniTourMatch with id ${miniTourMatchId} not found.`);
    }

    if (!miniTourMatch.matchIdRiotApi) {
      throw new Error(`MiniTourMatch ${miniTourMatchId} does not have a Riot Match ID.`);
    }

    // Default to 'sea' if no region is set on the lobby
    const region = 'sea'; 

    const riotMatchData = await RiotApiService.fetchMatchData(
      miniTourMatch.matchIdRiotApi,
      region,
      miniTourMatch.miniTourLobbyId,
      miniTourMatch.miniTourLobby.participants
    );

    // Create a summarized version of the match data
    const summarizedMatchData = {
      matchId: riotMatchData?.metadata?.matchId,
      gameCreation: riotMatchData?.info?.gameCreation,
      gameDuration: riotMatchData?.info?.gameDuration,
      participants: riotMatchData?.info?.participants?.map((p: any) => {
        // Find the corresponding participant in the lobby to get their game name and tag line
        const lobbyParticipant = miniTourMatch.miniTourLobby.participants.find(
          (lobbyP) => lobbyP.user.puuid === p.puuid
        );

        return {
          puuid: p.puuid,
          gameName: p.riotIdGameName,
          tagLine: p.riotIdTagline,
          placement: p.placement,
          totalDamageDealtToChampions: p.totalDamageDealtToChampions,
          goldLeft: p.goldLeft,
          traits: p.traits.map((t: any) => ({
            name: t.name,
            style: t.style,
            tier_current: t.tier_current,
            tier_total: t.tier_total,
          })),
          units: p.units.map((u: any) => ({
            character_id: u.character_id,
            itemNames: u.itemNames,
            tier: u.tier,
          })),
        };
      }),
    };

    const updatedMatch = await prisma.miniTourMatch.update({
      where: { id: miniTourMatchId },
      data: {
        matchData: summarizedMatchData as any,
        fetchedAt: new Date(),
      },
    });

    logger.debug(`Raw Riot Participant Data for match ${miniTourMatchId}:`);
    riotMatchData.info.participants.forEach((participant: any) => {
        logger.debug(`  PUUID: ${participant.puuid}, Placement: ${participant.placement}, KDA: ${participant.kills}/${participant.deaths}/${participant.assists}, Gold: ${participant.goldLeft}`);
    });

    // Pass the full riotMatchData to the service for processing, but only the summary is saved.
    await MiniTourMatchResultService.processMiniTourMatchResults(updatedMatch.id, riotMatchData, ioClient);

    logger.info(`MiniTourMatchWorker: Job ${job.id} for miniTourMatch ${miniTourMatchId} completed successfully.`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObject = error instanceof Error ? error : undefined;
    logger.error(`MiniTourMatchWorker: Job ${job.id} failed with error: ${errorMessage}`, errorObject);
    throw error;
  }
}
