import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import TransactionService from './TransactionService';
import { Prisma } from '@prisma/client';
import PrizeCalculationService from './PrizeCalculationService';

export default class ParticipantService {
  static async join(tournamentId: string, userId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');

      // Check if user is already a participant
      const existingParticipant = await tx.participant.findFirst({
        where: {
          tournamentId: tournamentId,
          userId: userId,
        },
      });

      if (existingParticipant) {
        throw new ApiError(409, 'User already joined this tournament');
      }

      const entryFee = (tournament as any).entryFee || 0;
      const balance = await tx.balance.findUnique({ where: { userId } });
      if (!balance || balance.amount < entryFee) throw new ApiError(400, 'Insufficient balance');
      await tx.balance.update({ where: { userId }, data: { amount: { decrement: entryFee } } });
      const participant = await tx.participant.create({ data: { tournamentId, userId, paid: true } });

      // After creating participant, update tournament's actualParticipantsCount and adjustedPrizeStructure
      const updatedActualCount = (tournament.actualParticipantsCount || 0) + 1;
      const hostFeePercent = (tournament as any).hostFeePercent || 0.1; // Assuming a fixed 10% platform fee for tournaments
      const totalDistributablePrizePool = updatedActualCount * entryFee * (1 - hostFeePercent);
      const originalPrizeStructure = tournament.prizeStructure as Record<string, number>;

      const { adjusted } = PrizeCalculationService.autoAdjustPrizeStructure(
        originalPrizeStructure,
        totalDistributablePrizePool
      );

      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          actualParticipantsCount: updatedActualCount,
          adjustedPrizeStructure: adjusted,
        },
      });

      return participant;
    });
  }
  static async list(tournamentId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return prisma.participant.findMany({
      where: { tournamentId },
      include: { user: true },
      skip: skip,
      take: limit,
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
      // Only refund if tournament chưa bắt đầu
      if (tournament.status === 'pending' && participant.paid) {
        const entryFee = (tournament as any).entryFee || 0;
        await TransactionService.refund(participant.userId, tournament.id, entryFee);
      }
      return tx.participant.delete({ where: { id: participantId } });
    });
  }

  /**
   * Get participant's round history
   * @param participantId
   */
  static async getHistory(participantId: string) {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        user: true,
        roundOutcomes: {
          include: {
            round: {
              include: {
                phase: true
              }
            }
          },
          orderBy: {
            round: {
              phase: {
                phaseNumber: 'asc'
              }
            }
          }
        }
      }
    });

    if (!participant) {
      throw new ApiError(404, 'Participant not found');
    }

    // Further sorting of rounds within the same phase can be done here if needed
    // The query above sorts by phase number, but not round number within the phase.
    // Let's sort it in the application layer.
    participant.roundOutcomes.sort((a, b) => {
        if (a.round.phase.phaseNumber !== b.round.phase.phaseNumber) {
            return a.round.phase.phaseNumber - b.round.phase.phaseNumber;
        }
        return a.round.roundNumber - b.round.roundNumber;
    });


    return participant;
  }
} 