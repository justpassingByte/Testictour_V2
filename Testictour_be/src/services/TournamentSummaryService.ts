import { PrismaClient } from '@prisma/client';
import { calculatePlayerPosition } from '../utils/matchUtils';

const prisma = new PrismaClient();

export default {
  /**
   * Cập nhật UserTournamentSummary cho tất cả người tham gia của một giải đấu
   * @param tournamentId ID của giải đấu cần cập nhật
   */
  async updateTournamentSummaries(tournamentId: string) {
    try {
      // Lấy thông tin giải đấu và người tham gia
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          participants: true
        }
      });

      if (!tournament) {
        console.error(`Tournament not found: ${tournamentId}`);
        return;
      }

      // Lấy tất cả participants
      const participants = tournament.participants;

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
        // Lấy điểm số của tất cả người tham gia
        const scores = new Map<string, number>();
        for (const p of participants) {
          scores.set(p.userId, p.scoreTotal);
        }

        // Tính toán vị trí
        const positions = calculatePlayerPosition(scores);
        const currentPosition = positions.get(participant.userId) || 0;

        if (existingSummary) {
          // Cập nhật summary hiện có
          await prisma.userTournamentSummary.update({
            where: {
              id: existingSummary.id
            },
            data: {
              points: participant.scoreTotal,
              placement: currentPosition,
              eliminated: participant.eliminated
            }
          });
        } else {
          // Tạo summary mới
          await prisma.userTournamentSummary.create({
            data: {
              userId: participant.userId,
              tournamentId,
              joinedAt: participant.joinedAt,
              placement: currentPosition,
              points: participant.scoreTotal,
              eliminated: participant.eliminated
            }
          });
        }
      }

      console.log(`Updated tournament summaries for tournament: ${tournament.name}`);
    } catch (error) {
      console.error('Failed to update tournament summaries:', error);
    }
  },

  /**
   * Cập nhật UserTournamentSummary khi một người tham gia mới hoặc rời khỏi giải đấu
   * @param participantId ID của người tham gia
   */
  async updateParticipantSummary(participantId: string) {
    try {
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: {
          tournament: true
        }
      });

      if (!participant) {
        console.error(`Participant not found: ${participantId}`);
        return;
      }

      // Kiểm tra xem đã có summary chưa
      const existingSummary = await prisma.userTournamentSummary.findUnique({
        where: {
          userId_tournamentId: {
            userId: participant.userId,
            tournamentId: participant.tournamentId
          }
        }
      });

      // Tính toán vị trí hiện tại
      const allParticipants = await prisma.participant.findMany({
        where: {
          tournamentId: participant.tournamentId
        }
      });

      const scores = new Map<string, number>();
      for (const p of allParticipants) {
        scores.set(p.userId, p.scoreTotal);
      }

      const positions = calculatePlayerPosition(scores);
      const currentPosition = positions.get(participant.userId) || 0;

      if (existingSummary) {
        // Cập nhật summary hiện có
        await prisma.userTournamentSummary.update({
          where: {
            id: existingSummary.id
          },
          data: {
            points: participant.scoreTotal,
            placement: currentPosition,
            eliminated: participant.eliminated
          }
        });
      } else {
        // Tạo summary mới
        await prisma.userTournamentSummary.create({
          data: {
            userId: participant.userId,
            tournamentId: participant.tournamentId,
            joinedAt: participant.joinedAt,
            placement: currentPosition,
            points: participant.scoreTotal,
            eliminated: participant.eliminated
          }
        });
      }
    } catch (error) {
      console.error('Failed to update participant summary:', error);
    }
  }
}; 