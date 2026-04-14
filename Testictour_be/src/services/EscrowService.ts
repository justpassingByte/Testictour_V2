import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { prisma } from './prisma';
import SettingsService from './SettingsService';
import StripeService from './StripeService';
import MomoService from './MomoService';
import CurrencyService from './CurrencyService';

type TransactionClient = Prisma.TransactionClient;

type EscrowComputationInput = {
  entryFee?: number;
  maxPlayers?: number;
  expectedParticipants?: number;
  hostFeePercent?: number;
};

type FundingRequest = {
  amount: number;
  method?: string;
  provider?: string;
  proofUrl?: string;
  note?: string;
  returnUrl?: string;
};

type PayoutRecipient = {
  participantId?: string;
  userId?: string;
  amount: number;
  payoutDestination?: string;
  isHostFee?: boolean;
};

type PayoutRequest = {
  recipients: PayoutRecipient[];
  resultVersion?: string;
  note?: string;
};

type PayoutApprovalRequest = {
  paymentMethod?: string;
  payoutDestination?: string;
  note?: string;
};

type ManualReviewRequest = {
  approved: boolean;
  proofUrl?: string;
  note?: string;
};

type EscrowSettingsUpdate = Partial<Awaited<ReturnType<typeof SettingsService.getEscrowSettings>>>;

const PRE_START_TOURNAMENT_STATUSES = new Set(['pending', 'UPCOMING', 'REGISTRATION']);
const PRESERVED_ESCROW_STATUSES = new Set(['locked', 'released', 'cancelled', 'disputed']);

export default class EscrowService {
  /**
   * Emit a real-time socket event so frontends update escrow status without F5.
   * Safe to call from inside or outside transactions (uses global io).
   */
  private static emitEscrowUpdate(tournamentId: string, extra?: Record<string, any>) {
    const io = (global as any).io;
    if (io && tournamentId) {
      io.to(`tournament:${tournamentId}`).emit('tournament_update', { type: 'escrow_updated', ...extra });
      logger.info(`EscrowService: emitted tournament_update (escrow_updated) for tournament ${tournamentId}`);
    }
  }

  static calculateGuaranteedPrizePool(input: EscrowComputationInput) {
    const entrantCount = Math.max(input.expectedParticipants || 0, input.maxPlayers || 0);
    const grossPool = entrantCount * (input.entryFee || 0);
    return Math.max(0, grossPool);
  }

  static buildInitialEscrowState(input: EscrowComputationInput, thresholdUsd: number) {
    const projectedPrizePool = this.calculateGuaranteedPrizePool(input);
    const isCommunityMode = projectedPrizePool < thresholdUsd;
    const requiredAmount = isCommunityMode ? 0 : projectedPrizePool;

    return {
      isCommunityMode,
      escrowRequiredAmount: requiredAmount,
      communityThresholdSnapshot: thresholdUsd,
      escrowStatus: 'not_funded',
      escrow: {
        requiredAmount,
        fundedAmount: 0,
        releasedAmount: 0,
        status: 'not_funded',
        reconciliationStatus: 'pending',
      },
    };
  }

  static async getEscrowSettings() {
    return SettingsService.getEscrowSettings();
  }

  static async getEscrowSettingsPayload() {
    const settings = await SettingsService.getEscrowSettings();
    return { settings };
  }

  static async updateEscrowSettings(values: EscrowSettingsUpdate, updatedBy?: string) {
    const settings = await SettingsService.updateEscrowSettings(values, updatedBy);
    return { settings };
  }

  static async recalculateTournamentEscrow(
    tournamentId: string,
    overrides: EscrowComputationInput,
    tx?: TransactionClient,
  ) {
    const db = tx || prisma;
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      include: { escrow: true },
    });

    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    const relatedTransactions = await db.transaction.count({
      where: {
        tournamentId,
        type: { in: ['escrow_deposit', 'payout', 'organizer_return'] },
      },
    });

    if (relatedTransactions > 0 || (tournament.escrow && PRESERVED_ESCROW_STATUSES.has(tournament.escrow.status))) {
      throw new ApiError(400, 'Escrow-backed tournaments cannot change financial structure after escrow activity starts.');
    }

    const settings = await SettingsService.getEscrowSettings();
    const nextState = this.buildInitialEscrowState(
      {
        entryFee: overrides.entryFee ?? tournament.entryFee,
        maxPlayers: overrides.maxPlayers ?? tournament.maxPlayers,
        expectedParticipants: overrides.expectedParticipants ?? tournament.expectedParticipants,
        hostFeePercent: overrides.hostFeePercent ?? tournament.hostFeePercent,
      },
      settings.escrowCommunityThresholdUsd,
    );

    await db.tournament.update({
      where: { id: tournamentId },
      data: {
        isCommunityMode: nextState.isCommunityMode,
        escrowStatus: nextState.escrowStatus,
        escrowRequiredAmount: nextState.escrowRequiredAmount,
        communityThresholdSnapshot: nextState.communityThresholdSnapshot,
      },
    });

    if (tournament.escrow) {
      await db.escrow.update({
        where: { tournamentId },
        data: {
          requiredAmount: nextState.escrowRequiredAmount,
          fundedAmount: 0,
          releasedAmount: 0,
          status: nextState.escrowStatus,
          reconciliationStatus: 'pending',
          lockedAt: null,
          releasedAt: null,
          cancelledAt: null,
          disputedAt: null,
          cancelReason: null,
          latestWebhookEventId: null,
        },
      });
    } else {
      await db.escrow.create({
        data: {
          tournamentId,
          requiredAmount: nextState.escrowRequiredAmount,
          fundedAmount: 0,
          releasedAmount: 0,
          status: nextState.escrowStatus,
          reconciliationStatus: 'pending',
        },
      });
    }

    return db.tournament.findUnique({
      where: { id: tournamentId },
      include: { escrow: true },
    });
  }

  private static async getTournamentForEscrow(tournamentId: string, db: TransactionClient | typeof prisma = prisma) {
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        escrow: true,
        organizer: { select: { id: true, username: true, email: true } },
      },
    });

    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (!tournament.escrow) {
      throw new ApiError(400, 'Tournament escrow has not been initialized');
    }

    // After the null-check above TypeScript infers escrow as non-null,
    // but the optional relation type leaks through the include type.
    // Cast to make downstream usage clean.
    return tournament as typeof tournament & { escrow: NonNullable<typeof tournament.escrow> };
  }

  private static async sumTransactionAmounts(
    db: TransactionClient | typeof prisma,
    where: Prisma.TransactionWhereInput,
  ) {
    const aggregate = await db.transaction.aggregate({
      where,
      _sum: { amount: true },
    });

    return aggregate._sum.amount || 0;
  }

  private static async syncEscrowSnapshot(
    escrowId: string,
    db: TransactionClient | typeof prisma = prisma,
    extraData?: Partial<{
      latestWebhookEventId: string | null;
      reconciliationStatus: string;
      status: string;
      releasedAt: Date | null;
      lockedAt: Date | null;
      disputedAt: Date | null;
      cancelledAt: Date | null;
      cancelReason: string | null;
      lastReviewedById: string | null;
      lastReviewedAt: Date | null;
    }>,
  ) {
    const escrow = await db.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      throw new ApiError(404, 'Escrow not found');
    }

    const [successfulFunding, successfulReturns, successfulPayouts] = await Promise.all([
      this.sumTransactionAmounts(db, { escrowId, type: 'escrow_deposit', status: 'success' }),
      this.sumTransactionAmounts(db, { escrowId, type: 'organizer_return', status: 'success' }),
      this.sumTransactionAmounts(db, { escrowId, type: 'payout', status: 'success' }),
    ]);

    const fundedAmount = successfulFunding - successfulReturns;
    const releasedAmount = successfulPayouts;

    let nextStatus = extraData?.status ?? escrow.status;
    if (!PRESERVED_ESCROW_STATUSES.has(nextStatus)) {
      if (fundedAmount <= 0) {
        nextStatus = 'not_funded';
      } else if (fundedAmount < escrow.requiredAmount) {
        nextStatus = 'partially_funded';
      } else {
        nextStatus = 'funded';
      }
    }

    return db.escrow.update({
      where: { id: escrowId },
      data: {
        fundedAmount,
        releasedAmount,
        status: nextStatus,
        latestWebhookEventId: extraData?.latestWebhookEventId ?? escrow.latestWebhookEventId,
        reconciliationStatus: extraData?.reconciliationStatus ?? escrow.reconciliationStatus,
        releasedAt: extraData?.releasedAt ?? escrow.releasedAt,
        lockedAt: extraData?.lockedAt ?? escrow.lockedAt,
        disputedAt: extraData?.disputedAt ?? escrow.disputedAt,
        cancelledAt: extraData?.cancelledAt ?? escrow.cancelledAt,
        cancelReason: extraData?.cancelReason ?? escrow.cancelReason,
        lastReviewedById: extraData?.lastReviewedById ?? escrow.lastReviewedById,
        lastReviewedAt: extraData?.lastReviewedAt ?? escrow.lastReviewedAt,
      },
    });
  }

  static async assertTournamentCanStart(tournamentId: string, tx?: TransactionClient) {
    const db = tx || prisma;
    const tournament = await this.getTournamentForEscrow(tournamentId, db);

    if (tournament.isCommunityMode) {
      return tournament;
    }

    if (tournament.escrow.status === 'locked' && tournament.escrow.fundedAmount >= tournament.escrow.requiredAmount) {
      return tournament;
    }

    if (tournament.escrow.status !== 'funded' || tournament.escrow.fundedAmount < tournament.escrow.requiredAmount) {
      throw new ApiError(400, 'Escrow-backed tournaments must be fully funded before they can start.');
    }

    const lockedEscrow = await this.syncEscrowSnapshot(tournament.escrow.id, db, {
      status: 'locked',
      lockedAt: tournament.escrow.lockedAt || new Date(),
    });

    await db.tournament.update({
      where: { id: tournamentId },
      data: { escrowStatus: lockedEscrow.status },
    });

    return tournament;
  }

  static async markTournamentCancelled(tournamentId: string, reason: string, tx?: TransactionClient) {
    const db = tx || prisma;
    const tournament = await this.getTournamentForEscrow(tournamentId, db);

    if (tournament.escrow.status === 'locked' || tournament.escrow.status === 'released') {
      throw new ApiError(400, 'Locked or released escrows must move into dispute resolution instead of cancellation.');
    }

    const updated = await this.syncEscrowSnapshot(tournament.escrow.id, db, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason,
      reconciliationStatus: 'success',
    });

    await db.tournament.update({
      where: { id: tournamentId },
      data: { escrowStatus: updated.status, status: 'CANCELLED' },
    });

    // Real-time push to frontends
    this.emitEscrowUpdate(tournamentId, { escrowStatus: updated.status, tournamentStatus: 'CANCELLED' });

    return updated;
  }

  static async submitFunding(tournamentId: string, actorId: string, request: FundingRequest) {
    const settings = await SettingsService.getEscrowSettings();
    const amount = Number(request.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'Funding amount must be greater than zero.');
    }

    return prisma.$transaction(async (tx) => {
      const tournament = await this.getTournamentForEscrow(tournamentId, tx);
      if (tournament.isCommunityMode) {
        throw new ApiError(400, 'Community mode tournaments do not require organizer escrow funding.');
      }

      const paymentMethod = request.method || settings.escrowDefaultProvider;
      if (paymentMethod === 'manual_proof' && !settings.escrowManualProofEnabled) {
        throw new ApiError(400, 'Manual proof review is disabled for escrow funding.');
      }

      const transaction = await tx.transaction.create({
        data: {
          userId: actorId,
          tournamentId: tournament.id,
          escrowId: tournament.escrow.id,
          type: 'escrow_deposit',
          amount,
          currency: 'usd',
          status: 'pending',
          refId: tournament.id,
          proofUrl: request.proofUrl,
          reviewNotes: request.note,
          externalRefId: `funding_${tournament.id}_${crypto.randomBytes(8).toString('hex')}`,
          paymentMethod,
        },
      });

      const escrow = await this.syncEscrowSnapshot(tournament.escrow.id, tx, {
        reconciliationStatus: 'pending',
        lastReviewedById: null,
        lastReviewedAt: null,
      });

      await tx.tournament.update({
        where: { id: tournament.id },
        data: { escrowStatus: escrow.status },
      });

      let checkoutUrl = '';
      const serverUrl = process.env.API_URL || 'http://localhost:3001/api/v1';
      const actualProvider = request.provider || settings.escrowDefaultProvider;
      
      const successUrl = request.returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/partner/tournaments/${tournament.id}?escrowFunded=true`;
      const cancelUrl = request.returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/partner/tournaments/${tournament.id}?escrowCanceled=true`;

      if (actualProvider === 'stripe') {
         checkoutUrl = await StripeService.createEscrowFundingCheckout({
             tournamentId: tournament.id,
             escrowId: tournament.escrow.id,
             transactionId: transaction.id,
             amountUsd: amount,
             successUrl,
             cancelUrl
         });
      } else if (actualProvider === 'momo') {
         const notifyUrl = `${serverUrl}/webhooks/payments/momo`;
         const usdToVndRate = await CurrencyService.getUsdToVndRate();
         const amountVnd = amount * usdToVndRate; 
         checkoutUrl = await MomoService.createEscrowFundingPayment({
             tournamentId: tournament.id,
             transactionId: transaction.id,
             amountVnd,
             returnUrl: successUrl,
             notifyUrl
         });
      }

      return {
        escrow,
        transaction,
        paymentIntent: {
          provider: actualProvider,
          method: paymentMethod,
          reference: transaction.externalRefId as string,
          status: transaction.status,
          checkoutUrl,
        },
      };
    });
  }

  private static buildProviderEventId(prefix: string, transactionId: string) {
    return `${prefix}_${transactionId}_${Date.now()}`;
  }

  private static normalizeSignature(signature: string) {
    return signature.replace(/^sha256=/, '');
  }

  static validateWebhookSignature(payload: unknown, providedSignature?: string, secret?: string) {
    if (!secret) {
      throw new ApiError(500, 'Webhook secret is not configured. Cannot validate webhook signature.');
    }

    if (!providedSignature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(this.normalizeSignature(providedSignature)),
    );
  }

  private static async markFundingTransactionSuccessful(
    transactionId: string,
    db: TransactionClient | typeof prisma,
    updateData: Prisma.TransactionUpdateInput,
  ) {
    const transaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'success',
        ...updateData,
      },
    });

    if (!transaction.escrowId || !transaction.tournamentId) {
      throw new ApiError(400, 'Funding transaction is missing escrow context.');
    }

    const escrow = await this.syncEscrowSnapshot(transaction.escrowId, db, {
      latestWebhookEventId: (updateData.providerEventId as string) || transaction.providerEventId,
      reconciliationStatus: 'success',
      lastReviewedAt: new Date(),
    });

    await db.tournament.update({
      where: { id: transaction.tournamentId },
      data: { escrowStatus: escrow.status },
    });

    // Real-time push to frontends
    this.emitEscrowUpdate(transaction.tournamentId, { escrowStatus: escrow.status });

    return { transaction, escrow };
  }

  private static async markPayoutTransactionSuccessful(
    transactionId: string,
    db: TransactionClient | typeof prisma,
    updateData: Prisma.TransactionUpdateInput,
  ) {
    const transaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'success',
        ...updateData,
      },
    });

    if (transaction.refId) {
      await db.reward.update({
        where: { id: transaction.refId },
        data: { status: 'completed', sentAt: new Date() },
      });

      const reward = await db.reward.findUnique({ where: { id: transaction.refId } });
      if (reward) {
        await db.participant.update({
          where: { id: reward.participantId },
          data: { rewarded: true, paymentStatus: 'paid' },
        });
      }
    }

    if (!transaction.escrowId || !transaction.tournamentId) {
      throw new ApiError(400, 'Payout transaction is missing escrow context.');
    }

    const escrow = await this.syncEscrowSnapshot(transaction.escrowId, db, {
      latestWebhookEventId: (updateData.providerEventId as string) || transaction.providerEventId,
      reconciliationStatus: 'success',
      lastReviewedAt: new Date(),
    });

    await db.tournament.update({
      where: { id: transaction.tournamentId },
      data: { escrowStatus: escrow.status },
    });

    // Real-time push to frontends
    this.emitEscrowUpdate(transaction.tournamentId, { escrowStatus: escrow.status });

    return { transaction, escrow };
  }

  private static async markTransactionFailed(
    transactionId: string,
    db: TransactionClient | typeof prisma,
    reviewData: Prisma.TransactionUpdateInput,
  ) {
    const transaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'failed',
        ...reviewData,
      },
    });

    if (transaction.refId && transaction.type === 'payout') {
      await db.reward.update({
        where: { id: transaction.refId },
        data: { status: 'failed' },
      });
    }

    if (transaction.escrowId) {
      const escrow = await this.syncEscrowSnapshot(transaction.escrowId, db, {
        reconciliationStatus: 'failed',
        latestWebhookEventId: (reviewData.providerEventId as string) || transaction.providerEventId,
        lastReviewedAt: new Date(),
      });

      if (transaction.tournamentId) {
        await db.tournament.update({
          where: { id: transaction.tournamentId },
          data: { escrowStatus: escrow.status },
        });
      }
    }

    return transaction;
  }

  static async processWebhook(provider: string, payload: any) {
    // Signature validation is handled upstream by the PaymentWebhookController per provider.

    const providerEventId = payload.eventId || payload.id;
    const transactionReference = payload.reference || payload.externalRefId || payload.transactionReference;
    const eventType = payload.type || payload.eventType || payload.kind;

    if (!providerEventId || !transactionReference || !eventType) {
      throw new ApiError(400, 'Webhook payload is missing required fields.');
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: {
          OR: [{ providerEventId }, { externalRefId: transactionReference }, { id: transactionReference }],
        },
      });

      if (!existing) {
        throw new ApiError(404, 'Referenced escrow transaction was not found.');
      }

      if (existing.providerEventId === providerEventId && existing.status === 'success') {
        return {
          deduplicated: true,
          transactionId: existing.id,
          provider,
        };
      }

      const reviewData: Prisma.TransactionUpdateInput = {
        providerEventId,
        externalRefId: existing.externalRefId || transactionReference,
        reviewNotes: `${provider}:${eventType}`,
      };

      if (eventType === 'funding.succeeded' || eventType === 'escrow_funded') {
        return this.markFundingTransactionSuccessful(existing.id, tx, reviewData);
      }

      if (eventType === 'payout.succeeded' || eventType === 'payout_completed') {
        return this.markPayoutTransactionSuccessful(existing.id, tx, reviewData);
      }

      if (
        eventType === 'funding.failed' ||
        eventType === 'payout.failed' ||
        eventType === 'escrow_failed' ||
        eventType === 'payout_rejected'
      ) {
        return this.markTransactionFailed(existing.id, tx, reviewData);
      }

      logger.warn('Unhandled escrow webhook event', { provider, eventType, providerEventId });
      return {
        ignored: true,
        provider,
        eventType,
      };
    });
  }

  private static async ensurePayoutCapacity(
    db: TransactionClient | typeof prisma,
    tournamentId: string,
    escrowId: string,
    additionalAmount: number,
  ) {
    const [successfulPayouts, pendingPayouts, escrow] = await Promise.all([
      this.sumTransactionAmounts(db, { tournamentId, escrowId, type: 'payout', status: 'success' }),
      this.sumTransactionAmounts(db, { tournamentId, escrowId, type: 'payout', status: 'pending' }),
      db.escrow.findUnique({ where: { id: escrowId } }),
    ]);

    if (!escrow) {
      throw new ApiError(404, 'Escrow not found');
    }

    const reservedAmount = successfulPayouts + pendingPayouts;
    if (reservedAmount + additionalAmount > escrow.fundedAmount) {
      throw new ApiError(400, 'Requested payouts exceed the funded escrow amount available for release.');
    }
  }

  static async requestPayoutRelease(tournamentId: string, actorId: string, request: PayoutRequest) {
    if (!Array.isArray(request.recipients) || request.recipients.length === 0) {
      throw new ApiError(400, 'At least one payout recipient is required.');
    }

    return prisma.$transaction(async (tx) => {
      const tournament = await this.getTournamentForEscrow(tournamentId, tx);
      if (tournament.escrow.status === 'disputed') {
        throw new ApiError(400, 'Disputed tournaments cannot request payout release.');
      }

      const totalRequested = request.recipients.reduce((sum, recipient) => sum + Number(recipient.amount || 0), 0);
      await this.ensurePayoutCapacity(tx, tournament.id, tournament.escrow.id, totalRequested);

      const createdTransactions = [];

      for (const recipient of request.recipients) {
        if (recipient.isHostFee) {
          const payoutTransaction = await tx.transaction.create({
            data: {
              userId: tournament.organizerId,
              tournamentId: tournament.id,
              escrowId: tournament.escrow.id,
              type: 'payout',
              amount: recipient.amount,
              currency: 'usd',
              status: 'pending',
              reviewNotes: (request.note || '') + ' [Partner Host Fee]',
              externalRefId: `hostfee_${tournament.id}_${crypto.randomBytes(8).toString('hex')}`,
              payoutDestination: recipient.payoutDestination,
              paymentMethod: 'pending_release',
            },
          });
          createdTransactions.push(payoutTransaction);
          continue;
        }

        const participant = await tx.participant.findFirst({
          where: {
            tournamentId: tournament.id,
            OR: [
              recipient.participantId ? { id: recipient.participantId } : undefined,
              recipient.userId ? { userId: recipient.userId } : undefined,
            ].filter(Boolean) as Prisma.ParticipantWhereInput[],
          },
        });

        if (!participant) {
          throw new ApiError(404, 'Payout recipient participant not found for tournament.');
        }

        const reward = await tx.reward.create({
          data: {
            participantId: participant.id,
            tournamentId: tournament.id,
            amount: recipient.amount,
            status: 'pending',
          },
        });

        const payoutTransaction = await tx.transaction.create({
          data: {
            userId: participant.userId,
            tournamentId: tournament.id,
            escrowId: tournament.escrow.id,
            type: 'payout',
            amount: recipient.amount,
            currency: 'usd',
            status: 'pending',
            refId: reward.id,
            reviewNotes: request.note,
            externalRefId: `payout_${reward.id}_${crypto.randomBytes(8).toString('hex')}`,
            payoutDestination: recipient.payoutDestination,
            paymentMethod: 'pending_release',
          },
        });

        await tx.participant.update({
          where: { id: participant.id },
          data: { paymentStatus: 'pending' },
        });

        createdTransactions.push(payoutTransaction);
      }

      return {
        status: 'pending_admin_release',
        resultVersion: request.resultVersion || null,
        transactions: createdTransactions,
      };
    });
  }

  static async approvePayoutRelease(tournamentId: string, adminId: string, request: PayoutApprovalRequest) {
    return prisma.$transaction(async (tx) => {
      const tournament = await this.getTournamentForEscrow(tournamentId, tx);
      if (tournament.escrow.status === 'disputed') {
        throw new ApiError(400, 'Disputed tournaments cannot release payouts.');
      }

      const pendingTransactions = await tx.transaction.findMany({
        where: {
          tournamentId,
          escrowId: tournament.escrow.id,
          type: 'payout',
          status: 'pending',
        },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingTransactions.length === 0) {
        throw new ApiError(400, 'No pending payout transactions are waiting for release.');
      }

      const paymentMethod = request.paymentMethod || 'gateway';
      const releasedAt = new Date();

      // Mark each pending payout as successfully released (updates reward + participant.paymentStatus)
      const releasedTransactions = await Promise.all(
        pendingTransactions.map((transaction) =>
          this.markPayoutTransactionSuccessful(transaction.id, tx, {
            paymentMethod,
            payoutDestination: request.payoutDestination || transaction.payoutDestination,
            reviewNotes: request.note || transaction.reviewNotes,
            reviewedById: adminId,
            reviewedAt: releasedAt,
            providerEventId: this.buildProviderEventId('admin_release', transaction.id),
          }),
        ),
      );

      const escrow = await this.syncEscrowSnapshot(tournament.escrow.id, tx, {
        status: 'released',
        releasedAt,
        reconciliationStatus: 'success',
        lastReviewedById: adminId,
        lastReviewedAt: releasedAt,
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { escrowStatus: escrow.status },
      });

      this.emitEscrowUpdate(tournamentId, { escrowStatus: escrow.status, type: 'payout_released' });

      return {
        escrow,
        transactions: releasedTransactions.map(r => r.transaction),
      };
    });
  }

  static async reviewTransaction(transactionId: string, adminId: string, request: ManualReviewRequest) {
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) {
        throw new ApiError(404, 'Escrow transaction not found.');
      }

      const reviewData: Prisma.TransactionUpdateInput = {
        proofUrl: request.proofUrl,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: request.note,
        providerEventId: this.buildProviderEventId('manual_review', transaction.id),
      };

      let reviewResult;
      if (request.approved) {
        if (transaction.type === 'escrow_deposit') {
          reviewResult = await this.markFundingTransactionSuccessful(transaction.id, tx, reviewData);
        } else if (transaction.type === 'payout') {
          reviewResult = await this.markPayoutTransactionSuccessful(transaction.id, tx, reviewData);
        }
      }

      if (!reviewResult) {
        reviewResult = await this.markTransactionFailed(transaction.id, tx, reviewData);
      }

      return { ...reviewResult, _tournamentId: transaction.tournamentId };
    });

    // Emit AFTER transaction commits so frontends see committed data
    if (result._tournamentId) {
      this.emitEscrowUpdate(result._tournamentId, { type: 'escrow_reviewed' });
    }

    return result;
  }

  static async retryTransaction(transactionId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) {
        throw new ApiError(404, 'Escrow transaction not found.');
      }

      const retriedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'pending',
          providerEventId: null,
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNotes: `Retried at ${new Date().toISOString()}`,
          externalRefId: transaction.externalRefId || `${transaction.type}_${transaction.id}_${Date.now()}`,
        },
      });

      if (retriedTransaction.escrowId) {
        await this.syncEscrowSnapshot(retriedTransaction.escrowId, tx, {
          reconciliationStatus: 'pending',
          lastReviewedById: adminId,
          lastReviewedAt: new Date(),
        });
      }

      return retriedTransaction;
    });
  }

  static async markDisputed(tournamentId: string, adminId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      const tournament = await this.getTournamentForEscrow(tournamentId, tx);
      const disputedAt = new Date();

      const escrow = await this.syncEscrowSnapshot(tournament.escrow.id, tx, {
        status: 'disputed',
        disputedAt,
        reconciliationStatus: 'failed',
        lastReviewedById: adminId,
        lastReviewedAt: disputedAt,
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          escrowStatus: escrow.status,
          status: PRE_START_TOURNAMENT_STATUSES.has(tournament.status) ? tournament.status : 'completed',
        },
      });

      await tx.transaction.create({
        data: {
          userId: tournament.organizerId,
          tournamentId,
          escrowId: tournament.escrow.id,
          type: 'refund',
          amount: 0,
          currency: 'usd',
          status: 'pending',
          refId: tournamentId,
          reviewNotes: reason,
          reviewedById: adminId,
          reviewedAt: disputedAt,
          paymentMethod: 'dispute_hold',
        },
      });

      return { escrow, reason };
    });
  }

  static async getOperationalQueues() {
    const settings = await SettingsService.getEscrowSettings();
    const alertCutoff = new Date(Date.now() - settings.escrowReconciliationAlertMinutes * 60_000);

    const [pendingProofs, pendingReconciliation, disputedEscrows, pendingPayouts, history] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          status: 'pending',
          proofUrl: { not: null },
        },
        include: { tournament: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      prisma.transaction.findMany({
        where: {
          status: 'pending',
          createdAt: { lte: alertCutoff },
          type: { in: ['escrow_deposit', 'payout'] },
        },
        include: { tournament: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      prisma.escrow.findMany({
        where: { status: 'disputed' },
        include: { tournament: true },
        orderBy: { disputedAt: 'desc' },
        take: 20,
      }),
      prisma.transaction.findMany({
        where: { status: 'pending', type: 'payout' },
        include: { tournament: true, user: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      prisma.transaction.findMany({
        where: {
          status: { in: ['success', 'failed'] },
          type: { in: ['escrow_deposit', 'payout'] }
        },
        include: { tournament: true },
        orderBy: { createdAt: 'desc' },
        take: 30, // Get top 30 most recent history items
      }),
    ]);

    return {
      counts: {
        pendingProofs: pendingProofs.length,
        unreconciledWebhooks: pendingReconciliation.length,
        disputedTournaments: disputedEscrows.length,
        payoutApprovals: pendingPayouts.length,
      },
      queues: {
        pendingProofs,
        unreconciled: pendingReconciliation,
        disputed: disputedEscrows,
        pendingPayouts: pendingPayouts,
        history: history,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Task 4.3: Dispute Resolution Controls ──────────────────────────────────

  /**
   * Resolve an active dispute with a specific resolution strategy.
   * Supported resolutions: refund_organizer, release_payouts, partial_refund, custom.
   */
  static async resolveDispute(
    tournamentId: string,
    adminId: string,
    resolution: string,
    note?: string,
  ) {
    const validResolutions = ['refund_organizer', 'release_payouts', 'partial_refund', 'custom'];
    if (!validResolutions.includes(resolution)) {
      throw new ApiError(400, `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`);
    }

    return prisma.$transaction(async (tx) => {
      const tournament = await this.getTournamentForEscrow(tournamentId, tx);

      if (tournament.escrow.status !== 'disputed') {
        throw new ApiError(400, 'Only disputed escrows can be resolved.');
      }

      const resolvedAt = new Date();

      // Cancel all pending dispute-hold transactions
      await tx.transaction.updateMany({
        where: {
          tournamentId,
          escrowId: tournament.escrow.id,
          type: 'refund',
          status: 'pending',
          paymentMethod: 'dispute_hold',
        },
        data: {
          status: resolution === 'refund_organizer' ? 'success' : 'failed',
          reviewedById: adminId,
          reviewedAt: resolvedAt,
          reviewNotes: note || `Dispute resolved: ${resolution}`,
        },
      });

      let nextEscrowStatus: string;

      if (resolution === 'refund_organizer') {
        // Create refund transaction for the organizer
        await tx.transaction.create({
          data: {
            userId: tournament.organizerId,
            tournamentId,
            escrowId: tournament.escrow.id,
            type: 'organizer_return',
            amount: tournament.escrow.fundedAmount,
            currency: 'usd',
            status: 'success',
            refId: tournamentId,
            reviewNotes: `Dispute resolved — full refund to organizer. ${note || ''}`,
            reviewedById: adminId,
            reviewedAt: resolvedAt,
            paymentMethod: 'dispute_resolution',
          },
        });
        nextEscrowStatus = 'cancelled';
      } else if (resolution === 'release_payouts') {
        // Release all pending payouts
        const pendingPayouts = await tx.transaction.findMany({
          where: {
            tournamentId,
            escrowId: tournament.escrow.id,
            type: 'payout',
            status: 'pending',
          },
        });

        for (const payout of pendingPayouts) {
          await this.markPayoutTransactionSuccessful(payout.id, tx, {
            reviewedById: adminId,
            reviewedAt: resolvedAt,
            reviewNotes: `Released via dispute resolution. ${note || ''}`,
            providerEventId: this.buildProviderEventId('dispute_resolution', payout.id),
          });
        }
        nextEscrowStatus = 'released';
      } else {
        // partial_refund or custom — admin handles specifics externally
        nextEscrowStatus = 'cancelled';
      }

      const escrow = await this.syncEscrowSnapshot(tournament.escrow.id, tx, {
        status: nextEscrowStatus,
        reconciliationStatus: 'success',
        lastReviewedById: adminId,
        lastReviewedAt: resolvedAt,
      });

      // Update dispute resolution metadata
      await tx.escrow.update({
        where: { id: tournament.escrow.id },
        data: {
          disputeResolvedAt: resolvedAt,
          disputeResolution: resolution,
        },
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { escrowStatus: escrow.status },
      });

      logger.info('Dispute resolved', { tournamentId, resolution, adminId });

      return {
        escrow,
        resolution,
        resolvedAt,
      };
    });
  }

  /**
   * Freeze an escrow — blocks all transactions (funding, payouts) without entering full dispute.
   * Useful for investigation before formally marking as disputed.
   */
  static async freezeEscrow(tournamentId: string, adminId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      const tournament = await this.getTournamentForEscrow(tournamentId, tx);

      if (tournament.escrow.status === 'disputed') {
        throw new ApiError(400, 'Escrow is already in disputed state. Use resolveDispute instead.');
      }

      if (tournament.escrow.status === 'released' || tournament.escrow.status === 'cancelled') {
        throw new ApiError(400, 'Cannot freeze a released or cancelled escrow.');
      }

      const escrow = await this.syncEscrowSnapshot(tournament.escrow.id, tx, {
        status: 'disputed',
        disputedAt: new Date(),
        reconciliationStatus: 'failed',
        lastReviewedById: adminId,
        lastReviewedAt: new Date(),
      });

      await tx.escrow.update({
        where: { id: tournament.escrow.id },
        data: { disputeReason: reason },
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { escrowStatus: escrow.status },
      });

      // Create a dispute-hold audit transaction
      await tx.transaction.create({
        data: {
          userId: tournament.organizerId,
          tournamentId,
          escrowId: tournament.escrow.id,
          type: 'refund',
          amount: 0,
          currency: 'usd',
          status: 'pending',
          refId: tournamentId,
          reviewNotes: `Escrow frozen: ${reason}`,
          reviewedById: adminId,
          reviewedAt: new Date(),
          paymentMethod: 'dispute_hold',
        },
      });

      logger.info('Escrow frozen', { tournamentId, adminId, reason });

      return { escrow, reason };
    });
  }

  /**
   * Unfreeze an escrow — restore to previous funded/locked state.
   * Only works on disputed escrows that haven't been resolved yet.
   */
  static async unfreezeEscrow(tournamentId: string, adminId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const tournament = await this.getTournamentForEscrow(tournamentId, tx);

      if (tournament.escrow.status !== 'disputed') {
        throw new ApiError(400, 'Only disputed/frozen escrows can be unfrozen.');
      }

      if (tournament.escrow.disputeResolvedAt) {
        throw new ApiError(400, 'This dispute has already been resolved and cannot be unfrozen.');
      }

      // Determine target status based on funded amount
      let targetStatus: string;
      if (tournament.escrow.fundedAmount >= tournament.escrow.requiredAmount) {
        targetStatus = tournament.escrow.lockedAt ? 'locked' : 'funded';
      } else if (tournament.escrow.fundedAmount > 0) {
        targetStatus = 'partially_funded';
      } else {
        targetStatus = 'not_funded';
      }

      const escrow = await this.syncEscrowSnapshot(tournament.escrow.id, tx, {
        status: targetStatus,
        reconciliationStatus: 'success',
        lastReviewedById: adminId,
        lastReviewedAt: new Date(),
      });

      // Clear dispute metadata
      await tx.escrow.update({
        where: { id: tournament.escrow.id },
        data: {
          disputeReason: null,
          disputedAt: null,
        },
      });

      // Cancel dispute-hold transactions
      await tx.transaction.updateMany({
        where: {
          tournamentId,
          escrowId: tournament.escrow.id,
          type: 'refund',
          status: 'pending',
          paymentMethod: 'dispute_hold',
        },
        data: {
          status: 'failed',
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNotes: note || 'Escrow unfrozen — dispute cleared.',
        },
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { escrowStatus: escrow.status },
      });

      logger.info('Escrow unfrozen', { tournamentId, adminId, targetStatus });

      return { escrow, restoredStatus: targetStatus };
    });
  }

  // ─── Task 4.4: Monitoring, Retry & Alerting ─────────────────────────────────

  /**
   * Get a comprehensive reconciliation health report for the admin dashboard.
   * Includes stale transactions, retry candidates, and overall system health.
   */
  static async getReconciliationHealth() {
    const settings = await SettingsService.getEscrowSettings();
    const alertCutoff = new Date(Date.now() - settings.escrowReconciliationAlertMinutes * 60_000);
    const criticalCutoff = new Date(Date.now() - settings.escrowReconciliationAlertMinutes * 3 * 60_000);

    const [
      stalePending,
      criticalPending,
      recentFailed,
      totalPending,
      totalSuccess,
      totalFailed,
      disputedEscrows,
      staleEscrows,
    ] = await Promise.all([
      // Transactions pending beyond alert threshold
      prisma.transaction.findMany({
        where: {
          status: 'pending',
          type: { in: ['escrow_deposit', 'payout'] },
          createdAt: { lte: alertCutoff },
        },
        include: { tournament: { select: { id: true, name: true, organizerId: true } } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      // Critical: pending beyond 3x alert threshold
      prisma.transaction.count({
        where: {
          status: 'pending',
          type: { in: ['escrow_deposit', 'payout'] },
          createdAt: { lte: criticalCutoff },
        },
      }),
      // Recently failed (last 24h)
      prisma.transaction.findMany({
        where: {
          status: 'failed',
          type: { in: ['escrow_deposit', 'payout'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
        },
        include: { tournament: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // Counts
      prisma.transaction.count({ where: { status: 'pending', type: { in: ['escrow_deposit', 'payout'] } } }),
      prisma.transaction.count({ where: { status: 'success', type: { in: ['escrow_deposit', 'payout'] } } }),
      prisma.transaction.count({ where: { status: 'failed', type: { in: ['escrow_deposit', 'payout'] } } }),
      // Disputed escrows
      prisma.escrow.count({ where: { status: 'disputed' } }),
      // Stale escrows (reconciliation stuck)
      prisma.escrow.count({
        where: {
          reconciliationStatus: { in: ['pending', 'failed'] },
          updatedAt: { lte: alertCutoff },
          status: { notIn: ['cancelled', 'released'] },
        },
      }),
    ]);

    // Compute health score (0-100)
    const totalTransactions = totalPending + totalSuccess + totalFailed;
    let healthScore = 100;
    if (totalTransactions > 0) {
      healthScore -= Math.min(30, (totalFailed / totalTransactions) * 100);
    }
    healthScore -= Math.min(30, stalePending.length * 5);
    healthScore -= Math.min(20, criticalPending * 10);
    healthScore -= Math.min(20, disputedEscrows * 10);
    healthScore = Math.max(0, Math.round(healthScore));

    let healthStatus: string;
    if (healthScore >= 80) healthStatus = 'healthy';
    else if (healthScore >= 50) healthStatus = 'warning';
    else healthStatus = 'critical';

    return {
      health: {
        score: healthScore,
        status: healthStatus,
        alertThresholdMinutes: settings.escrowReconciliationAlertMinutes,
      },
      summary: {
        totalPending,
        totalSuccess,
        totalFailed,
        stalePending: stalePending.length,
        criticalPending,
        disputedEscrows,
        staleEscrows,
      },
      alerts: {
        stalePending,
        recentFailed,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retry a failed transaction with exponential backoff tracking.
   * Tracks retry count and schedules next retry window.
   */
  static async retryWithBackoff(transactionId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) {
        throw new ApiError(404, 'Transaction not found.');
      }

      if (transaction.status !== 'failed') {
        throw new ApiError(400, 'Only failed transactions can be retried.');
      }

      const MAX_RETRIES = 5;
      const currentRetryCount = transaction.retryCount || 0;

      if (currentRetryCount >= MAX_RETRIES) {
        throw new ApiError(400, `Maximum retry count (${MAX_RETRIES}) exceeded. Manual intervention required.`);
      }

      const nextRetryCount = currentRetryCount + 1;
      // Exponential backoff: 2^retryCount minutes (2, 4, 8, 16, 32 min)
      const backoffMinutes = Math.pow(2, nextRetryCount);
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60_000);

      const retriedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'pending',
          providerEventId: null,
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNotes: `Retry #${nextRetryCount} (backoff: ${backoffMinutes}min). Previous: ${transaction.failureReason || 'unknown'}`,
          retryCount: nextRetryCount,
          lastRetryAt: new Date(),
          failureReason: null,
          externalRefId: transaction.externalRefId || `${transaction.type}_${transaction.id}_${Date.now()}`,
        },
      });

      // Update escrow retry tracking
      if (retriedTransaction.escrowId) {
        await tx.escrow.update({
          where: { id: retriedTransaction.escrowId },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
            nextRetryAt,
          },
        });

        await this.syncEscrowSnapshot(retriedTransaction.escrowId, tx, {
          reconciliationStatus: 'pending',
          lastReviewedById: adminId,
          lastReviewedAt: new Date(),
        });
      }

      logger.info('Transaction retried with backoff', {
        transactionId,
        retryCount: nextRetryCount,
        nextRetryAt: nextRetryAt.toISOString(),
        adminId,
      });

      return {
        transaction: retriedTransaction,
        retryCount: nextRetryCount,
        nextRetryAt,
        backoffMinutes,
        maxRetries: MAX_RETRIES,
      };
    });
  }

  /**
   * Bulk retry all stale pending transactions that haven't exceeded max retries.
   * Returns a summary of what was retried.
   */
  static async bulkRetryStale(adminId: string) {
    const settings = await SettingsService.getEscrowSettings();
    const alertCutoff = new Date(Date.now() - settings.escrowReconciliationAlertMinutes * 60_000);

    const staleTransactions = await prisma.transaction.findMany({
      where: {
        status: 'pending',
        type: { in: ['escrow_deposit', 'payout'] },
        createdAt: { lte: alertCutoff },
        retryCount: { lt: 5 },
      },
      take: 20,
    });

    // Process all retries in parallel — each has its own transaction so partial failures are isolated
    const results = await Promise.allSettled(
      staleTransactions.map(tx =>
        this.retryWithBackoff(tx.id, adminId)
          .then(result => ({ transactionId: tx.id, status: 'retried' as const, retryCount: result.retryCount }))
          .catch((error: any) => ({ transactionId: tx.id, status: 'skipped' as const, reason: error.message }))
      )
    );

    const summary = results.map(r => r.status === 'fulfilled' ? r.value : r.reason);

    logger.info('Bulk retry completed', { total: staleTransactions.length, adminId });

    return {
      processed: summary.length,
      results: summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mark stale transactions as timed out when they exceed critical threshold.
   * This is called by a cron or admin action to clean up stuck transactions.
   */
  static async markStaleTransactionsTimedOut(adminId: string) {
    const settings = await SettingsService.getEscrowSettings();
    const criticalCutoff = new Date(Date.now() - settings.escrowReconciliationAlertMinutes * 3 * 60_000);

    const timedOutTransactions = await prisma.transaction.findMany({
      where: {
        status: 'pending',
        type: { in: ['escrow_deposit', 'payout'] },
        createdAt: { lte: criticalCutoff },
        retryCount: { gte: 5 },
      },
      take: 50,
    });

    const results = [];

    for (const tx of timedOutTransactions) {
      await prisma.$transaction(async (dbTx) => {
        await this.markTransactionFailed(tx.id, dbTx, {
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNotes: `Auto timed-out after ${tx.retryCount} retries and critical threshold exceeded.`,
        });

        await dbTx.transaction.update({
          where: { id: tx.id },
          data: { failureReason: 'timeout_exceeded' },
        });
      });

      results.push({ transactionId: tx.id, status: 'timed_out' });
    }

    logger.info('Stale transactions marked as timed out', { count: results.length, adminId });

    return {
      processed: results.length,
      results,
      generatedAt: new Date().toISOString(),
    };
  }
}
