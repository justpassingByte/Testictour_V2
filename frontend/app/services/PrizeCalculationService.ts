import { PrizeStructure } from '../types/tournament';

export class PrizeCalculationService {
  // TODO: Implement frontend service methods

  static autoAdjustPrizeStructure(
    original: PrizeStructure,
    actualParticipants: number,
    entryFee: number,
    hostFeePercent: number
  ): { adjusted: PrizeStructure; prizePool: number; hostFee: number } {
    const totalCollected = actualParticipants * entryFee;
    const hostFee = Math.max(Math.floor(totalCollected * hostFeePercent), 0);
    const prizePool = totalCollected - hostFee;

    const sortedRanks = Object.keys(original).sort((a, b) => Number(a) - Number(b));
    let remaining = prizePool;
    const adjusted: PrizeStructure = {};
    for (const rank of sortedRanks) {
      const want = original[rank];
      if (remaining >= want) {
        adjusted[rank] = want;
        remaining -= want;
      } else if (remaining > 0) {
        adjusted[rank] = remaining;
        remaining = 0;
      } else {
        break;
      }
    }
    return { adjusted, prizePool, hostFee };
  }
} 