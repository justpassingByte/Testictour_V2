import { prisma } from './prisma';
import ApiError from '../utils/ApiError';

export default class SettlementReportService {
  static async getTournamentReport(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        organizer: { select: { id: true, username: true, email: true } },
        escrow: true,
        _count: { select: { participants: true } },
      },
    });

    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    const transactions = await prisma.transaction.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' },
    });

    const sumAmounts = (type: string, statuses: string[] = ['success']) =>
      transactions
        .filter((transaction) => transaction.type === type && statuses.includes(transaction.status))
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const organizerFunding = sumAmounts('escrow_deposit');
    const organizerReturns = sumAmounts('organizer_return');
    const participantFees = sumAmounts('entry_fee');
    const refunds = sumAmounts('refund');
    const payouts = sumAmounts('payout');
    const pendingFunding = sumAmounts('escrow_deposit', ['pending']);
    const pendingPayouts = sumAmounts('payout', ['pending']);
    const failedTransactions = transactions.filter((transaction) => transaction.status === 'failed');
    const unresolvedTransactions = transactions.filter((transaction) => transaction.status === 'pending');

    const grossEntryPool = participantFees;
    const platformFeeRate = tournament.hostFeePercent || 0;
    const derivedPlatformFees = grossEntryPool * platformFeeRate;

    const outstandingIssues = [
      ...failedTransactions.map((transaction) => ({
        kind: 'failed_transaction',
        transactionId: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
      })),
      ...unresolvedTransactions.map((transaction) => ({
        kind: 'pending_transaction',
        transactionId: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
      })),
    ];

    const netPosition =
      organizerFunding +
      participantFees -
      organizerReturns -
      refunds -
      payouts -
      derivedPlatformFees;

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        organizer: tournament.organizer,
        registeredParticipants: tournament._count.participants,
        isCommunityMode: tournament.isCommunityMode,
        escrowStatus: tournament.escrowStatus,
        escrowRequiredAmount: tournament.escrowRequiredAmount,
        communityThresholdSnapshot: tournament.communityThresholdSnapshot,
      },
      escrow: tournament.escrow
        ? {
            id: tournament.escrow.id,
            status: tournament.escrow.status,
            requiredAmount: tournament.escrow.requiredAmount,
            fundedAmount: tournament.escrow.fundedAmount,
            releasedAmount: tournament.escrow.releasedAmount,
            reconciliationStatus: tournament.escrow.reconciliationStatus,
            latestWebhookEventId: tournament.escrow.latestWebhookEventId,
            lockedAt: tournament.escrow.lockedAt,
            releasedAt: tournament.escrow.releasedAt,
            cancelledAt: tournament.escrow.cancelledAt,
            disputedAt: tournament.escrow.disputedAt,
          }
        : null,
      summary: {
        organizerFunding,
        organizerReturns,
        participantFees,
        refunds,
        payouts,
        platformFees: derivedPlatformFees,
        pendingFunding,
        pendingPayouts,
        netPosition,
      },
      sections: {
        organizerFunding: transactions.filter((transaction) => transaction.type === 'escrow_deposit'),
        participantFees: transactions.filter((transaction) => transaction.type === 'entry_fee'),
        refunds: transactions.filter((transaction) => transaction.type === 'refund'),
        payouts: transactions.filter((transaction) => transaction.type === 'payout'),
        organizerReturns: transactions.filter((transaction) => transaction.type === 'organizer_return'),
      },
      outstandingIssues,
      generatedAt: new Date().toISOString(),
    };
  }
}
