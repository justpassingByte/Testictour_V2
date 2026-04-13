import { Request, Response } from 'express';
import asyncHandler from '../lib/asyncHandler';
import ApiError from '../utils/ApiError';
import SettlementReportService from '../services/SettlementReportService';
import { prisma } from '../services/prisma';

async function ensureSettlementAccess(req: Request, tournamentId: string) {
  const user = req.user!;
  if (user.role === 'admin') return;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true },
  });

  if (!tournament) throw new ApiError(404, 'Tournament not found');
  if (tournament.organizerId !== user.id) {
    throw new ApiError(403, 'You can only view settlement reports for your own tournaments.');
  }
}

const SettlementReportController = {
  /**
   * GET /partner/tournaments/:id/settlement-report
   * GET /admin/tournaments/:id/settlement-report
   * Returns the derived settlement report for a tournament.
   * Auth: organizer owner or admin.
   */
  getReport: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ensureSettlementAccess(req, id);

    const report = await SettlementReportService.getTournamentReport(id);
    res.json({ success: true, report });
  }),
};

export default SettlementReportController;
