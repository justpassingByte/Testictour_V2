import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import SettingsService from './SettingsService';

export type FeeBreakdown = {
  entryFee: number;
  platformFee: number;
  hostFee: number;
  prizeContribution: number;
  platformFeePercent: number;
  hostFeePercent: number;
};

export default class FeeCalculationService {
  /**
   * Calculates the fee breakdown for a single participant entry.
   * V7 requires fee to ALWAYS be calculated from entry fee, NOT from prize pool.
   * Sponsor contributions should NEVER be charged a fee.
   */
  static async calculateEntryFeeBreakdown(
    tournamentId: string,
    entryFee: number,
    hostFeePercentOverride?: number
  ): Promise<FeeBreakdown> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { organizer: { include: { partnerSubscription: true } } },
    });

    if (!tournament) {
      throw new ApiError(404, 'Tournament not found for fee calculation');
    }

    // Determine platform fee percent from subscription plan
    const planName = tournament.organizer?.partnerSubscription?.plan || 'STARTER';
    const planConfig = await prisma.subscriptionPlanConfig.findUnique({ where: { plan: planName } });
    const platformFeePercent = planConfig?.platformFeePercent ?? 0.05;

    // Determine host fee percent. Override > Tournament setting > Default
    const hostFeePercent = hostFeePercentOverride ?? tournament.hostFeePercent ?? 0.0;

    // Calculate per-player breakdown
    const platformFee = entryFee * platformFeePercent;
    const hostFee = entryFee * hostFeePercent;
    const prizeContribution = entryFee - platformFee - hostFee;

    return {
      entryFee,
      platformFee,
      hostFee,
      prizeContribution,
      platformFeePercent,
      hostFeePercent,
    };
  }

  /**
   * Calculate total prize pool and fee aggregations for a tournament based on participant count.
   * NOTE: This explicitly separates entry contributions from sponsor contributions,
   * as sponsor money is not subject to platform/host fees.
   */
  static async calculateTournamentAggregateFinancials(
    tournamentId: string,
    participantCount: number,
    sponsorContributionAmount: number = 0
  ) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    const entryFee = tournament.entryFee || 0;
    
    // Per-entry breakdown
    const breakdown = await this.calculateEntryFeeBreakdown(tournamentId, entryFee);

    // Aggregate totals
    const totalEntryRevenue = entryFee * participantCount;
    const totalPlatformFee = breakdown.platformFee * participantCount;
    const totalHostFee = breakdown.hostFee * participantCount;
    
    // Total prize pool includes entry prize contribution + 100% of sponsor contribution
    const entryPrizePool = breakdown.prizeContribution * participantCount;
    const totalPrizePool = entryPrizePool + sponsorContributionAmount;

    return {
      participantCount,
      perEntryBreakdown: breakdown,
      aggregates: {
        totalEntryRevenue,
        totalPlatformFee,
        totalHostFee,
        entryPrizePool,
        sponsorContributionAmount,
        totalPrizePool
      }
    };
  }
}
