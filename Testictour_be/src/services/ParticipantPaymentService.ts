import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';

/**
 * Handles post-payment confirmation for tournament entry fees.
 * Called by the payment webhook (Stripe / MoMo) after a successful checkout.
 */
export default class ParticipantPaymentService {
  /**
   * Confirms an entry fee payment:
   *  1. Marks the Transaction as success
   *  2. Marks the Participant as paid
   *  3. Emits real-time update to frontends
   *
   * Idempotent — safe to call multiple times with the same transactionId.
   */
  static async confirmEntryFeePayment(transactionId: string, providerEventId: string) {
    logger.info(`[EntryFee] Confirming payment for transaction ${transactionId} (event: ${providerEventId})`);

    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      throw new ApiError(404, `Entry fee transaction ${transactionId} not found.`);
    }

    const participantId = transaction.refId; // set in ParticipantService.join
    if (!participantId) {
      throw new ApiError(400, `Transaction ${transactionId} has no linked participantId (refId).`);
    }

    const participant = await prisma.participant.findUnique({ where: { id: participantId } });
    
    // Idempotency guard — already processed
    if (participant && participant.paid) {
      logger.info(`[EntryFee] Participant ${participantId} already marked paid via transaction ${transactionId}. Skipping.`);
      return { alreadyConfirmed: true };
    }

    if (transaction.type !== 'entry_fee') {
      throw new ApiError(400, `Transaction ${transactionId} is not an entry_fee transaction.`);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark transaction as success (or keep as paid/success)
      if (transaction.status !== 'success' && transaction.status !== 'paid') {
          await tx.transaction.update({
            where: { id: transactionId },
            data: {
              status: 'success',
              providerEventId,
              reviewedAt: new Date(),
            },
          });
      }

      // 2. Mark participant as paid
      await tx.participant.update({
        where: { id: participantId },
        data: { paid: true, paymentStatus: 'paid' },
      });
    });

    // 3. Real-time update so the admin dashboard reflects the new paid status
    const io = (global as any).io;
    if (io && transaction.tournamentId) {
      io.to(`tournament:${transaction.tournamentId}`).emit('tournament_update', {
        type: 'participant_paid',
        participantId,
        transactionId,
      });
    }

    logger.info(`[EntryFee] Participant ${participantId} marked as paid via transaction ${transactionId}.`);
    return { participantId, transactionId, status: 'confirmed' };
  }

  /**
   * Cancels an unpaid registration (called on payment cancel/timeout).
   * Removes the participant slot and marks the transaction as failed.
   */
  static async cancelEntryFeeRegistration(transactionId: string, reason: string = 'payment_cancelled') {
    logger.info(`[EntryFee] Cancelling registration for transaction ${transactionId}: ${reason}`);

    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.type !== 'entry_fee') return;
    if (transaction.status !== 'pending') return; // already processed

    const participantId = transaction.refId;
    if (!participantId) return;

    await prisma.$transaction(async (tx) => {
      // Mark transaction failed
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'failed', reviewNotes: reason },
      });

      // Remove participant (release reserved slot)
      const participant = await tx.participant.findUnique({ where: { id: participantId } });
      if (participant) {
        await tx.participant.delete({ where: { id: participantId } });
        await tx.tournament.update({
          where: { id: participant.tournamentId },
          data: { actualParticipantsCount: { decrement: 1 } },
        });
      }
    });

    logger.info(`[EntryFee] Registration cancelled for participant ${participantId}.`);
  }
}
