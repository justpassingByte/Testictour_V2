import { Router } from 'express';
import auth from '../middlewares/auth';
import EscrowController from '../controllers/EscrowController';
import SettlementReportController from '../controllers/SettlementReportController';

const router = Router({ mergeParams: true });

// ─── Tournament-scoped escrow endpoints ── /tournaments/:id/escrow/* ──────────

// GET /tournaments/:id/escrow — escrow snapshot for organizer/admin
router.get('/:id/escrow', auth('partner', 'admin'), EscrowController.getEscrow);

// GET /tournaments/:id/escrow/transactions — list escrow transactions
router.get('/:id/escrow/transactions', auth('partner', 'admin'), EscrowController.listTransactions);

// POST /tournaments/:id/escrow/funding — organizer submits funding
router.post('/:id/escrow/funding', auth('partner', 'admin'), EscrowController.submitFunding);

// POST /tournaments/:id/payouts/request-release — organizer requests payout release
router.post('/:id/payouts/request-release', auth('partner', 'admin'), EscrowController.requestPayoutRelease);

// ─── Partner settlement report ────────────────────────────────────────────────

// GET /partner/tournaments/:id/settlement-report
// (aliased also via partner routes below; registered here for direct access)
router.get('/:id/settlement-report', auth('partner', 'admin'), SettlementReportController.getReport);

export default router;
