import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { SePayPgClient } from 'sepay-pg-node';
import logger from '../utils/logger';
import ParticipantPaymentService from '../services/ParticipantPaymentService';

export default class SepayPgController {
  /**
   * GET /payments/sepay-pg/:transactionId
   * Renders an auto-submitting form that redirects the user to Sepay PG checkout.
   */
  static async renderCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { tournament: true }
      });

      if (!transaction || !transaction.tournament) {
        return res.status(404).send('Transaction or tournament not found');
      }

      if (transaction.status !== 'pending') {
        return res.status(400).send('Transaction is not pending');
      }

      // Fetch the partner's sepay config
      const partnerId = transaction.tournament.organizerId;
      const partnerSub = await prisma.partnerSubscription.findUnique({
        where: { userId: partnerId }
      });

      if (!partnerSub || !partnerSub.sepayApiKey) {
        return res.status(400).send('Partner has not configured Sepay Integration');
      }

      let sepayConfig: any = {};
      try {
        if (partnerSub.sepayApiKey.startsWith('{')) {
          sepayConfig = JSON.parse(partnerSub.sepayApiKey);
        } else {
          throw new Error('Not a valid JSON Sepay Config');
        }
      } catch (e) {
        logger.error(`[SepayPG] Invalid config format for partner ${partnerId}`);
        return res.status(400).send('Partner Sepay configuration is incomplete or invalid.');
      }

      const client = new SePayPgClient({
        env: sepayConfig.env === 'live' || sepayConfig.env === 'production' ? 'production' : 'sandbox',
        merchant_id: sepayConfig.merchantId,
        secret_key: sepayConfig.secretKey
      });

      const checkoutURL = client.checkout.initCheckoutUrl();

      // Read amountVnd directly from the transaction record.
      // This is the exact entryFee stored at registration time — never use a hardcoded default.
      const amountVnd = Math.round(transaction.amount);
      if (!amountVnd || amountVnd <= 0) {
        logger.error(`[SepayPG] Transaction ${transactionId} has invalid amount: ${transaction.amount}`);
        return res.status(400).send('Transaction amount is invalid. Please contact support.');
      }

      const feUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const apiUrl = process.env.API_URL || 'http://localhost:4000/api';
      const isProduction = !feUrl.includes('localhost');

      const successUrl = `${feUrl}/tournaments/${transaction.tournamentId}?paymentSuccess=true`;
      const cancelUrl = `${feUrl}/tournaments/${transaction.tournamentId}/register?paymentCancelled=true`;
      const errorUrl = `${feUrl}/tournaments/${transaction.tournamentId}/register?paymentError=true`;

      const checkoutFormfields = client.checkout.initOneTimePaymentFields({
        payment_method: 'BANK_TRANSFER',
        order_invoice_number: transaction.externalRefId || transaction.id,
        order_amount: amountVnd,
        currency: 'VND',
        order_description: transaction.reviewNotes?.substring(0, 50) || `Tournament Entry - ${transaction.tournamentId}`,
        success_url: successUrl,
        error_url: errorUrl,
        cancel_url: cancelUrl,
      });

      // On production, inject notify_url for server-to-server IPN
      const notifyUrlField = isProduction
        ? `<input type="hidden" name="notify_url" value="${apiUrl}/payments/sepay-pg/ipn/${transactionId}" />`
        : '';

      console.log(`[SepayPG] Checkout → env=${isProduction ? 'production' : 'dev'}, merchant=${sepayConfig.merchantId}, amount=${amountVnd}, invoice=${transaction.externalRefId}`);

      // Render auto-submitting form
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting to Payment Gateway...</title>
            <style>
              body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f7f9fc; }
              .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;}
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="loader"></div>
            <p>Redirecting you to the secure payment gateway...</p>
            <form id="sepay-form" action="${checkoutURL}" method="POST" style="display: none;">
              ${Object.keys(checkoutFormfields).map(field => `
                <input type="hidden" name="${field}" value="${(checkoutFormfields as any)[field]}" />
              `).join('')}
              ${notifyUrlField}
            </form>
            <script>
              document.getElementById('sepay-form').submit();
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      logger.error(`[SepayPG] Error rendering checkout:`, err);
      res.status(500).send('Internal Server Error');
    }
  }

  /**
   * POST /payments/sepay-pg/ipn/:transactionId
   * Server-to-server IPN from Sepay (production) or frontend auto-confirm (local dev).
   */
  static async handleIpn(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;

      logger.info(`[SepayPG IPN] Received for transaction ${transactionId}. Payload: ${JSON.stringify(req.body)}`);

      const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status === 'paid' || transaction.status === 'success') {
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      // ── CRITICAL: Validate amount from IPN payload ────────────────────────
      // Sepay PG IPN should provide the actual amount paid.
      // Common field names: amount, order_amount, paid_amount — check all.
      const ipnAmount = Number(
        req.body?.amount ?? req.body?.order_amount ?? req.body?.paid_amount ?? 0
      );
      const requiredAmount = Math.round(transaction.amount);
      const TOLERANCE_VND = 2000;

      if (ipnAmount > 0 && ipnAmount < requiredAmount - TOLERANCE_VND) {
        logger.warn(
          `[SepayPG IPN] UNDERPAID for transaction ${transactionId}: received ${ipnAmount} VND, required ${requiredAmount} VND. Marking underpaid.`
        );
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'underpaid',
            reviewNotes: `Underpaid via PG IPN: received ${ipnAmount} VND, required ${requiredAmount} VND.`,
          },
        });
        return res.status(200).json({ success: false, message: 'Underpaid — participant not confirmed.' });
      }
      // ─────────────────────────────────────────────────────────────────────

      const providerEventId = `sepaypg_ipn_${transactionId}_${Date.now()}`;
      await ParticipantPaymentService.confirmEntryFeePayment(transaction.id, providerEventId);

      logger.info(`[SepayPG IPN] Successfully confirmed payment for transaction ${transactionId}`);
      return res.status(200).json({ success: true });
    } catch (err: any) {
      logger.error(`[SepayPG IPN] Error: ${err.message}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /payments/confirm-pending/:tournamentId
   * Called by frontend when user returns from Sepay with ?paymentSuccess=true.
   * Finds the user's pending entry_fee transaction and confirms it.
   * 
   * In production: The Sepay PG IPN should have already confirmed the payment 
   * via handleIpn. This endpoint serves as a fallback — it checks the current 
   * transaction status and confirms if still pending. This handles the case 
   * where the IPN might have been delayed or the user's browser redirect 
   * arrived before the IPN.
   */
  static async confirmPendingPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tournamentId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      console.log(`[SepayPG ConfirmPending] userId=${userId}, tournamentId=${tournamentId}`);

      // Find the user's pending OR latest entry_fee transaction for this tournament
      const transaction = await prisma.transaction.findFirst({
        where: {
          userId,
          tournamentId,
          type: 'entry_fee',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!transaction) {
        return res.status(404).json({ error: 'No payment found' });
      }

      // If already confirmed by IPN, just return success
      if (transaction.status === 'paid' || transaction.status === 'success') {
        // Also ensure participant is marked paid
        if (transaction.refId) {
          const participant = await prisma.participant.findUnique({ where: { id: transaction.refId } });
          if (participant && !participant.paid) {
            await prisma.participant.update({
              where: { id: transaction.refId },
              data: { paid: true, paymentStatus: 'paid' },
            });
          }
        }
        return res.status(200).json({ success: true, message: 'Already confirmed', status: transaction.status });
      }

      // If transaction is still pending, do NOT auto-confirm without payment proof.
      // The IPN from Sepay PG is the authoritative confirmation with amount verification.
      // Auto-confirming here would bypass amount validation and allow underpayment.
      if (transaction.status === 'pending') {
        logger.info(`[SepayPG ConfirmPending] Transaction ${transaction.id} still pending — waiting for IPN from Sepay.`);
        return res.status(202).json({
          success: false,
          status: 'pending',
          message: 'Hệ thống đang chờ xác nhận từ cổng thanh toán. Vui lòng đợi trong giây lát để hệ thống cập nhật tự động.',
        });
      }

      // Transaction is in another state (failed, expired, etc.)
      return res.status(400).json({ 
        error: `Transaction is in status: ${transaction.status}`,
        message: 'Giao dịch không thể xác nhận. Vui lòng liên hệ hỗ trợ.' 
      });
    } catch (err: any) {
      logger.error(`[SepayPG ConfirmPending] Error: ${err.message}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
