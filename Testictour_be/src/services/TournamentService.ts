import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import PrizeCalculationService from './PrizeCalculationService';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import TournamentSummaryService from './TournamentSummaryService';
import SummaryManagerService from './SummaryManagerService';
import { fetchMatchDataQueue, flowProducer, syncCompletionQueue } from '../lib/queues';

export default class TournamentService {
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
        _count: {
          select: { participants: true }
        }
      }
    });

    return tournaments.map(t => {
      const { entryFee, hostFeePercent } = t as any;
      const registeredCount = t._count.participants;

      // The prize pool is always calculated based on participation and fees.
      const totalCollected = registeredCount * (entryFee || 0);
      const platformFee = Math.floor(totalCollected * (hostFeePercent || 0.1));
      const finalPrizePool = totalCollected - platformFee;
      
      // Return a slimmed-down object
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
        budget: finalPrizePool,
      };
    });
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
          select: { participants: true }
        }
      }
    });

    return tournaments.map(t => {
      const roundsTotal = t.phases.reduce((sum, phase) => sum + (phase.numberOfRounds || 0), 0);
      
      let currentRound = 0;
      const currentPhase = t.phases.find(p => p.rounds.some(r => r.status === 'in_progress'));
      if (currentPhase) {
        const round = currentPhase.rounds.find(r => r.status === 'in_progress');
        currentRound = round?.roundNumber || 0;
      }
      
      const registeredCount = t._count.participants;
      const totalCollected = registeredCount * t.entryFee;
      const platformFee = Math.floor(totalCollected * (t.hostFeePercent || 0.1));
      const finalPrizePool = totalCollected - platformFee;

      return {
        ...t,
        registered: registeredCount,
        roundsTotal,
        currentRound,
        budget: finalPrizePool,
      };
    });
  }

  static async detail(id: string) {
    const tournament = await prisma.tournament.findUnique({ 
      where: { id }, 
      include: { 
        organizer: true, 
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
                },
              }
            }
          }
        }
      }
    });
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Fetch all participants for the tournament separately with their outcomes
    const participants = await prisma.participant.findMany({
      where: { tournamentId: id },
      include: {
        user: true,
        roundOutcomes: {
          include: {
            round: {
              select: {
                id: true,
                roundNumber: true,
                phaseId: true,
              }
            }
          }
        }
      }
    });

    // Create a map for easy lookup, but we won't inject details back into lobbies
    // const participantsMap = new Map(participants.map(p => [p.userId, p]));

    // Don't process the tournament object. Return the original + the full participant list.
    const result = {
      ...tournament,
      participants: participants
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

    const { phases, ...restOfData } = data;

    return prisma.tournament.create({
      data: {
        ...restOfData,
        ...templateData,
        startTime: finalStartTime,
        status: (templateData as any).status || 'pending',
        registrationDeadline: data.registrationDeadline || (templateData as any).registrationDeadline || new Date(),
        prizeStructure: (templateData as any).prizeStructure || {},
        expectedParticipants: (templateData as any).expectedParticipants || 0,
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
      return tournament;
    });
  }

  static async update(id: string, data: any) {
    const tournament = await prisma.tournament.update({ 
      where: { id }, 
      data, 
      include: { organizer: true, phases: true } 
    });

    // Nếu trạng thái giải đấu thay đổi hoặc có thay đổi về cấu trúc giải thưởng, cập nhật summaries
    if (data.status || data.prizeStructure || data.adjustedPrizeStructure) {
      await SummaryManagerService.queueTournamentSummary(id);
    }

    return tournament;
  }

  static async remove(id: string) {
    return prisma.tournament.delete({ where: { id } });
  }

  // Call this when registration closes
  static async finalizeRegistration(tournamentId: string, tx?: Prisma.TransactionClient) {
    const logic = async (db: Prisma.TransactionClient) => {
      const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');

      const actualCount = await db.participant.count({ where: { tournamentId } });
      const entryFee = (tournament as any).entryFee || 0;
      const hostFeePercent = (tournament as any).hostFeePercent || 0.1;
      const originalPrize = tournament.prizeStructure as any;
      
      const totalCollected = actualCount * entryFee;
      const platformFee = Math.floor(totalCollected * hostFeePercent);
      const totalDistributablePrizePool = totalCollected - platformFee;

      const { adjusted } = PrizeCalculationService.autoAdjustPrizeStructure(
        originalPrize,
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