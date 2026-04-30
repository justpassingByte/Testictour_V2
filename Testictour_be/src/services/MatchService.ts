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
            id: true,
            riotGameName: true,
            username: true,
            puuid: true,
          },
        },
      },
    });
  }

  /**
   * Get full match detail with results, user info, lobby, round, phase info.
   * Used by admin/partner dashboard for match detail modal.
   */
    static async getMatchDetail(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        lobby: {
          include: {
            round: {
              include: {
                phase: {
                  select: {
                    id: true,
                    name: true,
                    phaseNumber: true,
                    type: true,
                    tournamentId: true,
                    advancementCondition: true,
                    pointsMapping: true,
                    matchesPerRound: true,
                  }
                }
              }
            }
          }
        },
        matchResults: {
          include: {
            user: {
              select: {
                id: true,
                riotGameName: true,
                username: true,
                puuid: true,
              }
            }
          },
          orderBy: { placement: 'asc' }
        }
      }
    });

    if (!match) throw new ApiError(404, 'Match not found');

    // Get tournament info
    const tournament = await prisma.tournament.findUnique({
      where: { id: match.lobby.round.phase.tournamentId },
      select: {
        id: true,
        name: true,
        status: true,
        region: true,
      }
    });

        return {
      match: {
        id: (match as any).id,
        lobbyId: (match as any).lobbyId,
        matchIdRiotApi: (match as any).matchIdRiotApi,
        status: (match as any).status,
        fetchedAt: (match as any).fetchedAt,
        createdAt: (match as any).createdAt,
        matchData: (match as any).matchData,
      },
      lobby: {
        id: (match as any).lobby.id,
        name: (match as any).lobby.name,
        state: (match as any).lobby.state,
        completedMatchesCount: (match as any).lobby.completedMatchesCount,
        fetchedResult: (match as any).lobby.fetchedResult,
      },
      round: {
        id: (match as any).lobby.round.id,
        roundNumber: (match as any).lobby.round.roundNumber,
        status: (match as any).lobby.round.status,
      },
      phase: (match as any).lobby.round.phase,
      tournament,
      results: (match as any).matchResults,
    };
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
      // Get the match with lobby/round/phase info to know the tournament
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          lobby: {
            include: {
              round: {
                include: { phase: true }
              }
            }
          }
        }
      });
      if (!match) throw new ApiError(404, 'Match not found');
      const tournamentId = match.lobby.round.phase.tournamentId;

            // Get old results to compute score adjustments
      const oldResults = await tx.matchResult.findMany({ where: { matchId } });
      const oldScoreMap = new Map<string, number>(oldResults.map((r: any) => [r.userId, r.points as number || 0]));

      for (const result of data) {
                const oldPoints = (oldScoreMap.get(result.userId) as number) || 0;

        await tx.matchResult.upsert({
          where: { matchId_userId: { matchId, userId: result.userId } },
          update: { placement: result.placement, points: result.points },
          create: { matchId, userId: result.userId, placement: result.placement, points: result.points }
        });

        // Update participant score: subtract old points, add new points
        const participant = await tx.participant.findFirst({ where: { userId: result.userId, tournamentId } });
        if (participant) {
          const delta = (result.points as number) - oldPoints;
          if (delta !== 0) {
            await tx.participant.update({
              where: { id: participant.id },
              data: { scoreTotal: { increment: delta } }
            });
          }
        }
      }

      // Update summaries after edit
      try {
        const SummaryManagerService = (await import('./SummaryManagerService')).default;
        await SummaryManagerService.queueMatchSummary(matchId, data);
      } catch { /* non-fatal */ }

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

  static async getMatchWithLobbyAndRound(matchId: string) {
    return prisma.match.findUnique({
      where: { id: matchId },
      include: {
        lobby: {
          include: { round: true }
        }
      }
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