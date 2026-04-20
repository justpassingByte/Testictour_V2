import { Request, Response } from 'express';
import asyncHandler from '../lib/asyncHandler';
import logger from '../utils/logger';
import SepayService from '../services/SepayService';

const SepayWebhookController = {
  /**
   * Handle incoming POST from Sepay
   * URL format configured on Sepay side: https://our-api.com/webhook/sepay/:partnerId
   */
  handleWebhook: asyncHandler(async (req: Request, res: Response) => {
    const { partnerId } = req.params;
    const authHeader = req.headers['authorization'];
    // Convention: Bearer <API_KEY> or custom header
    const token = authHeader?.split(' ')[1] || req.headers['x-sepay-token'] as string;

    try {
      if (!token) {
        return res.status(401).json({ error: 'Missing token' });
      }

      await SepayService.validateWebhookToken(token, partnerId);
      
      const payload = req.body;
      await SepayService.processIncomingTransaction(partnerId, payload);
      
      return res.status(200).json({ success: true });
    } catch (err: any) {
      logger.error(`[SepayWebhook] Error processing webhook for ${partnerId}: ${err.message}`);
      return res.status(400).json({ error: err.message });
    }
  }),
};

export default SepayWebhookController;
