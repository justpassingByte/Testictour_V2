import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import EmailService from './EmailService';
import logger from '../utils/logger';

/**
 * ReservePlayerService — handles lobby-level player management:
 * - Kick a player from a lobby (during ADMIN_INTERVENTION)
 * - Assign a reserve player to fill the vacant slot
 * - Notify reserve players via email + in-app notification
 */
export default class ReservePlayerService {

  /**
   * Kick a player from a lobby.
   * Only allowed during ADMIN_INTERVENTION or READY_CHECK states.
   * Creates a refund transaction if the player paid.
   */
  static async kickPlayer(lobbyId: string, targetUserId: string, adminId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const lobby = await tx.lobby.findUnique({
        where: { id: lobbyId },
        include: {
          round: {
            include: {
              phase: {
                include: { tournament: true }
              }
            }
          }
        }
      });

      if (!lobby) throw new ApiError(404, 'Lobby not found');

      // Only allow kick during intervention or readycheck states
      const allowedStates = ['ADMIN_INTERVENTION', 'READY_CHECK', 'WAITING', 'GRACE_PERIOD'];
      if (!allowedStates.includes(lobby.state)) {
        throw new ApiError(400, `Cannot kick player while lobby is in ${lobby.state} state`);
      }

      const participants = (lobby.participants as string[]) || [];
      if (!participants.includes(targetUserId)) {
        throw new ApiError(404, 'Player not found in this lobby');
      }

      // Remove player from lobby participants
      const updatedParticipants = participants.filter(id => id !== targetUserId);
      await tx.lobby.update({
        where: { id: lobbyId },
        data: { participants: updatedParticipants }
      });

      const tournament = lobby.round.phase.tournament;

      // Mark the participant as absent and eliminated
      const participant = await tx.participant.findFirst({
        where: { tournamentId: tournament.id, userId: targetUserId }
      });
      if (participant) {
        await tx.participant.update({
          where: { id: participant.id },
          data: { 
            isAbsent: true, 
            eliminated: true,
            paymentStatus: participant.paid ? 'forfeited' : participant.paymentStatus
          }
        });
        
        // Push In-App Notification to warn them about reputation
        const io = (global as any).io;
        if (io) {
          io.to(`user:${targetUserId}`).emit('admin_notification', {
            id: `absent_${participant.id}_${Date.now()}`,
            title: 'Reputation Warning: Tournament Absence',
            message: `You have been removed from the lobby in ${tournament.name} due to absence. Your account has been flagged and entry fee forfeited according to host policy.`,
            type: 'error',
            createdAt: new Date(),
          });
        }
      }

      // Check if reserve players are available and notify them
      const reservePlayers = await tx.participant.findMany({
        where: { tournamentId: tournament.id, isReserve: true },
        include: { user: { select: { id: true, username: true, email: true } } },
        orderBy: { joinedAt: 'asc' }
      });

      // Notify all reserve players about the empty slot
      if (reservePlayers.length > 0) {
        await ReservePlayerService.notifyReserves(
          reservePlayers,
          tournament,
          lobby,
          tx
        );
      }

      logger.info(`[Reserve] Admin ${adminId} kicked player ${targetUserId} from lobby ${lobbyId}. ${reservePlayers.length} reserves notified.`);

      return {
        success: true,
        message: `Player removed from lobby. ${reservePlayers.length} reserve players notified.`,
        updatedParticipants,
        reserveCount: reservePlayers.length
      };
    });
  }

  /**
   * Assign a reserve player to a lobby, replacing a vacant slot.
   * Also notifies the reserve player via email.
   */
  static async assignReserve(lobbyId: string, reserveUserId: string, adminId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const lobby = await tx.lobby.findUnique({
        where: { id: lobbyId },
        include: {
          round: {
            include: {
              phase: {
                include: { tournament: true }
              }
            }
          }
        }
      });

      if (!lobby) throw new ApiError(404, 'Lobby not found');

      const allowedStates = ['ADMIN_INTERVENTION', 'READY_CHECK', 'WAITING', 'GRACE_PERIOD'];
      if (!allowedStates.includes(lobby.state)) {
        throw new ApiError(400, `Cannot assign reserve while lobby is in ${lobby.state} state`);
      }

      const tournament = lobby.round.phase.tournament;

      // Verify the user is actually a reserve participant
      const reserveParticipant = await tx.participant.findFirst({
        where: { tournamentId: tournament.id, userId: reserveUserId, isReserve: true },
        include: { user: { select: { id: true, username: true, email: true, riotGameName: true } } }
      });

      if (!reserveParticipant) {
        throw new ApiError(404, 'Reserve player not found in this tournament');
      }

      const participants = (lobby.participants as string[]) || [];

      // Check lobby isn't already full
      const lobbySize = lobby.round.phase.lobbySize || 8;
      if (participants.length >= lobbySize) {
        throw new ApiError(400, 'Lobby is already full. Kick a player first.');
      }

      // Check player isn't already in this lobby
      if (participants.includes(reserveUserId)) {
        throw new ApiError(409, 'Player is already in this lobby');
      }

      // Add reserve player to lobby
      participants.push(reserveUserId);
      await tx.lobby.update({
        where: { id: lobbyId },
        data: { participants }
      });

      // Promote from reserve to main player
      await tx.participant.update({
        where: { id: reserveParticipant.id },
        data: { isReserve: false }
      });

      // Increment actualParticipantsCount since they're now a main player
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { actualParticipantsCount: { increment: 1 } }
      });

      // Send assigned notification via email
      if (reserveParticipant.user.email) {
        await EmailService.sendReserveAssigned({
          to: reserveParticipant.user.email,
          username: reserveParticipant.user.username,
          tournamentName: tournament.name,
          lobbyName: lobby.name,
        });
      }

      // Create in-app notification
      await tx.notification.create({
        data: {
          title: '🎮 You have been assigned to a lobby!',
          body: `You have been assigned to ${lobby.name} in ${tournament.name}. Please join immediately!`,
          targetType: `user:${reserveUserId}`,
          sentBy: adminId !== 'system' ? adminId : null,
        }
      });

      logger.info(`[Reserve] Admin ${adminId} assigned reserve player ${reserveUserId} to lobby ${lobbyId}.`);

      return {
        success: true,
        message: `Reserve player ${reserveParticipant.user.username} assigned to ${lobby.name}`,
        participant: reserveParticipant
      };
    });
  }

  /**
   * Notify all reserve players that a slot has opened up.
   * Sends both email + in-app notifications.
   */
  private static async notifyReserves(
    reservePlayers: any[],
    tournament: any,
    lobby: any,
    tx: Prisma.TransactionClient
  ) {
    for (const reserve of reservePlayers) {
      // In-app notification
      await tx.notification.create({
        data: {
          title: '⚡ A spot has opened up!',
          body: `A spot has opened in ${lobby.name} for tournament "${tournament.name}". An admin will assign you shortly if you are next in the queue.`,
          targetType: `user:${reserve.userId}`,
          sentBy: null,
        }
      });

      // Email notification
      if (reserve.user?.email) {
        // Fire and forget — don't block the transaction
        EmailService.sendReserveSlotAvailable({
          to: reserve.user.email,
          username: reserve.user.username,
          tournamentName: tournament.name,
          lobbyName: lobby.name,
        }).catch(err => {
          logger.error(`[Reserve] Failed to send email to ${reserve.user.email}: ${err.message}`);
        });
      }
    }

    logger.info(`[Reserve] Notified ${reservePlayers.length} reserve players about vacancy in lobby ${lobby.id}.`);
  }
}
