import logger from '../utils/logger';

type PrizeStructure = Record<string, number>; // e.g. { '1': 400000, '2': 300000, ... }

export default class PrizeCalculationService {
  /**
   * Adjusts the prize structure percentages so that total payout <= totalDistributablePrizePool,
   * prioritizing top ranks. This function does NOT calculate fees.
   */
  static autoAdjustPrizeStructure(
    original: PrizeStructure,
    totalDistributablePrizePool: number // The final amount available for prizes after all fees
  ): { adjusted: PrizeStructure; finalPayout: number } {
    logger.info(
      `Starting prize structure adjustment for distributable pool: ${totalDistributablePrizePool}`,
      { original }
    );

    let remaining = totalDistributablePrizePool;
    const adjusted: PrizeStructure = {};
    // Sort by rank (1,2,3...)
    const sortedRanks = Object.keys(original).sort((a, b) => Number(a) - Number(b));

    for (const rank of sortedRanks) {
      const desiredAmount = original[rank];
      if (remaining >= desiredAmount) {
        adjusted[rank] = desiredAmount;
        remaining -= desiredAmount;
      } else if (remaining > 0) {
        adjusted[rank] = remaining;
        remaining = 0;
      } else {
        logger.warn(`No remaining prize pool for rank ${rank}. Stopping adjustment.`);
        break;
      }
    }

    logger.info(`Finished prize structure adjustment. Adjusted prize:`, { adjusted, finalPayout: totalDistributablePrizePool - remaining });
    return { adjusted, finalPayout: totalDistributablePrizePool - remaining };
  }

  /**
   * Handles final prize distribution when a tournament is force-completed
   * Used especially for Checkmate phases that reach maximum rounds limit
   */
  static getFinalPrizeDistribution(
    participants: Array<{ id: string; userId: string; scoreTotal: number; eliminated: boolean }>,
    prizeStructure: PrizeStructure,
    prizePool: number
  ): Array<{ participantId: string; amount: number; rank: number }> {
    logger.info(`Calculating final prize distribution for ${participants.length} participants`);
    
    // We assume `participants` are ALREADY sorted by the caller using the correct tiebreakers (e.g. RoundService.tiebreakComparator).
    // Re-sorting here would destroy the complex tiebreaking logic (placements, etc.).
    const sortedParticipants = [...participants];

    
    // Calculate prize for each eligible participant based on their position
    const distribution: Array<{ participantId: string; amount: number; rank: number }> = [];
    
    const isArray = Array.isArray(prizeStructure);
    
    for (let i = 0; i < sortedParticipants.length; i++) {
      const participant = sortedParticipants[i];
      const rank = i + 1; // 1-indexed position
      
      // Check if this rank/position gets a prize according to structure
      const prizePercentage = isArray 
        ? (prizeStructure as any)[i] 
        : prizeStructure[rank.toString()];

      if (prizePercentage !== undefined && prizePercentage !== null) {
        const normalizedPercentage = prizePercentage > 1 ? prizePercentage / 100 : prizePercentage;
        const amount = prizePool * normalizedPercentage;
        
        if (amount > 0) {
          distribution.push({
            participantId: participant.id,
            amount,
            rank
          });
        }
      }
    }
    
    logger.info(`Final prize distribution calculated for ${distribution.length} winners`);
    return distribution;
  }

  /**
   * Dynamically calculates prize distribution percentages based on the number of actual participants.
   * - 8+ players: Top 4 (40%, 30%, 20%, 10%)
   * - 6-7 players: Top 3 (50%, 30%, 20%)
   * - 4-5 players: Top 2 (60%, 40%)
   * - <4 players: Winner Takes All (100%)
   */
  static getDynamicPrizeDistribution(participantCount: number): PrizeStructure {
    if (participantCount >= 8) {
      return { "1": 0.4, "2": 0.3, "3": 0.2, "4": 0.1 };
    } else if (participantCount >= 6) {
      return { "1": 0.5, "2": 0.3, "3": 0.2 };
    } else if (participantCount >= 4) {
      return { "1": 0.6, "2": 0.4 };
    } else {
      return { "1": 1.0 };
    }
  }
} 