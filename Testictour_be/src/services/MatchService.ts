import { prisma } from './prisma';
import { Queue } from 'bullmq';
import { Prisma, MatchResult } from '@prisma/client';
import SummaryManagerService from './SummaryManagerService';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { fetchMatchDataQueue, fetchMiniTourMatchDataQueue } from '../lib/queues';
import GrimoireService from './GrimoireService';

export default class MatchService {
  static async list(lobbyId: string) {
    return prisma.match.findMany({ where: { lobbyId } });
  }
  static async create(lobbyId: string, data: any, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.match.create({ data: { ...data, lobbyId } });
  }
  static async results(matchId: string) {
    return prisma.matchResult.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            riotGameName: true,
          },
        },
      },
    });
  }
  static async fullDetails(matchId: string) {
    if (matchId.startsWith('mini-')) {
      const actualId = matchId.replace('mini-', '');
      const miniMatch = await prisma.miniTourMatch.findUnique({
        where: { id: actualId },
        include: { miniTourLobby: true }
      });
      if (!miniMatch || !miniMatch.matchData) {
        throw new ApiError(404, 'MiniTour Match details not found');
      }
      return miniMatch.matchData;
    } else {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { lobby: true }
      });
      if (!match || !match.matchData) {
        throw new ApiError(404, 'Match details not found');
      }
      return match.matchData;
    }
  }
  static async updateResults(matchId: string, data: any) {
    // Update match results, recalculate points, update participant score
    // data: [{ userId, placement, points }]
    return prisma.$transaction(async (tx: any) => {
      for (const result of data) {
        await tx.matchResult.upsert({
          where: { matchId_userId: { matchId, userId: result.userId } },
          update: { placement: result.placement, points: result.points },
          create: { matchId, userId: result.userId, placement: result.placement, points: result.points }
        });
        // Update participant score
        const participant = await tx.participant.findFirst({ where: { userId: result.userId } });
        if (participant) {
          await tx.participant.update({ where: { id: participant.id }, data: { scoreTotal: { increment: result.points } } });
        }
      }
      return { message: 'Results updated', matchId };
    });
  }
  static async fetchAndSaveMatchData(matchId: string, riotMatchId: string, lobbyId: string, region: string = 'asia') {
    await fetchMatchDataQueue.add('fetchMatchData', { matchId, riotMatchId, region, lobbyId });
    return { message: 'Job queued', matchId };
  }

  async updateMatchResults(matchId: string, results: MatchResult[]) {
    try {
      // Xóa kết quả cũ nếu có
      await prisma.matchResult.deleteMany({
        where: { matchId }
      });

      // Thêm kết quả mới
      const newResults = await Promise.all(
        results.map(result => 
          prisma.matchResult.create({
            data: {
              matchId: result.matchId,
              userId: result.userId,
              placement: result.placement,
              points: result.points
            }
          })
        )
      );

      // Đưa vào queue xử lý summary
      await SummaryManagerService.queueMatchSummary(matchId, newResults);

      return newResults;
    } catch (error) {
      console.error('Failed to update match results:', error);
      throw error;
    }
  }

  // Tạo PlayerMatchSummary cho tất cả người chơi trong một trận
  async createMatchSummaries(matchId: string, results: MatchResult[]) {
    try {
      // Lấy thông tin match và tournament
      const match = await prisma.match.findUnique({
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

      if (!match) return;

      const tournament = match.lobby.round.phase.tournament;
      const round = match.lobby.round;

      // Tạo hoặc cập nhật summary cho mỗi người chơi
      for (const result of results) {
        await prisma.playerMatchSummary.upsert({
          where: {
            userId_matchId: {
              userId: result.userId,
              matchId: match.id
            }
          },
          update: {
            placement: result.placement,
            points: result.points,
            playedAt: match.fetchedAt || round.startTime
          },
          create: {
            userId: result.userId,
            matchId: match.id,
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            roundNumber: round.roundNumber,
            placement: result.placement,
            points: result.points,
            playedAt: match.fetchedAt || round.startTime
          }
        });
      }
    } catch (error) {
      console.error('Failed to create match summaries:', error);
      // Không throw error để không làm fail toàn bộ process
    }
  }

  // Cập nhật thống kê người chơi
  async updatePlayerStats(userIds: string[]) {
    try {
      for (const userId of userIds) {
        // Lấy tất cả kết quả trận đấu của người chơi
        const matchResults = await prisma.matchResult.findMany({
          where: { userId },
          include: { match: true }
        });

        if (!matchResults.length) continue;

        // Tính toán thống kê
        const matchesPlayed = matchResults.length;
        const placements = matchResults.map(r => r.placement);
        const points = matchResults.map(r => r.points);

        // Tính toán average placement
        const averagePlacement = parseFloat((placements.reduce((a, b) => a + b, 0) / matchesPlayed).toFixed(2));
        
        // Tính toán top 4 rate
        const topFourCount = placements.filter(p => p <= 4).length;
        const topFourRate = Math.round((topFourCount / matchesPlayed) * 100);
        
        // Tính toán first place rate
        const firstPlaceCount = placements.filter(p => p === 1).length;
        const firstPlaceRate = Math.round((firstPlaceCount / matchesPlayed) * 100);

        // Lấy số giải đấu đã tham gia (unique)
        const tournamentIds = new Set<string>();
        for (const result of matchResults) {
          const match = await prisma.match.findUnique({
            where: { id: result.matchId },
            include: {
              lobby: {
                include: {
                  round: {
                    include: {
                      phase: true
                    }
                  }
                }
              }
            }
          });
          
          if (match) {
            const tournamentId = match.lobby.round.phase.tournamentId;
            tournamentIds.add(tournamentId);
          }
        }

        // Cập nhật thống kê người chơi
        await prisma.user.update({
          where: { id: userId },
          data: {
            totalMatchesPlayed: matchesPlayed,
            averagePlacement,
            topFourRate,
            firstPlaceRate,
            tournamentsPlayed: tournamentIds.size,
            lastUpdatedStats: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Failed to update player stats:', error);
    }
  }

  /**
   * Queues a sync job for a single Mini Tour match.
   * This is separate from the regular tournament match sync.
   * @param miniTourMatchId The ID of the Mini Tour match to sync.
   */
  static async queueMiniTourMatchSync(miniTourMatchId: string, riotMatchId: string, region: string) {
    // This function will now be responsible for adding a job to fetch and process real match data,
    // and handle prize distribution for mini-tour matches.
    await fetchMiniTourMatchDataQueue.add('processMiniTourMatch', { miniTourMatchId, riotMatchId, region });
    return { message: 'MiniTour match processing job queued.', miniTourMatchId };
  }

  static async getMatchById(matchId: string) {
    return prisma.match.findUnique({
      where: { id: matchId },
    });
  }

  static async updateMatchRiotId(matchId: string, riotMatchId: string) {
    return prisma.match.update({
      where: { id: matchId },
      data: { matchIdRiotApi: riotMatchId },
    });
  }

  /**
   * Finds a match that includes a specific set of participants within a given time range.
   * @param targetParticipantsPuids An array of PUUIDs that must all be present in the match.
   * @param region The region of the match (e.g., 'sea').
   * @param startTime Epoch timestamp in seconds for the start of the search range.
   * @param endTime Epoch timestamp in seconds for the end of the search range.
   * @param maxMatchesToSearch Maximum number of match IDs to fetch and check.
   * @returns The full match data if a match is found, otherwise null.
   */
  static async findMatchByCriteria(
    targetParticipantsPuids: string[],
    region: string,
    startTime: number,
    endTime: number,
    maxMatchesToSearch: number = 5
  ) {
    if (targetParticipantsPuids.length === 0) {
      throw new ApiError(400, 'targetParticipantsPuids cannot be empty');
    }
    try {
      logger.info(`findMatchByCriteria: Calling GrimoireService for target participants.`);
      const response = await GrimoireService.fetchLatestMatch(
        targetParticipantsPuids, // pass all puuids, Grimoire will use the first one to poll
        region,
        startTime,
        endTime,
        targetParticipantsPuids // all targets to verify
      );

      if (response.match && response.match.matchId) {
        logger.info(`Found matching match via Grimoire: ${response.match.matchId}`);
        return response.match.matchId;
      }

      logger.info('None of the fetched matches contained all target participants.');
      return null;
    } catch (error: any) {
      logger.error('Error in findMatchByCriteria:', error.message);
      throw new ApiError(500, `Failed to fetch match from Grimoire API: ${error.message}`);
    }
  }

  static async createMiniTourMatch(miniTourLobbyId: string, data: any, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.miniTourMatch.create({ data: { ...data, miniTourLobbyId } });
  }
} 