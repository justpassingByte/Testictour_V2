import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { fisherYatesShuffle } from '../utils/shuffle';

export default class LobbyService {
  static async list(roundId: string) {
    return prisma.lobby.findMany({ where: { roundId } });
  }

  static async create(roundId: string, data: any, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.lobby.create({ data: { ...data, roundId } });
  }

  static async getById(id: string) {
    const lobby = await prisma.lobby.findUnique({
      where: { id },
      include: {
        round: {
          include: {
            phase: {
              include: {
                tournament: true
              }
            }
          }
        },
        matches: {
          include: {
            matchResults: {
              include: {
                user: {
                  select: { id: true, username: true, puuid: true, riotGameName: true, riotGameTag: true }
                }
              }
            }
          }
        }
      }
    });

    if (!lobby) return null;

    let users: any[] = [];
    if (lobby.participants) {
      // @ts-ignore
      const rawParticipants = lobby.participants as any[];
      if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
        const validIds = rawParticipants.map(r => typeof r === 'string' ? r : (r.userId || r.id)).filter(Boolean);
        if (validIds.length > 0) {
          users = await prisma.user.findMany({
            where: { id: { in: validIds } },
            select: { id: true, username: true, puuid: true, riotGameName: true, riotGameTag: true }
          });
        }
      }
    }

    return {
      ...lobby,
      participantDetails: users
    };
  }

  static async autoAssignLobbies(
    roundId: string,
    participants: any[],
    lobbySize: number = 8,
    assignmentType: 'random' | 'seeded' | 'swiss' | 'snake' = 'random',
    _matchesPerRound: number = 1,  // kept for API compatibility — matches now created after validation
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
        assignedParticipants = fisherYatesShuffle(participants);
        break;
    }

    const lobbies = [];
    let lobbyCount = 1;

    // Transitions to schedule OUTSIDE of transaction, after commit (LobbyTimerService requires committed lobby IDs)
    const transitionsToSchedule: { lobbyId: string; target: string; delay: number }[] = [];

    for (let i = 0; i < assignedParticipants.length; i += lobbySize) {
      const lobbyParticipants = assignedParticipants.slice(i, i + lobbySize);
      const participantUserIds = lobbyParticipants.map(p => p.userId);

      const newLobby = await db.lobby.create({
        data: {
          roundId,
          name: `Lobby ${lobbyCount++}`,
          participants: participantUserIds,
          // State machine initialization
          state: 'WAITING',
          phaseStartedAt: new Date(),
        }
      });
      lobbies.push(newLobby);

      // NOTE: Match records are created AFTER Grimoire validates the actual match.
      // Do NOT pre-create Match records here (v2 spec change).

      // Schedule lobby timer: WAITING → READY_CHECK after 120s
      transitionsToSchedule.push({ lobbyId: newLobby.id, target: 'READY_CHECK', delay: 120_000 });
    }

    return { lobbies, transitionsToSchedule }; // caller schedules LobbyTimerService after TX commit
  }
}