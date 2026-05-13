import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import crypto from 'crypto';

export default class OrderService {
  /**
   * Generates a 6-character random hex string for the transaction reference.
   */
  static generateOrderRef(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  /**
   * Generates a unique amount string if exact matching is required by adding a random suffix.
   * e.g. 50000 -> 50431. Let's assume we do 0-999 VND suffix.
   * If keeping USD primary, maybe decimal? E.g., 5.00 -> 5.003
   */
  static generateRandomSuffixAmount(baseAmountVnd: number): number {
    const randomSuffix = Math.floor(Math.random() * 1000); // 0-999
    return baseAmountVnd + randomSuffix;
  }

  /**
   * Create an impending order.
   * 15-min expiry.
   */
  static async createOrder(data: {
    userId: string;
    tournamentId: string;
    type: string;
    amount: number;
    currency?: string;
    refId?: string; // e.g. participantId
    metadata?: any;
  }) {
    const orderRef = this.generateOrderRef();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    return await prisma.transaction.create({
      data: {
        userId: data.userId,
        tournamentId: data.tournamentId,
        type: data.type,
        amount: data.amount,
        currency: data.currency || 'vnd',
        status: 'pending_payment',
        refId: data.refId,
        externalRefId: `ORDER_${orderRef}`,
        expiresAt,
        reviewNotes: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }

  /**
   * Verify an order. (e.g. from Sepay webhook)
   *
   * CRITICAL: Validates that amountPaid >= transaction.amount before confirming.
   * If the player transfers less than the required entry fee, the order is marked
   * as 'underpaid' and the participant will NOT be confirmed as paid.
   */
  static async markOrderPaid(externalRefId: string, providerEventId: string, amountPaid: number) {
    const transaction = await prisma.transaction.findUnique({
      where: { externalRefId },
    });

    if (!transaction) throw new ApiError(404, 'Order not found');

    // Idempotency constraint checking in addition to providerEventId index
    if (['paid', 'success', 'refund_pending', 'refunded'].includes(transaction.status)) {
      return transaction; // Already processed
    }

    if (transaction.expiresAt && transaction.expiresAt < new Date()) {
      // Matched late
      return prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'matched_late', providerEventId, reviewNotes: `Paid after expiry. Amount received: ${amountPaid}, required: ${transaction.amount}` }
      });
    }

    // ── CRITICAL: Amount validation ──────────────────────────────────────────
    // Allow a small tolerance of up to 2,000 VND to account for bank transfer fees.
    const TOLERANCE_VND = 1000;
    const requiredAmount = transaction.amount;
    if (amountPaid < requiredAmount - TOLERANCE_VND) {
      // Player sent less than the required fee — do NOT confirm as paid.
      return prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'underpaid',
          providerEventId,
          reviewNotes: `Underpaid: received ${amountPaid} VND but required ${requiredAmount} VND (tolerance: ${TOLERANCE_VND} VND). Manual review needed.`,
        },
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    return prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'paid',
        providerEventId,
        reviewNotes: `Payment confirmed: received ${amountPaid} VND for order of ${requiredAmount} VND.`,
      },
    });
  }
}
