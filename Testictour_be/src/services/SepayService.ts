import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import OrderService from './OrderService';
import ParticipantPaymentService from './ParticipantPaymentService';
import EscrowService from './EscrowService';

export default class SepayService {
  /**
   * Validate Sepay webhook incoming payload.
   * Sepay webhooks don't always have rigid signatures, but we can validate against
   * the API key configured by the partner. Wait, Sepay webhooks usually send a webhook token in Headers.
   * The host configures the Sepay webhook URL to point to our system.
   */
  static async validateWebhookToken(reqToken: string, partnerId: string) {
    const partnerSub = await prisma.partnerSubscription.findUnique({
      where: { userId: partnerId }
    });

    if (!partnerSub || !partnerSub.sepayApiKey) {
      throw new ApiError(401, 'Invalid Sepay Webhook Token');
    }

    let validToken = partnerSub.sepayApiKey;
    if (validToken.startsWith('{')) {
      try {
        const parsed = JSON.parse(validToken);
        validToken = parsed.secretKey || parsed.sepayApiKey;
      } catch (e) {}
    }

    if (validToken !== reqToken) {
      throw new ApiError(401, 'Invalid Sepay Webhook Token');
    }
    return partnerSub;
  }

  /**
   * Process incoming Sepay payload.
   * Sepay Payload typically has:
   * gateway: string
   * transactionDate: string
   * amountIn: number
   * amountOut: number
   * transactionContent: string
   * referenceNumber: string (Bank ref)
   * id: number (Sepay ID)
   */
  static async processIncomingTransaction(partnerId: string, payload: any) {
    logger.info(`[Sepay] Received transaction ${payload.id} for partner ${partnerId}`);

    if (payload.amountIn <= 0) {
      logger.info(`[Sepay] Transaction ${payload.id} is outgoing or 0. Ignoring (Incoming only).`);
      return;
    }

    const providerEventId = `sepay_${payload.id}`;
    
    // Check dedup
    const existingTx = await prisma.transaction.findFirst({
      where: { providerEventId }
    });
    if (existingTx) {
      logger.info(`[Sepay] Transaction ${payload.id} already processed.`);
      return;
    }

    const content = (payload.transactionContent || '').toUpperCase();
    
    // Find matching order in database by searching for ORDER_ prefix in the transactionContent
    // Realistically, the user types the Transfer Note (externalRefId) e.g., "ORDER_ABC123"
    const matchedOrder = await prisma.transaction.findFirst({
        // we'll look for pending transactions where externalRefId is included in transactionContent
        where: {
            tournament: {
                organizerId: partnerId
            },
            status: {
                in: ['pending', 'pending_payment']
            }
        }
    });
    
    // Filter the candidates in memory since SQL LIKE isn't perfectly straightforward via exact match if Prisma doesn't map easily
    let targetOrder = null;
    if (matchedOrder) {
        // Fallback or better query:
        targetOrder = await prisma.$queryRaw`SELECT * FROM "Transaction" t 
          WHERE t."tournamentId" IN (SELECT id FROM "Tournament" WHERE "organizerId" = ${partnerId}) 
          AND t.status IN ('pending', 'pending_payment') 
          AND ${content} LIKE '%' || t."externalRefId" || '%'
          LIMIT 1`;
    }
    
    // Note: Assuming `targetOrder` is an array from queryRaw
    const orderToProcess = Array.isArray(targetOrder) ? targetOrder[0] : null;

    if (!orderToProcess) {
        logger.warn(`[Sepay] Could not match transaction ${payload.id} to any pending order. Content: ${content}`);
        
        // Save as unresolved anomalous transaction
        await prisma.transaction.create({
            data: {
                userId: partnerId, // Assign to partner so they see it
                type: 'unknown_deposit',
                amount: payload.amountIn,
                currency: 'vnd',
                status: 'unresolved',
                providerEventId,
                externalRefId: payload.referenceNumber,
                reviewNotes: `Unmatched Sepay transfer: ${content}`,
            }
        });
        return;
    }

    logger.info(`[Sepay] Matched order ${orderToProcess.externalRefId} for amount ${payload.amountIn}`);

    // Update order via OrderService
    const updatedOrder = await OrderService.markOrderPaid(
        orderToProcess.externalRefId, 
        providerEventId, 
        payload.amountIn
    );

    // If order was an entry fee, trigger ParticipantPayment service
    if (updatedOrder.type === 'entry_fee' && updatedOrder.status === 'paid') {
        const participantId = updatedOrder.refId;
        if (participantId) {
            await ParticipantPaymentService.confirmEntryFeePayment(updatedOrder.id, providerEventId);
        }
    } else if (updatedOrder.type === 'escrow_deposit' && updatedOrder.status === 'paid') {
        await EscrowService.processWebhook('sepay', {
            providerEventId,
            transactionReference: updatedOrder.id,
            eventType: 'funding.succeeded',
        });
    }
  }

  static async updateWalletStatus(partnerId: string, status: string, error?: string) {
      await prisma.partnerSubscription.update({
          where: { userId: partnerId },
          data: {
              walletStatus: status,
              lastSyncAt: new Date(),
              lastError: error || null
          }
      });
  }
}
