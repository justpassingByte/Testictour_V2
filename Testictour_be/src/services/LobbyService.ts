import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import MatchService from './MatchService';
import crypto from 'crypto';

export default class LobbyService {
  static async list(roundId: string) {
    return prisma.lobby.findMany({ where: { roundId } });
  }

  static async create(roundId: string, data: any, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.lobby.create({ data: { ...data, roundId } });
  }

  static async autoAssignLobbies(
    roundId: string, 
    participants: any[], 
    lobbySize: number = 8,
    assignmentType: 'random' | 'seeded' | 'swiss' | 'snake' = 'random',
    matchesPerRound: number = 1,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;

    let assignedParticipants: any[] = [];

    switch (assignmentType) {
      case 'swiss':
        const sortedParticipants = [...participants].sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
        assignedParticipants = sortedParticipants;
        break;
      case 'seeded':
      case 'snake':
        const baseSorted = [...participants].sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
        const numLobbies = Math.ceil(baseSorted.length / lobbySize);
        const tempLobbies: any[][] = Array.from({ length: numLobbies }, () => []);

        for (let i = 0; i < baseSorted.length; i++) {
          const lobbyIndex = i % numLobbies;
          const isReversed = Math.floor(i / numLobbies) % 2 !== 0;
          if (isReversed) {
            tempLobbies[numLobbies - 1 - lobbyIndex].push(baseSorted[i]);
          } else {
            tempLobbies[lobbyIndex].push(baseSorted[i]);
          }
        }
        assignedParticipants = tempLobbies.flat();
        break;
      default: // 'random'
        assignedParticipants = [...participants].sort(() => Math.random() - 0.5);
        break;
    }

    const lobbies = [];
    let lobbyCount = 1;
    const jobsToQueue: { matchId: string; riotMatchId: string; region: string; lobbyId: string }[] = [];
    for (let i = 0; i < assignedParticipants.length; i += lobbySize) {
      const lobbyParticipants = assignedParticipants.slice(i, i + lobbySize);
      const participantUserIds = lobbyParticipants.map(p => p.userId);
      
      const newLobby = await db.lobby.create({
        data: {
          roundId,
          name: `Lobby ${lobbyCount++}`,
          participants: participantUserIds
        }
      });
      lobbies.push(newLobby);

      // Create multiple matches based on matchesPerRound
      for (let j = 0; j < matchesPerRound; j++) {
        const newMatch = await MatchService.create(newLobby.id, { 
          matchIdRiotApi: crypto.randomUUID()
        }, db);

        // Prepare job data to be queued later, outside of this transaction
        jobsToQueue.push({
          matchId: newMatch.id,
          riotMatchId: newMatch.matchIdRiotApi as string,
          region: 'asia', // Default region, needs to be derived from tournament later if dynamic
          lobbyId: newLobby.id
        });
      }
    }
    
    return { lobbies, jobsToQueue }; // Return both lobbies and jobs to queue
  }
}