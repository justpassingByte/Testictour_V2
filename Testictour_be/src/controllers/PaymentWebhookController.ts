import { Request, Response } from 'express';
import asyncHandler from '../lib/asyncHandler';
import logger from '../utils/logger';
import EscrowService from '../services/EscrowService';

import StripeService from '../services/StripeService';
import MomoService from '../services/MomoService';
import SubscriptionService from '../services/SubscriptionService';

const PaymentWebhookController = {
  handleWebhook: asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    logger.info(`[Webhook] Received event from provider: ${provider}`);

    try {
      if (provider === 'stripe') {
        const signature = req.headers['stripe-signature'] as string;
        if (!signature) throw new Error('Missing stripe-signature header');
        
        // Since we configured express.raw mapped to this route, req.body is already a Buffer.
        const rawBody = Buffer.isBuffer(req.body) ? req.body : (req as any).rawBody || JSON.stringify(req.body);
        const event = await StripeService.validateWebhookSignature(rawBody, signature);
        
        if (event.type === 'checkout.session.completed') {
            const sessionData = event.data.object as any;
            const metadata = sessionData.metadata || {};
            
            if (metadata.paymentType === 'escrow_funding') {
                await EscrowService.processWebhook('stripe', {
                  providerEventId: event.id,
                  transactionReference: metadata.transactionId,
                  eventType: 'funding.succeeded',
                });
            } else if (metadata.paymentType === 'subscription_upgrade') {
                await SubscriptionService.completeUpgrade({
                  partnerId: metadata.partnerId,
                  transactionId: metadata.transactionId, // Needs to be added to metadata when creating
                  plan: metadata.plan,
                  providerEventId: event.id,
                });
            }
        }
        return res.status(200).json({ received: true });
      } 
      
      else if (provider === 'momo') {
        // MoMo POSTs JSON directly, no raw body needed
        const isValid = await MomoService.validateWebhookSignature(req.body);
        if (!isValid) throw new Error('Invalid MoMo signature');
        
        const resultCode = req.body.resultCode;
        const extraDataRaw = req.body.extraData;
        const transId = req.body.transId?.toString();
        
        // Decode metadata
        let metadata: any = {};
        if (extraDataRaw) {
           metadata = JSON.parse(Buffer.from(extraDataRaw, 'base64').toString('utf-8'));
        }

        // resultCode 0 means success in MoMo
        if (resultCode === 0 && metadata) {
           if (metadata.paymentType === 'escrow_funding') {
                await EscrowService.processWebhook('momo', {
                  providerEventId: transId,
                  transactionReference: metadata.transactionId,
                  eventType: 'funding.succeeded',
                });
           } else if (metadata.paymentType === 'subscription_upgrade') {
                await SubscriptionService.completeUpgrade({
                  partnerId: metadata.partnerId,
                  transactionId: metadata.transactionId,
                  plan: metadata.plan,
                  providerEventId: transId,
                });
           }
        }
        // MoMo expects 204 No Content or 200 OK
        return res.status(200).json({ received: true });
      }
      
      else {
        logger.warn(`[Webhook] Unknown provider webhook received: ${provider}`);
        return res.status(400).json({ error: 'Unknown provider' });
      }
      
    } catch (err: any) {
       logger.error(`[Webhook] Error processing ${provider} webhook: ${err.message}`);
       return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
  }),
};

export default PaymentWebhookController;
