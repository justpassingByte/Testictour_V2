import { prisma } from '../services/prisma';
import logger from '../utils/logger';
import cron from 'node-cron';

export async function processWeeklySettlement() {
  logger.info('[WeeklySettlementCron] Starting weekly settlement process...');
  try {
    const endOfWeek = new Date();
    const startOfWeek = new Date(endOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Gather all tournaments that ended in the past week
    const completedTournaments = await prisma.tournament.findMany({
      where: {
        status: 'completed',
        // Example logic: anything that finished in the last week
        // or just anything that hasn't been swept up
      },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (completedTournaments.length === 0) {
      logger.info('[WeeklySettlementCron] No tournaments to settle this week.');
      return;
    }

    const { default: FeeCalculationService } = await import('../services/FeeCalculationService');

    const partnerAggregations: Record<string, { totalPlatformFee: number, totalHostFee: number, netSettlement: number }> = {};

    for (const t of completedTournaments) {
        // Did we already settle this? For now, we assume simple chronological sweep. 
        // In a real system, we'd mark `settledAt` on the tournament. Let's do that conceptualy by asserting any unsettled tournaments.
        const financials = await FeeCalculationService.calculateTournamentAggregateFinancials(t.id, t._count.participants);
        
        if (!partnerAggregations[t.organizerId]) {
            partnerAggregations[t.organizerId] = { totalPlatformFee: 0, totalHostFee: 0, netSettlement: 0 };
        }

        partnerAggregations[t.organizerId].totalPlatformFee += financials.aggregates.totalPlatformFee;
        partnerAggregations[t.organizerId].totalHostFee += financials.aggregates.totalHostFee;
        
        // Partner holds the gross. They owe the platform the platform fee.
        // If the platform holds it, the net settlement is what we owe them.
        // Assuming Partner holds via Sepay -> platform fee is owed by Partner to Platform
        partnerAggregations[t.organizerId].netSettlement += (financials.aggregates.totalPlatformFee * -1); 
    }

    // 2. Create SettlementPeriods
    for (const [partnerId, agg] of Object.entries(partnerAggregations)) {
        if (agg.totalPlatformFee > 0 || agg.totalHostFee > 0) {
            await prisma.settlementPeriod.create({
                data: {
                    partnerId,
                    weekStart: startOfWeek,
                    weekEnd: endOfWeek,
                    totalPlatformFee: agg.totalPlatformFee,
                    totalHostFee: agg.totalHostFee,
                    netSettlement: agg.netSettlement, // Usually negative meaning "Partner owes Platform"
                    status: 'unpaid'
                }
            });
        }
    }

    logger.info(`[WeeklySettlementCron] Completed processing for ${Object.keys(partnerAggregations).length} partners.`);
  } catch (error) {
    logger.error(`[WeeklySettlementCron] Error processing settlement: ${error}`);
  }
}

// Run every Sunday at midnight
cron.schedule('0 0 * * 0', () => {
    processWeeklySettlement();
});
