import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateStats } from '../utils/playerStatsUtil';

const prisma = new PrismaClient();

// Constants
const STATS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const DEFAULT_PAGE_SIZE = 10;

// Types
interface PlayerStats {
  tournamentsPlayed: number;
  tournamentsWon: number;
  completedTournaments: number;
  matchesPlayed: number;
  averagePlacement: number;
  topFourRate: number;
  firstPlaceRate: number;
  tournamentStats: Array<{
    tournamentId: string;
    tournamentName: string;
    status: string;
    matches: number;
    eliminated: boolean;
    scoreTotal: number;
  }>;
}

// Interface for what's directly cached on the User model
interface SimpleCachedUserStats {
  tournamentsPlayed: number;
  tournamentsWon: number;
  matchesPlayed: number; // Corresponds to totalMatchesPlayed on User
  averagePlacement: number;
  topFourRate: number;
  firstPlaceRate: number;
}

// Helper functions
const getSimpleCachedStats = (user: any): SimpleCachedUserStats | null => {
  const oneHourAgo = new Date(Date.now() - STATS_CACHE_DURATION);
  if (user.lastUpdatedStats && user.lastUpdatedStats > oneHourAgo) {
    return {
      tournamentsPlayed: user.tournamentsPlayed,
      tournamentsWon: user.tournamentsWon,
      matchesPlayed: user.totalMatchesPlayed,
      averagePlacement: user.averagePlacement,
      topFourRate: user.topFourRate,
      firstPlaceRate: user.firstPlaceRate,
    };
  }
  return null;
};

const findUserIdFromParticipantOrUser = async (id: string): Promise<string | null> => {
  // Try to find by participant ID first
  const participant = await prisma.participant.findUnique({
    where: { id },
    select: { userId: true }
  });

  if (participant) {
    return participant.userId;
  }

  // If not found as participant, try to find user directly
  const user = await prisma.user.findUnique({
    where: { id }
  });

  return user ? user.id : null;
};

const calculatePlayerStats = async (userId: string): Promise<PlayerStats> => {
  const participations = await prisma.participant.findMany({
    where: { userId },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    }
  });

  if (participations.length === 0) {
    return {
      tournamentsPlayed: 0,
      tournamentsWon: 0,
      completedTournaments: 0,
      matchesPlayed: 0,
      averagePlacement: 0,
      topFourRate: 0,
      firstPlaceRate: 0,
      tournamentStats: []
    };
  }

  const matchSummaries = await prisma.playerMatchSummary.findMany({
    where: { userId }
  });

  const matchesPlayed = matchSummaries.length;

  const placements = matchSummaries.map(m => m.placement);
  const averagePlacement = matchesPlayed > 0 ? parseFloat((placements.reduce((a, b) => a + b, 0) / matchesPlayed).toFixed(2)) : 0;
  const topFourCount = placements.filter(p => p <= 4).length;
  const topFourRate = matchesPlayed > 0 ? Math.round((topFourCount / matchesPlayed) * 100) : 0;
  const firstPlaceCount = placements.filter(p => p === 1).length;
  const firstPlaceRate = matchesPlayed > 0 ? Math.round((firstPlaceCount / matchesPlayed) * 100) : 0;

  const tournamentSummaries = await prisma.userTournamentSummary.findMany({
    where: { userId },
    include: {
      tournament: {
        select: {
          status: true // Make sure status is selected to filter completed tournaments
        }
      }
    }
  });

  const completedTournaments = tournamentSummaries.filter(t => t.tournament.status === 'COMPLETED').length;
  const tournamentWins = tournamentSummaries.filter(t => t.placement === 1).length;

  const tournamentStats = participations.map(p => {
    const tournamentMatches = matchSummaries.filter(m => m.tournamentId === p.tournamentId).length;
    return {
      tournamentId: p.tournamentId,
      tournamentName: p.tournament.name,
      status: p.tournament.status,
      matches: tournamentMatches,
      eliminated: p.eliminated,
      scoreTotal: p.scoreTotal
    };
  });

  return {
    tournamentsPlayed: participations.length,
    tournamentsWon: tournamentWins,
    completedTournaments,
    matchesPlayed,
    averagePlacement,
    topFourRate,
    firstPlaceRate,
    tournamentStats
  };
};

const updateUserCachedStats = async (userId: string, stats: PlayerStats) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalMatchesPlayed: stats.matchesPlayed,
      averagePlacement: stats.averagePlacement,
      topFourRate: stats.topFourRate,
      firstPlaceRate: stats.firstPlaceRate,
      tournamentsPlayed: stats.tournamentsPlayed,
      tournamentsWon: stats.tournamentsWon,
      lastUpdatedStats: new Date()
    }
  });
};

const commonUserSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  puuid: true,
  riotGameName: true,
  riotGameTag: true,
  region: true,
  createdAt: true,
  rank: true,
  totalMatchesPlayed: true,
  averagePlacement: true,
  topFourRate: true,
  firstPlaceRate: true,
  tournamentsPlayed: true,
  tournamentsWon: true,
  lastUpdatedStats: true,
};

// Controller
export default {
  // Public leaderboard - list all players ranked by cached stats
  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      const whereCondition: any = {
        role: 'user',
      };

      if (search) {
        whereCondition.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { riotGameName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [players, total] = await Promise.all([
        prisma.user.findMany({
          where: whereCondition,
          select: {
            id: true,
            username: true,
            riotGameName: true,
            riotGameTag: true,
            region: true,
            rank: true,
            totalMatchesPlayed: true,
            averagePlacement: true,
            topFourRate: true,
            firstPlaceRate: true,
            tournamentsPlayed: true,
            tournamentsWon: true,
            totalPoints: true,
            lobbiesPlayed: true,
            createdAt: true,
            lastUpdatedStats: true,
          },
          orderBy: [
            { totalPoints: 'desc' },
            { tournamentsWon: 'desc' },
            { topFourRate: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where: whereCondition }),
      ]);

      res.json({
        data: players,
        total,
        limit,
        offset,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get player details by ID (participant ID)
  async getPlayerById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const userId = await findUserIdFromParticipantOrUser(id);
      if (!userId) {
        return res.status(404).json({ message: 'Player not found' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: commonUserSelect
      });

      if (!user) {
        return res.status(404).json({ message: 'Player not found' });
      }

      const stats = await calculatePlayerStats(userId);

      const oneHourAgo = new Date(Date.now() - STATS_CACHE_DURATION);
      if (!user.lastUpdatedStats || user.lastUpdatedStats < oneHourAgo) {
        await updateUserCachedStats(userId, stats);
      }

      const playerData = {
        id: userId,
        inGameName: user.riotGameName,
        gameSpecificId: user.puuid || '',
        region: user.region,
        rank: user.rank || 'Unknown',
        user,
        stats
      };

      res.json(playerData);
    } catch (err) {
      next(err);
    }
  },

  // Get player history (all tournaments this player is in)
  async getPlayerHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // This is participantId
      const { userId } = req.query; // Attempt to get userId from query

      let participant;

      if (userId) {
        // Try to find by userId first
        participant = await prisma.participant.findFirst({
          where: { userId: userId as string },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                riotGameName: true,
                riotGameTag: true,
                region: true,
                rank: true,
                puuid: true
              }
            },
            roundOutcomes: {
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
      }

      if (!participant && id) {
        // Fallback to participantId if userId lookup failed or was not provided
        participant = await prisma.participant.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                riotGameName: true,
                riotGameTag: true,
                region: true,
                rank: true,
                puuid: true
              }
            },
            roundOutcomes: {
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
      }

      if (!participant) {
        return res.status(404).json({ message: 'Player not found' });
      }

      res.json(participant);
    } catch (err) {
      next(err);
    }
  },

  // Get all tournaments for a specific user
  async getUserTournaments(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      // Check if we have cached tournament summaries
      const tournamentSummaries = await prisma.userTournamentSummary.findMany({
        where: { userId },
        include: {
          tournament: {
            include: {
              phases: {
                include: {
                  rounds: true
                }
              }
            }
          }
        }
      });

      if (tournamentSummaries.length > 0) {
        // Return cached data
        const tournaments = tournamentSummaries.map(summary => summary.tournament);
        return res.json({ tournaments });
      }
      
      // If no cached data, get data directly and populate cache
      const userParticipations = await prisma.participant.findMany({
        where: { userId },
        include: {
          tournament: {
            include: {
              phases: {
                include: {
                  rounds: true
                }
              }
            }
          }
        }
      });

      if (!userParticipations.length) {
        return res.json({ tournaments: [] });
      }

      // Populate cache for future requests
      for (const participation of userParticipations) {
        await prisma.userTournamentSummary.create({
          data: {
            userId,
            tournamentId: participation.tournamentId,
            joinedAt: participation.joinedAt,
            placement: null, // Will be calculated later
            points: participation.scoreTotal,
            eliminated: participation.eliminated
          }
        });
      }

      const tournaments = userParticipations.map(participation => participation.tournament);
      res.json({ tournaments });
    } catch (err) {
      next(err);
    }
  },

  // Get all matches for a player
  async getPlayerMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const participant = await prisma.participant.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (!participant) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Check if we have match summaries cached
      const matchSummaries = await prisma.playerMatchSummary.findMany({
        where: { userId: participant.userId },
        orderBy: { playedAt: 'desc' }
      });

      if (matchSummaries.length > 0) {
        // Return cached data
        return res.json({ 
          matches: matchSummaries.map(summary => ({
            id: summary.matchId,
            tournamentId: summary.tournamentId,
            tournamentName: summary.tournamentName,
            roundNumber: summary.roundNumber,
            matchNumber: 1, // Default value
            placement: summary.placement,
            points: summary.points,
            playedAt: summary.playedAt
          }))
        });
      }

      // Get all match results for this player
      const matchResults = await prisma.matchResult.findMany({
        where: { userId: participant.userId },
        include: {
          match: {
            include: {
              lobby: {
                include: {
                  round: true
                }
              }
            }
          }
        }
      });

      // Format the matches with round and tournament information
      const formattedMatches = await Promise.all(
        matchResults.map(async (result) => {
          const round = result.match.lobby.round;
          const phase = await prisma.phase.findUnique({
            where: { id: round.phaseId },
            select: { tournamentId: true, tournament: { select: { name: true } } }
          });

          // Get all results for this match to include in response
          const allMatchResults = await prisma.matchResult.findMany({
            where: { matchId: result.matchId }
          });

          // Populate match summary cache for future requests
          await prisma.playerMatchSummary.create({
            data: {
              userId: participant.userId,
              matchId: result.matchId,
              tournamentId: phase?.tournamentId || '',
              tournamentName: phase?.tournament?.name || 'Unknown Tournament',
              roundNumber: round.roundNumber,
              placement: result.placement,
              points: result.points,
              playedAt: result.match.fetchedAt || round.startTime
            }
          });

          return {
            id: result.match.id,
            tournamentId: phase?.tournamentId || '',
            tournamentName: phase?.tournament?.name || 'Unknown Tournament',
            roundId: round.id,
            roundNumber: round.roundNumber,
            matchNumber: 1, // Default, can be adjusted if your schema has this
            lobbyId: result.match.lobbyId,
            lobbyName: result.match.lobby.name,
            results: allMatchResults,
            playedAt: result.match.fetchedAt,
            scheduledAt: round.startTime
          };
        })
      );

      res.json({ matches: formattedMatches });
    } catch (err) {
      next(err);
    }
  },

  // Get player stats
  async getPlayerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id = '' } = req.params; // Ensure id is always a string

      const userId = await findUserIdFromParticipantOrUser(id);
      if (!userId) {
        return res.status(404).json({ message: 'Player not found' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: commonUserSelect
      });

      if (!user) {
        return res.status(404).json({ message: 'Player not found' });
      }

      const stats = await calculatePlayerStats(userId);

      const oneHourAgo = new Date(Date.now() - STATS_CACHE_DURATION);
      if (!user.lastUpdatedStats || user.lastUpdatedStats < oneHourAgo) {
        await updateUserCachedStats(userId, stats);
      }

      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  // Lấy player match summaries trực tiếp từ bảng summary
  async getPlayerMatchSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = DEFAULT_PAGE_SIZE, offset = 0 } = req.query;
      
      let userId;
      const participant = await prisma.participant.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (participant) {
        userId = participant.userId;
      } else {
        const user = await prisma.user.findUnique({
          where: { id }
        });
        if (!user) {
          return res.status(404).json({ message: 'Player not found' });
        }
        userId = user.id;
      }
      
      // We fetch ALL for simplicity since we must combine and sort them. 
      // For a very large scale app, this would use a unified view or complex raw query.
      const tournamentMatches = await prisma.playerMatchSummary.findMany({
        where: { userId },
      });

      const miniTourMatches = await prisma.miniTourMatchResult.findMany({
        where: { userId },
        include: {
          miniTourMatch: {
            include: {
              miniTourLobby: true
            }
          }
        }
      });

      // Format them into a common interface
      const combinedMatches = [
        ...tournamentMatches.map(m => ({
          ...m,
          playedAt: new Date(m.playedAt)
        })),
        ...miniTourMatches.map(m => ({
          id: `mini-${m.id}`,
          userId: m.userId,
          matchId: m.miniTourMatchId,
          tournamentId: m.miniTourMatch?.miniTourLobbyId || '',
          tournamentName: m.miniTourMatch?.miniTourLobby?.name || 'MiniTour',
          roundNumber: 1, // MiniTours don't have rounds in the same way
          placement: m.placement,
          points: m.points,
          playedAt: m.miniTourMatch?.fetchedAt || m.miniTourMatch?.createdAt || new Date(0),
        }))
      ];

      // Sort descending by playedAt
      combinedMatches.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());

      // Paginate
      const total = combinedMatches.length;
      const paginatedMatches = combinedMatches.slice(Number(offset), Number(offset) + Number(limit));
      
      res.json({
        data: paginatedMatches,
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err) {
      next(err);
    }
  },

  // Lấy player tournament summaries trực tiếp từ bảng summary
  async getPlayerTournamentSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = DEFAULT_PAGE_SIZE, offset = 0 } = req.query;
      
      let userId;
      const participant = await prisma.participant.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (participant) {
        userId = participant.userId;
      } else {
        const user = await prisma.user.findUnique({
          where: { id }
        });
        if (!user) {
          return res.status(404).json({ message: 'Player not found' });
        }
        userId = user.id;
      }
      
      const [rawTournamentSummaries, total] = await Promise.all([
        prisma.userTournamentSummary.findMany({
          where: { userId },
          orderBy: { joinedAt: 'desc' },
          include: {
            tournament: {
              select: {
                name: true,
                startTime: true,
                endTime: true,
                status: true
              }
            }
          },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.userTournamentSummary.count({
          where: { userId }
        })
      ]);
      
      // Map to ensure placement is only shown for COMPLETED tournaments
      const tournamentSummaries = rawTournamentSummaries.map(summary => ({
        ...summary,
        placement: summary.tournament.status === 'COMPLETED' ? summary.placement : null
      }));

      res.json({
        data: tournamentSummaries,
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err) {
      next(err);
    }
  },

  // Update player rank (from external APIs)
  async updatePlayerRank(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { rank } = req.body;

      if (!rank) {
        return res.status(400).json({ message: 'Rank is required' });
      }

      let userId;
      const participant = await prisma.participant.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (participant) {
        userId = participant.userId;
      } else {
        const user = await prisma.user.findUnique({
          where: { id }
        });
        if (!user) {
          return res.status(404).json({ message: 'Player not found' });
        }
        userId = user.id;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          rank,
          rankUpdatedAt: new Date()
        }
      });

      res.json({ message: 'Player rank updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}; 