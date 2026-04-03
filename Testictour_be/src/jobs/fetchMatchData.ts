import { Job } from 'bullmq';
import MatchService from '../services/MatchService';
import MatchResultService from '../services/MatchResultService';
import RiotApiService from '../services/RiotApiService';
import logger from '../utils/logger';
import { prisma } from '../services/prisma';
import { Socket } from 'socket.io-client';
import { fetchMatchDataQueue } from '../lib/queues';

interface FetchMatchDataJobData {
  matchId: string;
  riotMatchId: string;
  region: string;
  lobbyId: string;
}

export default async function (job: Job<FetchMatchDataJobData>, ioClient: Socket) {
  logger.info(`MatchDataWorker: Processing job ${job.id} of type ${job.name}`);
  const { matchId, riotMatchId, region, lobbyId } = job.data;

  try {
    // Fetch the match and its related lobby
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        lobby: true, // Only include the lobby itself
      }
    });

    if (!match || !match.lobby) {
      logger.error(`Match ${matchId} or its lobby not found for processing.`);
      throw new Error(`Match ${matchId} or its lobby not found.`);
    }

    // Fetch participants for the specific lobby using the participants JSON field on Lobby
    const lobbyParticipantUserIds = match.lobby.participants as string[]; // Assuming it's an array of user IDs

    const lobbyParticipants = await prisma.participant.findMany({
      where: {
        userId: { in: lobbyParticipantUserIds }, // Filter by userId present in the lobby's participants list
        eliminated: false // Only active participants
      },
      orderBy: { scoreTotal: 'desc' }
    });

    // Fetch match data from Riot API (or mock) using the specific lobby participants
    const riotMatchData = await RiotApiService.fetchMatchData(riotMatchId, region, lobbyId, lobbyParticipants);

    // Save the fetched match data to the database (reintroduced logic)
    let dbMatch;
    const existingMatch = await prisma.match.findUnique({ where: { id: matchId } });

    if (existingMatch) {
      logger.info(`Updating existing match ${existingMatch.id} with new data.`);
      dbMatch = await prisma.match.update({
        where: { id: existingMatch.id },
        data: { matchData: riotMatchData as any, fetchedAt: new Date() }, // Cast to any to avoid JsonValue type issues
      });
    } else {
      logger.info(`Creating new match with matchIdRiotApi: ${riotMatchId}, lobbyId: ${lobbyId}, Prisma match ID: ${matchId}.`);
      dbMatch = await prisma.match.create({
        data: {
          id: matchId,
          matchIdRiotApi: riotMatchId,
          lobbyId: lobbyId,
          fetchedAt: new Date(),
          matchData: riotMatchData as any, // Cast to any to avoid JsonValue type issues
        },
      });
    }

    const processResult = await MatchResultService.processMatchResults(dbMatch.id, riotMatchData, ioClient);

    // If MatchResultService returned a new job to queue (e.g., for next checkmate match)
    if (processResult.newJob) {
      logger.info(`Queueing new job ${processResult.newJob.name} from MatchResultService for match ID: ${dbMatch.id}`);
      await fetchMatchDataQueue.add(processResult.newJob.name, processResult.newJob.data);
    }

    logger.info(`MatchDataWorker: Job ${job.id} completed successfully.`);
  } catch (error) {
    logger.error(`MatchDataWorker: Job ${job.id} failed with error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
} 