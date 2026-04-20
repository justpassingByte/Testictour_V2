import { Request, Response } from 'express';
import asyncHandler from '../lib/asyncHandler';
import WalletLedgerService from '../services/WalletLedgerService';
import SepayService from '../services/SepayService';
import { prisma } from '../services/prisma';

export const WalletController = {
  getLedger: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const ledger = await WalletLedgerService.getPartnerLedger(userId);
    return res.status(200).json(ledger);
  }),

  getWalletConfig: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const sub = await prisma.partnerSubscription.findUnique({
      where: { userId },
      select: { sepayApiKey: true, walletStatus: true, lastSyncAt: true, lastError: true, plan: true }
    });
    return res.status(200).json(sub || { plan: 'STARTER' });
  }),

  updateWalletConfig: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { sepayApiKey } = req.body;

    // Default to "CONNECTED" if they provided a key. 
    // In a real app we might verify by calling Sepay API, but here we just store the webhook token.
    const walletStatus = sepayApiKey ? 'CONNECTED' : 'UNCONNECTED';

    const updated = await prisma.partnerSubscription.upsert({
      where: { userId },
      update: { sepayApiKey, walletStatus, lastSyncAt: new Date(), lastError: null },
      create: { 
          userId, 
          sepayApiKey, 
          walletStatus,
          plan: 'STARTER' // fallback if they somehow didn't have a plan
      }
    });

    return res.status(200).json({
        sepayApiKey: updated.sepayApiKey,
        walletStatus: updated.walletStatus,
        lastSyncAt: updated.lastSyncAt,
    });
  }),
};

export default WalletController;
