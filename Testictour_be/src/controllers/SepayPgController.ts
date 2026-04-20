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

      // Retrieve amountVnd
      let amountVnd = 10000;
      if (transaction.reviewNotes && transaction.reviewNotes.includes('Exact pay:')) {
         const match = transaction.reviewNotes.match(/Exact pay:\s*(\d+)/i);
         if (match && match[1]) {
             amountVnd = parseInt(match[1], 10);
         }
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

      logger.info(`[SepayPG IPN] Received for transaction ${transactionId}`);

      const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status === 'paid' || transaction.status === 'success') {
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

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
   * Works on localhost without needing Sepay IPN.
   */
  static async confirmPendingPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tournamentId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      console.log(`[SepayPG ConfirmPending] userId=${userId}, tournamentId=${tournamentId}`);

      // Find the user's pending entry_fee transaction for this tournament
      const transaction = await prisma.transaction.findFirst({
        where: {
          userId,
          tournamentId,
          type: 'entry_fee',
          status: 'pending',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!transaction) {
        return res.status(404).json({ error: 'No pending payment found' });
      }

      // Already confirmed
      if (transaction.status === 'paid' || transaction.status === 'success') {
        return res.status(200).json({ success: true, message: 'Already confirmed' });
      }

      const providerEventId = `sepaypg_confirm_${transaction.id}_${Date.now()}`;
      await ParticipantPaymentService.confirmEntryFeePayment(transaction.id, providerEventId);

      console.log(`[SepayPG ConfirmPending] Confirmed transaction ${transaction.id} for user ${userId}`);
      return res.status(200).json({ success: true, transactionId: transaction.id });
    } catch (err: any) {
      logger.error(`[SepayPG ConfirmPending] Error: ${err.message}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
