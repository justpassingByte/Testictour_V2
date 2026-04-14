import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import TransactionService from './TransactionService';
import { Prisma } from '@prisma/client';
import PrizeCalculationService from './PrizeCalculationService';
import { getMajorRegion } from '../utils/RegionMapper';

export default class ParticipantService {
  static async join(tournamentId: string, userId: string, discordId?: string, referralSource?: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');

      // Update discordId if provided
      if (discordId) {
        await tx.user.update({
          where: { id: userId },
          data: { discordId }
        });
      }

      // Validate region if tournament has one
      if (tournament.region) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user?.region) {
          const userMajorRegion = getMajorRegion(user.region);
          if (userMajorRegion !== tournament.region) {
            throw new ApiError(403, `Region mismatch: Your account is in ${userMajorRegion}, but this tournament is for ${tournament.region}.`);
          }
        }
      }

      // Check if user is already a participant
      const existingParticipant = await tx.participant.findFirst({
        where: { tournamentId, userId },
      });
      if (existingParticipant) throw new ApiError(409, 'User already joined this tournament');

      // Check maxPlayers restriction
      const currentParticipants = tournament.actualParticipantsCount || 0;
      if (currentParticipants >= tournament.maxPlayers) {
        throw new ApiError(400, 'Tournament is full');
      }

      // Check if tournament is upcoming
      if (tournament.status !== 'UPCOMING') {
        throw new ApiError(400, 'Tournament is no longer accepting registrations');
      }

      const entryFee = (tournament as any).entryFee || 0;

      // Deduct entry fee AND create Transaction record atomically via TransactionService
      // Previously this only called balance.decrement without creating a transaction record
      if (entryFee > 0) {
        await TransactionService.entryFee(userId, tournamentId, entryFee, tx, (tournament as any).entryType || 'usd');
      }

      const participant = await tx.participant.create({ data: { tournamentId, userId, paid: entryFee > 0, referralSource } });

      // Update tournament's actualParticipantsCount and adjustedPrizeStructure
      const updatedActualCount = (tournament.actualParticipantsCount || 0) + 1;
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { actualParticipantsCount: updatedActualCount },
      });

      return participant;
    });
  }

  static async list(tournamentId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.participant.findMany({
        where: { tournamentId },
        include: { user: true },
        skip: skip,
        take: limit,
      }),
      prisma.participant.count({ where: { tournamentId } })
    ]);
    return { data, total };
  }

  static async leaderboard(tournamentId: string) {
    const participants = await prisma.participant.findMany({
      where: { tournamentId, eliminated: false },
      include: { 
        user: { select: { id: true, username: true, riotGameName: true, riotGameTag: true, rank: true, topFourRate: true, firstPlaceRate: true, region: true } },
        rewards: true 
      },
      orderBy: [
        { scoreTotal: 'desc' },
        { id: 'asc' }
      ]
    });

    // Count matches played for each participant dynamically
    const userIds = participants.map(p => p.user?.id).filter(Boolean) as string[];
    const [matchCounts, tournament] = await Promise.all([
      prisma.matchResult.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          match: {
            lobby: {
              round: {
                phase: { tournamentId }
              }
            }
          }
        },
        _count: { id: true }
      }),
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { escrow: true, _count: { select: { participants: true } } }
      })
    ]);
    const matchCountMap = new Map<string, number>();
    for (const mc of matchCounts) {
      matchCountMap.set(mc.userId, mc._count.id);
    }

    // Calculate projected prizes if tournament has prize structure
    let projectedDistribution: any[] = [];
    if (tournament) {
      const participantCount = tournament._count.participants;
      const totalPot = participantCount * tournament.entryFee;
      const computedPrizePool = tournament.escrowRequiredAmount || (totalPot * (1 - (tournament.hostFeePercent || 0)));

      let prizePool = computedPrizePool;
      if (!tournament.isCommunityMode && tournament.escrow) {
        if (tournament.escrow.fundedAmount > computedPrizePool) {
          prizePool = tournament.escrow.fundedAmount;
        } else if (tournament.escrow.fundedAmount > 0) {
          prizePool = Math.max(computedPrizePool, tournament.escrow.fundedAmount);
        }
      }

      const customStructure = tournament.prizeStructure;
      const hasCustomStructure = customStructure && (
        (Array.isArray(customStructure) && customStructure.length > 0) ||
        (typeof customStructure === 'object' && !Array.isArray(customStructure) && Object.keys(customStructure as object).length > 0)
      );

      const PrizeCalculationService = (await import('./PrizeCalculationService')).default;
      const structureToUse = hasCustomStructure
        ? customStructure
        : PrizeCalculationService.getDynamicPrizeDistribution(participantCount);

      projectedDistribution = PrizeCalculationService.getFinalPrizeDistribution(
        participants as any,
        structureToUse as any,
        prizePool
      );
    }

    return participants.map(p => {
      let rewards = p.rewards || [];
      // If DB has no rewards, inject projected reward for UI
      if (rewards.length === 0) {
        const projectedPrize = projectedDistribution.find(dist => dist.participantId === p.id);
        if (projectedPrize) {
          rewards = [{
            id: `projected_${p.id}`,
            participantId: p.id,
            tournamentId: p.tournamentId,
            amount: projectedPrize.amount,
            status: 'projected',
            sentAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any];
        }
      }

      return {
        ...p,
        rewards,
        matchesPlayed: p.user?.id ? (matchCountMap.get(p.user.id) || 0) : 0
      };
    });
  }

  static async update(participantId: string, data: any) {
    return prisma.participant.update({ where: { id: participantId }, data });
  }

  static async remove(participantId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const participant = await tx.participant.findUnique({ where: { id: participantId } });
      if (!participant) throw new ApiError(404, 'Participant not found');
      const tournament = await tx.tournament.findUnique({ where: { id: participant.tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');
      // Only refund if tournament hasn't started
      if (tournament.status === 'pending' && participant.paid) {
        const entryFee = (tournament as any).entryFee || 0;
        await TransactionService.refund(participant.userId, tournament.id, entryFee, tx, (tournament as any).entryType || 'usd');
      }
      await tx.participant.delete({ where: { id: participantId } });

      // Update tournament's actualParticipantsCount
      const updatedActualCount = Math.max(0, (tournament.actualParticipantsCount || 1) - 1);

      await tx.tournament.update({
        where: { id: tournament.id },
        data: { actualParticipantsCount: updatedActualCount },
      });

      return;
    });
  }

  /**
   * Get participant's round history
   */
  static async getHistory(participantId: string) {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        user: true,
        roundOutcomes: {
          include: {
            round: {
              include: { phase: true }
            }
          },
          orderBy: {
            round: {
              phase: { phaseNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!participant) throw new ApiError(404, 'Participant not found');

    participant.roundOutcomes.sort((a, b) => {
      if (a.round.phase.phaseNumber !== b.round.phase.phaseNumber) {
        return a.round.phase.phaseNumber - b.round.phase.phaseNumber;
      }
      return a.round.roundNumber - b.round.roundNumber;
    });

    return participant;
  }
}