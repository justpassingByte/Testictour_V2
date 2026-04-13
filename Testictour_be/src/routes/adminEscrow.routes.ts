import { Router } from 'express';
import auth from '../middlewares/auth';
import EscrowController from '../controllers/EscrowController';
import SettlementReportController from '../controllers/SettlementReportController';

const router = Router();

// ─── Admin escrow operational dashboard ──────────────────────────────────────

// GET /admin/escrow/queues — pending proofs, unreconciled, disputed, pending payouts
router.get('/escrow/queues', auth('admin'), EscrowController.getOperationalQueues);

// POST /admin/escrow/transactions/:transactionId/review — approve/reject manual proof
router.post('/escrow/transactions/:transactionId/review', auth('admin'), EscrowController.reviewTransaction);

// POST /admin/escrow/transactions/:transactionId/retry — retry failed transaction
router.post('/escrow/transactions/:transactionId/retry', auth('admin'), EscrowController.retryTransaction);

// ─── Admin tournament-scoped escrow actions ───────────────────────────────────

// POST /admin/tournaments/:id/payouts/release — admin final payout approval
router.post('/tournaments/:id/payouts/release', auth('admin'), EscrowController.approvePayoutRelease);

// POST /admin/tournaments/:id/dispute — freeze escrow into disputed state
router.post('/tournaments/:id/dispute', auth('admin'), EscrowController.markDisputed);

// POST /admin/tournaments/:id/escrow/cancel — cancel pre-lock escrow
router.post('/tournaments/:id/escrow/cancel', auth('admin'), EscrowController.cancelEscrow);

// ─── Task 4.3: Dispute Resolution ────────────────────────────────────────────

// POST /admin/tournaments/:id/dispute/resolve — resolve a disputed escrow
router.post('/tournaments/:id/dispute/resolve', auth('admin'), EscrowController.resolveDispute);

// POST /admin/tournaments/:id/escrow/freeze — freeze escrow for investigation
router.post('/tournaments/:id/escrow/freeze', auth('admin'), EscrowController.freezeEscrow);

// POST /admin/tournaments/:id/escrow/unfreeze — unfreeze a disputed escrow
router.post('/tournaments/:id/escrow/unfreeze', auth('admin'), EscrowController.unfreezeEscrow);

// ─── Admin settlement report ──────────────────────────────────────────────────

// GET /admin/tournaments/:id/settlement-report
router.get('/tournaments/:id/settlement-report', auth('admin'), SettlementReportController.getReport);

// ─── Admin escrow settings (thin wrapper around EscrowController) ─────────────

// GET /admin/settings/escrow — returns escrow-specific platform settings
router.get('/settings/escrow', auth('admin'), EscrowController.getEscrowSettings);

// PUT /admin/settings/escrow — update escrow-specific platform settings
router.put('/settings/escrow', auth('admin'), EscrowController.updateEscrowSettings);

// ─── Task 4.4: Monitoring, Retry & Alerting ──────────────────────────────────

// GET /admin/escrow/health — reconciliation health report
router.get('/escrow/health', auth('admin'), EscrowController.getReconciliationHealth);

// POST /admin/escrow/transactions/:transactionId/retry-backoff — retry with exponential backoff
router.post('/escrow/transactions/:transactionId/retry-backoff', auth('admin'), EscrowController.retryWithBackoff);

// POST /admin/escrow/bulk-retry — bulk retry all stale transactions
router.post('/escrow/bulk-retry', auth('admin'), EscrowController.bulkRetryStale);

// POST /admin/escrow/timeout-stale — mark critically stale as timed out
router.post('/escrow/timeout-stale', auth('admin'), EscrowController.markStaleTimedOut);

export default router;
