import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import PrizeCalculationService from './PrizeCalculationService';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import TournamentSummaryService from './TournamentSummaryService';
import SummaryManagerService from './SummaryManagerService';
import { fetchMatchDataQueue, flowProducer, syncCompletionQueue } from '../lib/queues';
import EscrowService from './EscrowService';
import RoundService from './RoundService';

export default class TournamentService {
  // Cache platform fee with a 10-minute TTL to ensure changes propagate without reboot
  private static platformFeeCache = new Map<string, { fee: number; expiresAt: number }>();

  private static async getPlatformFeePercent(organizerId: string): Promise<number> {
    const now = Date.now();
    const cached = this.platformFeeCache.get(organizerId);
    
    if (cached && cached.expiresAt > now) {
      return cached.fee;
    }

    const sub = await prisma.partnerSubscription.findUnique({ where: { userId: organizerId } });
    const planConfig = await prisma.subscriptionPlanConfig.findUnique({ where: { plan: sub?.plan || 'STARTER' } });
    const fee = planConfig?.platformFeePercent ?? 0.05;
    
    // Vô hiệu hoá cache tự động sau 10 phút (600000 ms)
    this.platformFeeCache.set(organizerId, { fee, expiresAt: now + 600000 });
    return fee;
  }

  static async calculateNetPrizePool(
    tournament: any, 
    counts: { registered: number, reserve: number, absent: number },
    escrow?: any
  ): Promise<number> {
    const maxPlayers = tournament.maxPlayers || tournament.expectedParticipants || 0;
    const totalCount = counts.registered + counts.reserve;
    const isUpcoming = tournament.status === 'UPCOMING' || tournament.status === 'DRAFT' || tournament.status === 'REGISTRATION';
    const multiplier = isUpcoming ? Math.max(maxPlayers, totalCount) : totalCount;
    
    let grossPool = multiplier * (tournament.entryFee || 0);

    if (!tournament.isCommunityMode) {
      if (escrow && escrow.fundedAmount > 0) {
        grossPool = Math.max(grossPool, escrow.fundedAmount);
      } else if (tournament.escrowRequiredAmount && tournament.escrowRequiredAmount > grossPool) {
        grossPool = tournament.escrowRequiredAmount;
      }
    }

    let standardPool = grossPool;

    // Subtract unassigned reserves refund estimate (money going back, not to winners)
    const unassignedReserves = Math.max(0, totalCount - maxPlayers);
    const reserveRefundAmount = Math.min(unassignedReserves * (tournament.entryFee || 0), standardPool);
    standardPool -= reserveRefundAmount;

    // Subtract absent penalties if host keeps them
    let absentKeepAmount = 0;
    if (tournament.absentFeePolicy === 'keep') {
      absentKeepAmount = Math.min(counts.absent * (tournament.entryFee || 0), standardPool);
      standardPool -= absentKeepAmount;
    }
    
    const hostFeePercent = tournament.hostFeePercent || 0;
    const platformFeePercent = await this.getPlatformFeePercent(tournament.organizerId);

    const netPrizePool = standardPool * (1 - hostFeePercent - platformFeePercent);
    return Math.floor(netPrizePool);
  }

  /**
   * Provides a lightweight list of tournaments for general users.
   * Fetches only the necessary data for a public listing to ensure performance.
   */
  static async list() {
    const tournaments = await prisma.tournament.findMany({
      orderBy: {
        startTime: 'desc'
      },
      where: {
        status: { notIn: ['DRAFT', 'CANCELLED'] } // Hide non-public tournaments
      },
      include: {
        organizer: {
          include: {
            partnerSubscription: true
          }
        },
        _count: {
          select: {
            participants: { where: { isReserve: false } },
          }
        }
      }
    });

    // Batch-fetch reserve counts for all tournament IDs
    const tournamentIds = tournaments.map(t => t.id);
    const [reserveCounts, absentCounts] = await Promise.all([
      prisma.participant.groupBy({
        by: ['tournamentId'],
        where: { tournamentId: { in: tournamentIds }, isReserve: true },
        _count: true,
      }),
      prisma.participant.groupBy({
        by: ['tournamentId'],
        where: { tournamentId: { in: tournamentIds }, isAbsent: true },
        _count: true,
      })
    ]);
    const reserveMap = new Map(reserveCounts.map(r => [r.tournamentId, r._count]));
    const absentMap = new Map(absentCounts.map(r => [r.tournamentId, r._count]));

    return Promise.all(tournaments.map(async t => {
      // _count.participants now only counts non-reserve players
      const registeredCount = (t._count as any).participants;
      const reserveCount = reserveMap.get(t.id) || 0;
      const absentCount = absentMap.get(t.id) || 0;

      const finalPrizePool = await this.calculateNetPrizePool(t, {
        registered: registeredCount,
        reserve: reserveCount,
        absent: absentCount
      });
      
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        startTime: t.startTime,
        region: t.region,
        image: t.image,
        maxPlayers: t.maxPlayers,
        entryFee: t.entryFee,
        registered: registeredCount,
        reserveCount,
        reservePlayersLimit: (t as any).reservePlayersLimit || 0,
        budget: finalPrizePool,
        organizer: t.organizer,
        isCommunityMode: t.isCommunityMode,
      };
    }));
  }

  /**
   * Provides a detailed list of tournaments with all related data for the admin panel.
   */
  static async listForAdmin() {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        organizer: true,
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' }
            }
          }
        },
        _count: {
          select: {
            participants: { where: { isReserve: false } },
          }
        }
      }
    });

    // Batch-fetch reserve and absent counts
    const tournamentIds = tournaments.map(t => t.id);
    const [reserveCounts, absentCounts] = await Promise.all([
      prisma.participant.groupBy({
        by: ['tournamentId'],
        where: { tournamentId: { in: tournamentIds }, isReserve: true },
        _count: true,
      }),
      prisma.participant.groupBy({
        by: ['tournamentId'],
        where: { tournamentId: { in: tournamentIds }, isAbsent: true },
        _count: true,
      })
    ]);
    const reserveMap = new Map(reserveCounts.map(r => [r.tournamentId, r._count]));
    const absentMap = new Map(absentCounts.map(r => [r.tournamentId, r._count]));

    return Promise.all(tournaments.map(async t => {
      const roundsTotal = t.phases.reduce((sum, phase) => sum + (phase.numberOfRounds || 0), 0);
      
      let currentRound = 0;
      const currentPhase = t.phases.find(p => p.rounds.some(r => r.status === 'in_progress'));
      if (currentPhase) {
        const round = currentPhase.rounds.find(r => r.status === 'in_progress');
        currentRound = round?.roundNumber || 0;
      }
      
      const registeredCount = (t._count as any).participants;
      const reserveCount = reserveMap.get(t.id) || 0;
      const absentCount = absentMap.get(t.id) || 0;
      
      const finalPrizePool = await this.calculateNetPrizePool(t, {
        registered: registeredCount,
        reserve: reserveCount,
        absent: absentCount
      });

      return {
        ...t,
        registered: registeredCount,
        reserveCount,
        roundsTotal,
        currentRound,
        budget: finalPrizePool,
      };
    }));
  }

  static async detail(id: string) {
    const tournament = await prisma.tournament.findUnique({ 
      where: { id }, 
      include: { 
        organizer: {
          include: {
            partnerSubscription: true
          }
        },
        escrow: true,
        _count: {
          select: {
            participants: { where: { isReserve: false } },
          }
        },
        phases: { 
          orderBy: { phaseNumber: 'asc' },
          include: { 
            rounds: {
              include: {
                lobbies: {
                  include: {
                    matches: {
                      select: {
                        id: true,
                        lobbyId: true,
                        matchIdRiotApi: true,
                        matchData: true,
                        fetchedAt: true,
                      }
                    }
                  }
                },
              }
            }
          }
        }
      }
    });
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Count only non-reserve participants for registration and prize pool
    const registeredCount = (tournament._count as any).participants;
    // Count reserves separately
    const reserveCount = await prisma.participant.count({
      where: { tournamentId: id, isReserve: true }
    });

    const absentCount = await prisma.participant.count({
      where: { tournamentId: id, isAbsent: true }
    });

    const finalBudget = await this.calculateNetPrizePool(tournament, {
      registered: registeredCount,
      reserve: reserveCount,
      absent: absentCount
    }, (tournament as any).escrow);

    const result = {
      ...tournament,
      participants: [],  // No longer fetched here — use /participants endpoint with pagination
      registered: registeredCount,
      reserveCount,
      budget: finalBudget
    };

    return result as any;
  }

  static async create(data: {
    name: string;
    startTime: Date;
    maxPlayers: number;
    organizerId: string;
    entryFee: number;
    registrationDeadline: Date;
    description?: string;
    image?: string;
    region?: string;
    prizeStructure?: any;
    hostFeePercent?: number;
    expectedParticipants?: number;
    templateId?: string;
    phases?: any[];
    isCommunityMode?: boolean;
    customPrizePool?: number;
    discordUrl?: string;
    sponsors?: any;
    reservePlayersLimit?: number;
    absentFeePolicy?: string;
  }) {
    let templateData: any = {};
    let finalStartTime = data.startTime;

    if (data.templateId) {
      const template = await prisma.tournamentTemplate.findUnique({ where: { id: data.templateId } });
      if (!template) throw new ApiError(400, 'Template not found');

      templateData = {
        templateId: template.id,
        prizeStructure: template.prizeStructure,
        hostFeePercent: template.hostFeePercent,
        expectedParticipants: template.expectedParticipants,
        status: 'pending',
        phases: {
          create: ((template.phases as any) || []).map((p: any, index: number) => ({
            name: p.name,
            phaseNumber: index + 1,
            type: p.type,
            lobbySize: p.lobbySize,
            lobbyAssignment: p.lobbyAssignment,
            advancementCondition: p.advancementCondition,
            matchesPerRound: p.matchesPerRound,
            numberOfRounds: p.numberOfRounds,
            status: 'pending',
            tieBreakerRule: p.tieBreakerRule,
            pointsMapping: p.pointsMapping,
            carryOverScores: p.carryOverScores
          }))
        }
      };
      if (
        template.scheduleType === 'daily' &&
        (!(finalStartTime instanceof Date) || isNaN(finalStartTime.getTime()))
      ) {
        const [hours, minutes] = template.startTime.split(':').map(Number);
        const now = new Date();
        finalStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      }
    } else if (data.phases) {
      templateData.phases = {
        create: data.phases.map((p: any, index: number) => ({
            name: p.name,
            phaseNumber: index + 1,
            type: p.type,
            lobbySize: p.lobbySize,
            lobbyAssignment: p.lobbyAssignment,
            advancementCondition: p.advancementCondition,
            matchesPerRound: p.matchesPerRound,
            numberOfRounds: p.numberOfRounds,
            status: 'pending',
            tieBreakerRule: p.tieBreakerRule,
            pointsMapping: p.pointsMapping,
            carryOverScores: p.carryOverScores
        }))
      }
    }

    const { phases, customPrizePool, ...restOfData } = data;

    return prisma.tournament.create({
      data: {
        ...restOfData,
        ...templateData,
        startTime: finalStartTime,
        status: (templateData as any).status || 'pending',
        registrationDeadline: data.registrationDeadline || (templateData as any).registrationDeadline || new Date(),
        prizeStructure: (templateData as any).prizeStructure || {},
        expectedParticipants: (templateData as any).expectedParticipants || 0,
        isCommunityMode: data.isCommunityMode || false,
        escrowRequiredAmount: customPrizePool || 0,
      },
      include: { phases: { orderBy: { phaseNumber: 'asc' } } }
    }).then(async (tournament) => {
      // After creating the tournament and its phases, create rounds ONLY for the first phase
      const firstPhase = tournament.phases.find(p => p.phaseNumber === 1);

      if (firstPhase) {
        let lastRoundStartTime = new Date(tournament.startTime.getTime() + 5 * 60 * 1000); // 5 mins after tournament start
        const numberOfRounds = (firstPhase as any).numberOfRounds || 1;

        for (let i = 1; i <= numberOfRounds; i++) {
          const currentRoundStartTime = (i === 1)
            ? lastRoundStartTime
            : new Date(lastRoundStartTime.getTime() + 45 * 60 * 1000);

          await prisma.round.create({
            data: {
              phaseId: firstPhase.id,
              roundNumber: i,
              startTime: currentRoundStartTime,
              status: 'pending',
            },
          });
          lastRoundStartTime = currentRoundStartTime;
        }
        logger.info(`Initial rounds for the first phase of tournament ${tournament.id} created.`);
      }

      // Initialize Escrow for the newly created tournament
      try {
        await EscrowService.recalculateTournamentEscrow(tournament.id, {
          entryFee: tournament.entryFee,
          maxPlayers: tournament.maxPlayers,
          expectedParticipants: tournament.expectedParticipants,
          hostFeePercent: tournament.hostFeePercent,
        });
        logger.info(`Escrow initialized for tournament ${tournament.id}`);
      } catch (err: any) {
        logger.error(`Failed to initialize escrow for tournament ${tournament.id}: ${err.message}`);
      }

      return tournament;
    });
  }

  static async update(id: string, data: any) {
    // Handle phase deletions: cascade delete child records first to avoid FK violations
    if (data.phases?.delete) {
      const phaseDeletes = Array.isArray(data.phases.delete) ? data.phases.delete : [data.phases.delete];
      const phaseIds = phaseDeletes.map((d: any) => d.id).filter(Boolean);
      
      if (phaseIds.length > 0) {
        logger.info(`TournamentService.update: cascading delete for phases ${phaseIds.join(', ')}`);
        // Delete in correct order: matchResults → matches → lobbies → roundOutcomes → rounds → phases
        const rounds = await prisma.round.findMany({ where: { phaseId: { in: phaseIds } } });
        const roundIds = rounds.map(r => r.id);
        
        if (roundIds.length > 0) {
          const lobbies = await prisma.lobby.findMany({ where: { roundId: { in: roundIds } } });
          const lobbyIds = lobbies.map(l => l.id);
          
          if (lobbyIds.length > 0) {
            const matches = await prisma.match.findMany({ where: { lobbyId: { in: lobbyIds } } });
            const matchIds = matches.map(m => m.id);
            if (matchIds.length > 0) {
              await prisma.matchResult.deleteMany({ where: { matchId: { in: matchIds } } });
              await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
            }
            await prisma.lobby.deleteMany({ where: { id: { in: lobbyIds } } });
          }
          
          await prisma.roundOutcome.deleteMany({ where: { roundId: { in: roundIds } } });
          await prisma.round.deleteMany({ where: { id: { in: roundIds } } });
        }
        
        await prisma.phase.deleteMany({ where: { id: { in: phaseIds } } });
        
        // Remove the delete from data since we already handled it
        delete data.phases.delete;
        // If phases object is now empty, remove it
        if (Object.keys(data.phases).length === 0) {
          delete data.phases;
        }
      }
    }

    if (data.customPrizePool !== undefined) {
      data.escrowRequiredAmount = data.customPrizePool;
      delete data.customPrizePool;
    }

    const tournament = await prisma.tournament.update({ 
      where: { id }, 
      data, 
      include: { organizer: true, phases: true } 
    });

    // Nếu trạng thái giải đấu thay đổi hoặc có thay đổi về cấu trúc giải thưởng, cập nhật summaries
    if (data.status || data.prizeStructure || data.adjustedPrizeStructure) {
      await SummaryManagerService.queueTournamentSummary(id);
    }

    // NEW LOGIC: Check if tournament is in_progress but all its phases are now completed
    // This happens if an admin/partner deletes remaining in_progress phases.
    if (tournament.status === 'in_progress' && tournament.phases && tournament.phases.length > 0) {
      const allCompleted = tournament.phases.every(p => p.status === 'completed');
      if (allCompleted) {
        logger.info(`Tournament ${id} has all phases completed after an update. Finalizing tournament.`);
        await prisma.$transaction(async (tx) => {
          await tx.tournament.update({ where: { id }, data: { status: 'completed' } });
          const finalParticipants = await tx.participant.findMany({
            where: { tournamentId: id, eliminated: false },
            orderBy: { scoreTotal: 'desc' }
          });
          await RoundService.payoutPrizes(tx, id, finalParticipants);
        });
        tournament.status = 'completed';
      }
    }

    // Emit real-time update so all clients see the change immediately
    const io = (global as any).io;
    if (io) {
      io.to(`tournament:${id}`).emit('tournament_update', { type: 'tournament_updated' });
    }

    return tournament;
  }

  static async remove(id: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        phases: {
          include: {
            rounds: {
              include: {
                lobbies: {
                  include: {
                    matches: true
                  }
                }
              }
            }
          }
        },
        participants: true,
      }
    });

    if (!tournament) return;

    // Check if there are any successful transactions (funds collected)
    const successfulTransactions = await prisma.transaction.count({
      where: {
        tournamentId: id,
        status: { in: ['success', 'paid', 'completed'] }
      }
    });

    if (successfulTransactions > 0) {
      throw new ApiError(400, 'Cannot delete a tournament that has active financial transactions or collected funds. Please change its status to CANCELLED instead to ensure participants are properly refunded.');
    }

    const phaseIds = tournament.phases.map(p => p.id);
    const roundIds = tournament.phases.flatMap(p => p.rounds.map(r => r.id));
    const lobbyIds = tournament.phases.flatMap(p => p.rounds.flatMap(r => r.lobbies.map(l => l.id)));
    const matchIds = tournament.phases.flatMap(p => p.rounds.flatMap(r => r.lobbies.flatMap(l => l.matches.map(m => m.id))));
    const participantIds = tournament.participants.map(p => p.id);

    return prisma.$transaction(async (tx) => {
      if (matchIds.length > 0) {
        await tx.matchResult.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.playerMatchSummary.deleteMany({ where: { matchId: { in: matchIds } } });
      }

      if (matchIds.length > 0) {
        await tx.match.deleteMany({ where: { id: { in: matchIds } } });
      }
      if (lobbyIds.length > 0) {
        await tx.lobby.deleteMany({ where: { id: { in: lobbyIds } } });
      }

      if (participantIds.length > 0 || roundIds.length > 0) {
        await tx.roundOutcome.deleteMany({
          where: {
            OR: [
              ...(participantIds.length > 0 ? [{ participantId: { in: participantIds } }] : []),
              ...(roundIds.length > 0 ? [{ roundId: { in: roundIds } }] : [])
            ]
          }
        });
      }

      if (roundIds.length > 0) {
        await tx.round.deleteMany({ where: { id: { in: roundIds } } });
      }
      if (phaseIds.length > 0) {
        await tx.phase.deleteMany({ where: { id: { in: phaseIds } } });
      }

      if (participantIds.length > 0) {
        await tx.reward.deleteMany({ where: { participantId: { in: participantIds } } });
        await tx.participant.deleteMany({ where: { id: { in: participantIds } } });
      }

      // Also there might be Rewards mapped directly to tournamentId
      await tx.reward.deleteMany({ where: { tournamentId: id } });

      await tx.userTournamentSummary.deleteMany({ where: { tournamentId: id } });

      // Clean up escrow and financial records before dropping the tournament
      await tx.transaction.deleteMany({ where: { tournamentId: id } });
      await tx.escrow.deleteMany({ where: { tournamentId: id } });

      return tx.tournament.delete({ where: { id } });
    });
  }

  // Call this when registration closes
  static async finalizeRegistration(tournamentId: string, tx?: Prisma.TransactionClient) {
    const logic = async (db: Prisma.TransactionClient) => {
      const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');

      // Count all participants config entry fees for prize pool calculate (including reserves)
      const actualCount = await db.participant.count({ where: { tournamentId } });
      const entryFee = (tournament as any).entryFee || 0;
      const hostFeePercent = (tournament as any).hostFeePercent || 0.1;
      const dynamicPrizeStructure = PrizeCalculationService.getDynamicPrizeDistribution(actualCount);
      
      const totalCollected = actualCount * entryFee;
      const platformFee = Math.floor(totalCollected * hostFeePercent);
      const totalDistributablePrizePool = totalCollected - platformFee;

      const { adjusted } = PrizeCalculationService.autoAdjustPrizeStructure(
        dynamicPrizeStructure,
        totalDistributablePrizePool
      );

      return db.tournament.update({
        where: { id: tournamentId },
        data: {
          actualParticipantsCount: actualCount,
          adjustedPrizeStructure: adjusted,
        },
      });
    };

    if (tx) {
      return logic(tx);
    } else {
      return prisma.$transaction(logic);
    }
  }

  // Khi một người tham gia mới được thêm vào giải đấu
  static async addParticipant(tournamentId: string, userId: string) {
    try {
      const participant = await prisma.participant.create({
        data: {
          tournamentId,
          userId,
          joinedAt: new Date()
        }
      });

      // Xếp hạng người tham gia trong giải đấu
      await SummaryManagerService.queueTournamentSummary(tournamentId);

      return participant;
    } catch (error: any) {
      // Bắt lỗi ràng buộc duy nhất (ví dụ: người dùng đã tham gia)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(409, 'User has already joined this tournament.');
      }
      throw error;
    }
  }

  static async updateParticipant(id: string, data: any) {
    const participant = await prisma.participant.update({ where: { id }, data });
    
    // Nếu có sự thay đổi về trạng thái hoặc dữ liệu quan trọng khác, có thể cần cập nhật lại summary
    if(data.eliminated !== undefined) {
      await SummaryManagerService.queueTournamentSummary(participant.tournamentId);
    }
    
    return participant;
  }

  static async removeParticipant(id: string) {
    const participant = await prisma.participant.findUnique({ where: { id } });
    if (!participant) {
      throw new ApiError(404, 'Participant not found');
    }
    await prisma.participant.delete({ where: { id } });
    
    // Cập nhật lại summary sau khi xóa người tham gia
    await SummaryManagerService.queueTournamentSummary(participant.tournamentId);

    return { message: 'Participant removed successfully' };
  }

  /**
   * Finds all active matches for a tournament and queues them up for data fetching.
   * This version fetches all matches for in_progress rounds and filters in-app
   * to avoid a Prisma issue with querying for null on JSON fields.
   */
  static async queueSyncJobs(tournamentId: string) {
    logger.info(`Queueing sync jobs for tournament: ${tournamentId}`);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            rounds: {
              where: { status: 'in_progress' },
              orderBy: { roundNumber: 'asc' },
              include: {
                lobbies: {
                  include: {
                    matches: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tournament.status !== 'in_progress') {
      throw new ApiError(400, 'Tournament is not in progress. Cannot sync.');
    }
    
    const matchesToSync = tournament.phases
      .flatMap(p => p.rounds)
      .flatMap(r => r.lobbies)
      .flatMap(l => l.matches)
      .filter(m => m.matchData === null);

    if (matchesToSync.length === 0) {
      await prisma.tournament.update({ where: { id: tournamentId }, data: { syncStatus: 'SUCCESS', lastSyncTime: new Date() } });
      return { message: 'No new matches to sync.', matchesQueued: 0 };
    }
    
    await prisma.tournament.update({
        where: { id: tournamentId },
        data: { syncStatus: 'SYNCING', lastSyncTime: new Date() },
    });

    const region = tournament.region || 'vn';

    // Build the child jobs
    const childJobs = matchesToSync.map(match => ({
      name: 'fetch-match',
      data: {
        matchId: match.id,
        riotMatchId: match.matchIdRiotApi,
        region: region,
        lobbyId: match.lobbyId,
      },
      queueName: fetchMatchDataQueue.name,
    }));

    // Add the flow to the producer
    await flowProducer.add({
      name: 'sync-completion',
      queueName: syncCompletionQueue.name,
      data: { tournamentId },
      children: childJobs,
    });
    
    logger.info(`Queued flow with ${matchesToSync.length} child jobs for tournament ${tournamentId}.`);
    
    return { message: `Successfully queued ${matchesToSync.length} matches for synchronization.`, matchesQueued: matchesToSync.length };
  }
} 