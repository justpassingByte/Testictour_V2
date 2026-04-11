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
        await TransactionService.entryFee(userId, tournamentId, entryFee, tx);
      }

      const participant = await tx.participant.create({ data: { tournamentId, userId, paid: entryFee > 0 } });

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
      // Only refund if tournament hasn't started
      if (tournament.status === 'pending' && participant.paid) {
        const entryFee = (tournament as any).entryFee || 0;
        await TransactionService.refund(participant.userId, tournament.id, entryFee);
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