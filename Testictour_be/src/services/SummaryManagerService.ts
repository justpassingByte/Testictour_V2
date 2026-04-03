import { prisma } from './prisma';
import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger';
import { redisConnectionOptions, REDIS_ENABLED } from '../lib/queues'; // Import the shared connection options

// Sử dụng kết nối Redis chung cho BullMQ
const connection = redisConnectionOptions;

// Tạo queue để xử lý việc tạo summary — only when Redis is available
let matchSummaryQueue: Queue = null as any;
let tournamentSummaryQueue: Queue = null as any;
let playerStatsQueue: Queue = null as any;
let miniTourSummaryQueue: Queue = null as any;

if (REDIS_ENABLED) {
  matchSummaryQueue = new Queue('matchSummary', { connection });
  tournamentSummaryQueue = new Queue('tournamentSummary', { connection });
  playerStatsQueue = new Queue('playerStats', { connection });
  miniTourSummaryQueue = new Queue('miniTourSummary', { connection });
}

class SummaryManagerService {
  static workersInitialized = false;

  /**
   * Khởi tạo workers để xử lý các queue
   */
  static initWorkers() {
    // Prevent duplicate initialization
    if (this.workersInitialized) {
      logger.warn('Summary workers already initialized, skipping initialization');
      return;
    }

    try {
      // Worker xử lý match summary
      new Worker('matchSummary', async (job) => {
        const { matchId, results } = job.data;
        try {
          await this.createMatchSummaries(matchId, results);
          logger.debug(`Match summary processed for match ${matchId}`);
          return { success: true, matchId };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Error processing match summary for match ${matchId}: ${errorMsg}`);
          throw error;
        }
      }, { connection });

      // Worker xử lý tournament summary
      new Worker('tournamentSummary', async (job) => {
        const { tournamentId } = job.data;
        try {
          await this.updateTournamentSummaries(tournamentId);
          logger.debug(`Tournament summary processed for tournament ${tournamentId}`);
          return { success: true, tournamentId };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Error processing tournament summary for tournament ${tournamentId}: ${errorMsg}`);
          throw error;
        }
      }, { connection });

      // Worker xử lý player stats
      new Worker('playerStats', async (job) => {
        const { userId } = job.data;
        try {
          await this.updatePlayerStats(userId);
          logger.debug(`Player stats processed for user ${userId}`);
          return { success: true, userId };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Error processing player stats for user ${userId}: ${errorMsg}`);
          throw error;
        }
      }, { connection });

      // Worker xử lý MiniTour summary
      new Worker('miniTourSummary', async (job) => {
        const { miniTourLobbyId, userId } = job.data;
        try {
          await this.updateMiniTourParticipantSummary(miniTourLobbyId, userId);
          logger.debug(`MiniTour summary processed for user ${userId} in lobby ${miniTourLobbyId}`);
          return { success: true, miniTourLobbyId, userId };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Error processing MiniTour summary for user ${userId} in lobby ${miniTourLobbyId}: ${errorMsg}`);
          throw error;
        }
      }, { connection });

      this.workersInitialized = true;
      logger.info('Summary workers initialized');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initialize summary workers: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Thêm công việc tạo match summary vào queue
   */
  static async queueMatchSummary(matchId: string, results: any[]) {
    try {
      if (!matchSummaryQueue) throw new Error('Queue not available');
      await matchSummaryQueue.add(`match-${matchId}`, { matchId, results }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });
      logger.debug(`Match summary queued for match ${matchId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to queue match summary for match ${matchId}: ${errorMsg}`);
      // Try direct processing if queueing fails
      try {
        await this.createMatchSummaries(matchId, results);
        logger.info(`Fallback: Directly processed match summary for ${matchId} after queue failure`);
      } catch (directError) {
        logger.error(`Both queue and direct processing failed for match ${matchId}`);
      }
    }
  }

  /**
   * Thêm công việc cập nhật tournament summary vào queue
   */
  static async queueTournamentSummary(tournamentId: string) {
    try {
      if (!tournamentSummaryQueue) throw new Error('Queue not available');
      await tournamentSummaryQueue.add(`tournament-${tournamentId}`, { tournamentId }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });
      logger.debug(`Tournament summary queued for tournament ${tournamentId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to queue tournament summary for tournament ${tournamentId}: ${errorMsg}`);
      // Try direct processing if queueing fails
      try {
        await this.updateTournamentSummaries(tournamentId);
        logger.info(`Fallback: Directly processed tournament summary for ${tournamentId} after queue failure`);
      } catch (directError) {
        logger.error(`Both queue and direct processing failed for tournament ${tournamentId}`);
      }
    }
  }

  /**
   * Thêm công việc cập nhật player stats vào queue
   */
  static async queuePlayerStats(userId: string) {
    try {
      if (!playerStatsQueue) throw new Error('Queue not available');
      await playerStatsQueue.add(`player-${userId}`, { userId }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });
      logger.debug(`Player stats queued for user ${userId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to queue player stats for user ${userId}: ${errorMsg}`);
      // Try direct processing if queueing fails
      try {
        await this.updatePlayerStats(userId);
        logger.info(`Fallback: Directly processed player stats for ${userId} after queue failure`);
      } catch (directError) {
        logger.error(`Both queue and direct processing failed for user ${userId}`);
      }
    }
  }

  /**
   * Thêm công việc cập nhật MiniTour summary vào queue
   */
  static async queueMiniTourSummary(miniTourLobbyId: string, userId: string) {
    try {
      if (!miniTourSummaryQueue) throw new Error('Queue not available');
      await miniTourSummaryQueue.add(`minitour-${miniTourLobbyId}-${userId}`, { miniTourLobbyId, userId }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });
      logger.debug(`MiniTour summary queued for user ${userId} in lobby ${miniTourLobbyId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to queue MiniTour summary for user ${userId} in lobby ${miniTourLobbyId}: ${errorMsg}`);
    }
  }

  /**
   * Tạo PlayerMatchSummary cho tất cả người chơi trong một trận
   */
  static async createMatchSummaries(matchId: string, results: any[]) {
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

      if (!match) {
        logger.warn(`Cannot create match summaries: Match ${matchId} not found`);
        return;
      }

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

        // Đưa vào queue cập nhật thống kê người chơi
        await this.queuePlayerStats(result.userId);
      }

      // Đưa vào queue cập nhật tournament summary
      await this.queueTournamentSummary(tournament.id);
      logger.debug(`Created ${results.length} match summaries for match ${matchId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create match summaries: ${errorMsg}`);
      // Không throw error để không làm fail toàn bộ process
    }
  }

  /**
   * Cập nhật UserTournamentSummary cho tất cả người tham gia của một giải đấu
   */
  static async updateTournamentSummaries(tournamentId: string) {
    try {
      // Lấy thông tin giải đấu và người tham gia
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          participants: true
        }
      });

      if (!tournament) {
        logger.error(`Tournament not found: ${tournamentId}`);
        return;
      }

      // Lấy tất cả participants
      const participants = tournament.participants;

      if (participants.length === 0) {
        logger.warn(`Tournament ${tournamentId} has no participants, skipping summary creation`);
        return;
      }

      logger.info(`Creating summaries for ${participants.length} participants in tournament ${tournamentId}`);

      for (const participant of participants) {
        // Kiểm tra xem đã có summary chưa
        const existingSummary = await prisma.userTournamentSummary.findUnique({
          where: {
            userId_tournamentId: {
              userId: participant.userId,
              tournamentId
            }
          }
        });

        // Tính toán vị trí hiện tại của người tham gia
        // Tính tổng điểm của mỗi người tham gia
        const allParticipants = await prisma.participant.findMany({
          where: { tournamentId }
        });

        // Sắp xếp theo điểm giảm dần để xác định vị trí, xử lý scoreTotal có thể null
        const sortedParticipants = [...allParticipants].sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));

        // Tìm vị trí của người tham gia hiện tại
        const currentPosition = sortedParticipants.findIndex(p => p.userId === participant.userId) + 1;
        // Đảm bảo placement không phải là 0 nếu không tìm thấy người tham gia (findIndex trả về -1)
        const finalPlacement = currentPosition > 0 ? currentPosition : null;

        if (existingSummary) {
          // Cập nhật summary hiện có
          await prisma.userTournamentSummary.update({
            where: {
              id: existingSummary.id
            },
            data: {
              points: participant.scoreTotal,
              placement: finalPlacement,
              eliminated: participant.eliminated
            }
          });
          // logger.debug(`Updated summary for participant ${participant.userId} in tournament ${tournamentId}`);
        } else {
          // Tạo summary mới
          await prisma.userTournamentSummary.create({
            data: {
              userId: participant.userId,
              tournamentId,
              joinedAt: participant.joinedAt,
              placement: finalPlacement,
              points: participant.scoreTotal,
              eliminated: participant.eliminated
            }
          });
          // logger.debug(`Created new summary for participant ${participant.userId} in tournament ${tournamentId}`);
        }
      }

      // logger.info(`Updated tournament summaries for tournament: ${tournament.name} (${tournamentId})`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to update tournament summaries: ${errorMsg}`);
      throw error; // Throw to let the worker know it failed
    }
  }

  /**
   * Cập nhật thống kê người chơi
   */
  static async updatePlayerStats(userId: string) {
    try {
      // Lấy tất cả kết quả trận đấu của người chơi
      const matchResults = await prisma.matchResult.findMany({
        where: { userId },
        include: { match: true }
      });

      if (!matchResults.length) {
        logger.debug(`No match results found for user ${userId}, skipping stats update`);
        return;
      }

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

      // Sử dụng PlayerMatchSummary để tìm tournaments
      const matchSummaries = await prisma.playerMatchSummary.findMany({
        where: { userId },
        select: { tournamentId: true }
      });

      for (const summary of matchSummaries) {
        tournamentIds.add(summary.tournamentId);
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
      // logger.debug(`Updated stats for user ${userId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to update player stats: ${errorMsg}`);
      throw error; // Throw to let the worker know it failed
    }
  }

  /**
   * Xử lý trực tiếp tất cả các summary liên quan đến một giải đấu
   */
  static async processCompletedTournamentDirectly(tournamentId: string) {
    logger.info(`Direct processing of tournament ${tournamentId} summaries requested`);

    try {
      // 1. Ensure tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          phases: {
            include: {
              rounds: {
                include: {
                  lobbies: {
                    include: {
                      matches: {
                        include: {
                          matchResults: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found for summary processing`);
        return;
      }

      // 2. Process all match summaries first
      let matchCount = 0;
      for (const phase of tournament.phases) {
        for (const round of phase.rounds) {
          for (const lobby of round.lobbies) {
            for (const match of lobby.matches) {
              if (match.matchResults && match.matchResults.length > 0) {
                await this.createMatchSummaries(match.id, match.matchResults);
                matchCount++;
              }
            }
          }
        }
      }
      // logger.info(`Processed ${matchCount} matches for tournament ${tournamentId}`);

      // 3. Process tournament summary
      await this.updateTournamentSummaries(tournamentId);

      // 4. Get all participants and update their stats
      const participants = await prisma.participant.findMany({
        where: { tournamentId }
      });

      if (participants.length > 0) {
        // Process in batches for large tournaments
        const batchSize = 10;
        for (let i = 0; i < participants.length; i += batchSize) {
          const batch = participants.slice(i, i + batchSize);
          await Promise.all(batch.map(p => this.updatePlayerStats(p.userId)));
        }
      }

      // logger.info(`Completed direct processing of all summaries for tournament ${tournamentId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Error in direct tournament processing: ${errorMsg}`);
    }
  }

  /**
   * Cập nhật thống kê tổng hợp cho một người chơi trong một MiniTour Lobby
   */
  static async updateMiniTourParticipantSummary(miniTourLobbyId: string, userId: string) {
    try {
      const results = await prisma.miniTourMatchResult.findMany({
        where: {
          userId: userId,
          miniTourMatch: {
            miniTourLobbyId: miniTourLobbyId,
          },
        },
        include: {
          miniTourMatch: true, // Include to sort by match creation time
        },
      });

      // Sort in-memory by the match's fetchedAt timestamp, descending
      results.sort((a, b) => {
        const timeA = a.miniTourMatch?.fetchedAt?.getTime() || 0;
        const timeB = b.miniTourMatch?.fetchedAt?.getTime() || 0;
        return timeB - timeA;
      });

      if (results.length === 0) {
        logger.warn(`No MiniTour match results found for user ${userId} in lobby ${miniTourLobbyId}. Skipping summary update.`);
        return;
      }

      const matchesPlayed = results.length;
      const totalPoints = results.reduce((sum, result) => sum + (result.points || 0), 0);
      const totalPlacement = results.reduce((sum, result) => sum + (result.placement || 0), 0);
      const averagePlacement = matchesPlayed > 0 ? parseFloat((totalPlacement / matchesPlayed).toFixed(2)) : 0;
      const lastFivePlacements = results.slice(0, 5).map(r => r.placement);

      await prisma.miniTourLobbyParticipant.update({
        where: {
          miniTourLobbyId_userId: {
            miniTourLobbyId: miniTourLobbyId,
            userId: userId,
          }
        },
        data: {
          matchesPlayed,
          totalPoints,
          averagePlacement,
          lastFivePlacements,
        },
      });

      // UPDATE GLOBAL MINITOUR CACHE ON USER PROFILE
      // Calculate global totalPoints and lobbiesPlayed across ALL minitour lobbies
      const globalPointsAgg = await prisma.miniTourMatchResult.aggregate({
        where: { userId },
        _sum: { points: true },
        _count: true,
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalPoints: globalPointsAgg._sum.points || 0,
          lobbiesPlayed: globalPointsAgg._count || 0,
        }
      });

      logger.info(`Updated MiniTour summary for user ${userId} in lobby ${miniTourLobbyId}.`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to update MiniTour participant summary for user ${userId} in lobby ${miniTourLobbyId}: ${errorMsg}`);
      throw error;
    }
  }
}

export default SummaryManagerService; 
