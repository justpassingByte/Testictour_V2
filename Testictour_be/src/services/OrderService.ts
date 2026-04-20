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
        currency: data.currency || 'usd',
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
            data: { status: 'matched_late', providerEventId, reviewNotes: 'Paid after expiry' }
        });
    }

    return prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'paid',
        providerEventId,
      },
    });
  }
}
