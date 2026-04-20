import { prisma } from './prisma';

export default class WalletLedgerService {
  /**
   * Generates an aggregated ledger report for a specific partner.
   * Tracks incoming (entry fees, escrow deposits),
   * outgoing (payouts, refunds), and calculates net Platform Fees.
   */
  static async getPartnerLedger(partnerId: string) {
    // 1. Get all tournaments owned by this partner where transactions occurred
    const tournaments = await prisma.tournament.findMany({
      where: { organizerId: partnerId },
      include: {
        _count: {
          select: { participants: true },
        },
        escrow: true,
        organizer: {
          include: { partnerSubscription: true }
        }
      },
    });

    const tournamentIds = tournaments.map((t) => t.id);

    if (tournamentIds.length === 0) {
      return this._emptyLedger();
    }

    // 2. Fetch all completed transactions for these tournaments
    const transactions = await prisma.transaction.findMany({
      where: {
        tournamentId: { in: tournamentIds },
        status: { in: ['paid', 'success'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Aggregate totals
    let incomingPlayers = 0;
    let incomingSponsors = 0;
    let outgoingPayouts = 0;
    let outgoingRefunds = 0;
    let alreadyPaidPlatformFee = 0;

    for (const tx of transactions) {
      switch (tx.type) {
        case 'entry_fee':
          incomingPlayers += tx.amount;
          break;
        case 'escrow_deposit': // Assuming host/sponsor funding
          incomingSponsors += tx.amount;
          break;
        case 'payout':
          outgoingPayouts += tx.amount;
          if (tx.payoutDestination === 'SYSTEM_WALLET_PLATFORM') {
            alreadyPaidPlatformFee += tx.amount;
          }
          break;
        case 'refund':
        case 'organizer_return':
          outgoingRefunds += tx.amount;
          break;
      }
    }

    // 4. Calculate Platform Fee based on the full Escrow Gross Pool
    // This matches the logic from the Escrow Management UI
    let totalPlatformFee = 0;
    let totalHostFee = 0;
    
    // Fetch subscription plans to find their platform fee percents
    const plansInfo = await prisma.subscriptionPlanConfig.findMany();
    const planMap = new Map(plansInfo.map(p => [p.plan, p.platformFeePercent]));

    for (const t of tournaments) {
       // Only accrue pending platform fee debt for completed tournaments
       if (t.status !== 'COMPLETED') {
          continue;
       }

       const planName = t.organizer?.partnerSubscription?.plan || 'STARTER';
       const platformFeePercent = planMap.get(planName) ?? 0.05;
       
       let displayPool = 0;
       if (t.escrow) {
         displayPool = ['PRO', 'ENTERPRISE'].includes(planName) 
           ? t.escrow.requiredAmount 
           : Math.max(t.escrow.requiredAmount, t.escrow.fundedAmount);
       } else {
         // Fallback if no escrow created yet
         displayPool = t.escrowRequiredAmount || 0;
       }
       
       totalPlatformFee += displayPool * platformFeePercent;
       totalHostFee += displayPool * (t.hostFeePercent || 0);
    }

    // The currently "pending" or owed platform fee is the expected total minus what was already deducted in escrows
    const pendingPlatformFee = Math.max(0, totalPlatformFee - alreadyPaidPlatformFee);

    // Since transactions might just be the raw entry fee, the gross is incomingPlayers.
    // The net we "expect" the partner to hold locally (if they collect directly via Sepay)
    const netPartnerBalance = (incomingPlayers + incomingSponsors) - (outgoingPayouts + outgoingRefunds) - pendingPlatformFee;

    // Build ledger history items
    const history = transactions.map((tx) => ({
      id: tx.id,
      tournamentId: tx.tournamentId,
      type: tx.type,
      amount: tx.amount,
      createdAt: tx.createdAt,
      externalRefId: tx.externalRefId,
    }));

    return {
      totals: {
        incomingPlayers,
        incomingSponsors,
        outgoingPayouts,
        outgoingRefunds,
        totalPlatformFee: pendingPlatformFee,
        totalHostFee,
        netPartnerBalance,
      },
      history,
    };
  }

  private static _emptyLedger() {
    return {
      totals: {
        incomingPlayers: 0,
        incomingSponsors: 0,
        outgoingPayouts: 0,
        outgoingRefunds: 0,
        totalPlatformFee: 0,
        totalHostFee: 0,
        netPartnerBalance: 0,
      },
      history: [],
    };
  }
}
