import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../lib/asyncHandler';
import ApiError from '../utils/ApiError';
import EscrowService from '../services/EscrowService';
import { prisma } from '../services/prisma';

// ─── Ownership helper (reused from TournamentController pattern) ──────────────

async function ensureOwnership(req: Request, tournamentId: string) {
  const user = req.user!;
  if (user.role === 'admin') return;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true },
  });
  if (!tournament) throw new ApiError(404, 'Tournament not found');
  if (tournament.organizerId !== user.id) {
    throw new ApiError(403, 'You can only manage escrow for your own tournaments.');
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

const EscrowController = {
  /**
   * GET /tournaments/:id/escrow
   * Returns the current escrow snapshot plus computed summary for a tournament.
   * Auth: organizer owner or admin.
   */
  getEscrow: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ensureOwnership(req, id);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        escrow: true,
        organizer: { select: { id: true, username: true, email: true } },
      },
    });

    if (!tournament) throw new ApiError(404, 'Tournament not found');

    res.json({
      success: true,
      escrow: tournament.escrow,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        escrowStatus: tournament.escrowStatus,
        isCommunityMode: tournament.isCommunityMode,
        escrowRequiredAmount: tournament.escrowRequiredAmount,
        communityThresholdSnapshot: tournament.communityThresholdSnapshot,
        organizer: tournament.organizer,
      },
    });
  }),

  /**
   * POST /tournaments/:id/escrow/funding
   * Submit organizer funding (manual proof or gateway-initiated).
   * Auth: organizer owner or admin.
   * Body: { amount, method?, provider?, proofUrl?, note? }
   */
  submitFunding: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ensureOwnership(req, id);

    const result = await EscrowService.submitFunding(id, req.user!.id, {
      amount: req.body.amount,
      method: req.body.method,
      provider: req.body.provider,
      proofUrl: req.body.proofUrl,
      note: req.body.note,
    });

    res.status(201).json({ success: true, ...result });
  }),

  /**
   * GET /tournaments/:id/escrow/transactions
   * List all escrow-linked transactions for a tournament.
   * Auth: organizer owner or admin.
   */
  listTransactions: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ensureOwnership(req, id);

    const transactions = await prisma.transaction.findMany({
      where: { tournamentId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, transactions });
  }),

  /**
   * POST /tournaments/:id/payouts/request-release
   * Organizer requests payout release for winners after results are approved.
   * Auth: organizer owner or admin.
   * Body: { recipients: [{ participantId?, userId?, amount, payoutDestination? }], resultVersion?, note? }
   */
  requestPayoutRelease: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ensureOwnership(req, id);

    const result = await EscrowService.requestPayoutRelease(id, req.user!.id, {
      recipients: req.body.recipients,
      resultVersion: req.body.resultVersion,
      note: req.body.note,
    });

    res.status(201).json({ success: true, ...result });
  }),

  /**
   * POST /admin/tournaments/:id/payouts/release
   * Admin approves and executes payout release.
   * Auth: admin only.
   * Body: { paymentMethod?, payoutDestination?, note? }
   */
  approvePayoutRelease: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await EscrowService.approvePayoutRelease(id, req.user!.id, {
      paymentMethod: req.body.paymentMethod,
      payoutDestination: req.body.payoutDestination,
      note: req.body.note,
    });

    res.json({ success: true, ...result });
  }),

  /**
   * POST /admin/tournaments/:id/dispute
   * Admin freezes escrow and places tournament into disputed state.
   * Auth: admin only.
   * Body: { reason }
   */
  markDisputed: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string') {
      throw new ApiError(400, 'A dispute reason is required.');
    }

    const result = await EscrowService.markDisputed(id, req.user!.id, reason);
    res.json({ success: true, ...result });
  }),

  /**
   * POST /admin/tournaments/:id/escrow/cancel
   * Admin cancels a pre-lock escrow (tournament not yet started).
   * Auth: admin only.
   * Body: { reason }
   */
  cancelEscrow: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string') {
      throw new ApiError(400, 'A cancellation reason is required.');
    }

    const escrow = await EscrowService.markTournamentCancelled(id, reason);
    res.json({ success: true, escrow });
  }),

  /**
   * POST /admin/escrow/transactions/:transactionId/review
   * Admin approves or rejects a manual funding or payout proof.
   * Auth: admin only.
   * Body: { approved: boolean, proofUrl?, note? }
   */
  reviewTransaction: asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;

    const result = await EscrowService.reviewTransaction(transactionId, req.user!.id, {
      approved: req.body.approved,
      proofUrl: req.body.proofUrl,
      note: req.body.note,
    });

    res.json({ success: true, ...result });
  }),

  /**
   * POST /admin/escrow/transactions/:transactionId/retry
   * Admin retries a failed escrow transaction.
   * Auth: admin only.
   */
  retryTransaction: asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const transaction = await EscrowService.retryTransaction(transactionId, req.user!.id);
    res.json({ success: true, transaction });
  }),

  /**
   * GET /admin/escrow/queues
   * Returns operational queues: pending proofs, unreconciled webhooks, disputed escrows, pending payouts.
   * Auth: admin only.
   */
  getOperationalQueues: asyncHandler(async (_req: Request, res: Response) => {
    const queues = await EscrowService.getOperationalQueues();
    res.json({ success: true, ...queues });
  }),

  /**
   * GET /admin/settings/escrow
   * Returns current escrow-related platform settings.
   * Auth: admin only.
   */
  getEscrowSettings: asyncHandler(async (_req: Request, res: Response) => {
    const result = await EscrowService.getEscrowSettingsPayload();
    res.json({ success: true, ...result });
  }),

  /**
   * PUT /admin/settings/escrow
   * Updates escrow-related platform settings.
   * Auth: admin only.
   * Body: Partial<EscrowSettings>
   */
  updateEscrowSettings: asyncHandler(async (req: Request, res: Response) => {
    const result = await EscrowService.updateEscrowSettings(req.body, req.user!.id);
    res.json({ success: true, ...result });
  }),

  // ─── Task 4.3: Dispute Resolution ────────────────────────────────────────────

  /**
   * POST /admin/tournaments/:id/dispute/resolve
   * Resolve a disputed escrow with a strategy.
   * Auth: admin only.
   * Body: { resolution: 'refund_organizer' | 'release_payouts' | 'partial_refund' | 'custom', note? }
   */
  resolveDispute: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { resolution, note } = req.body;

    if (!resolution) {
      throw new ApiError(400, 'A dispute resolution strategy is required.');
    }

    const result = await EscrowService.resolveDispute(id, req.user!.id, resolution, note);
    res.json({ success: true, ...result });
  }),

  /**
   * POST /admin/tournaments/:id/escrow/freeze
   * Freeze an escrow for investigation without full dispute.
   * Auth: admin only.
   * Body: { reason }
   */
  freezeEscrow: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string') {
      throw new ApiError(400, 'A freeze reason is required.');
    }

    const result = await EscrowService.freezeEscrow(id, req.user!.id, reason);
    res.json({ success: true, ...result });
  }),

  /**
   * POST /admin/tournaments/:id/escrow/unfreeze
   * Unfreeze a disputed escrow — restores to previous state.
   * Auth: admin only.
   * Body: { note? }
   */
  unfreezeEscrow: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await EscrowService.unfreezeEscrow(id, req.user!.id, req.body.note);
    res.json({ success: true, ...result });
  }),

  // ─── Task 4.4: Monitoring & Retry ────────────────────────────────────────────

  /**
   * GET /admin/escrow/health
   * Returns comprehensive reconciliation health report.
   * Auth: admin only.
   */
  getReconciliationHealth: asyncHandler(async (_req: Request, res: Response) => {
    const health = await EscrowService.getReconciliationHealth();
    res.json({ success: true, ...health });
  }),

  /**
   * POST /admin/escrow/transactions/:transactionId/retry-backoff
   * Retry a failed transaction with exponential backoff.
   * Auth: admin only.
   */
  retryWithBackoff: asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const result = await EscrowService.retryWithBackoff(transactionId, req.user!.id);
    res.json({ success: true, ...result });
  }),

  /**
   * POST /admin/escrow/bulk-retry
   * Bulk retry all stale pending transactions.
   * Auth: admin only.
   */
  bulkRetryStale: asyncHandler(async (req: Request, res: Response) => {
    const result = await EscrowService.bulkRetryStale(req.user!.id);
    res.json({ success: true, ...result });
  }),

  /**
   * POST /admin/escrow/timeout-stale
   * Mark critically stale transactions as timed out.
   * Auth: admin only.
   */
  markStaleTimedOut: asyncHandler(async (req: Request, res: Response) => {
    const result = await EscrowService.markStaleTransactionsTimedOut(req.user!.id);
    res.json({ success: true, ...result });
  }),
};

export default EscrowController;
