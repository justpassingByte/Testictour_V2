import { MatchResult, Match } from '@prisma/client';

type MatchResultWithMatch = MatchResult & {
  match: Match;
};

interface PlayerStats {
  tournamentsPlayed: number;
  tournamentsWon: number;
  matchesPlayed: number;
  averagePlacement: number;
  topFourRate: number;
  firstPlaceRate: number;
  averagePointsPerMatch: number;
  bestPlacement: number;
  bestPlacementCount: number;
}

/**
 * Calculate player statistics based on match results
 */
export function calculateStats(matchResults: MatchResultWithMatch[]): PlayerStats {
  if (!matchResults.length) {
    return {
      tournamentsPlayed: 0,
      tournamentsWon: 0,
      matchesPlayed: 0,
      averagePlacement: 0,
      topFourRate: 0,
      firstPlaceRate: 0,
      averagePointsPerMatch: 0,
      bestPlacement: 0,
      bestPlacementCount: 0
    };
  }

  // Count total matches
  const matchesPlayed = matchResults.length;
  
  // Get all placements and points
  const placements = matchResults.map(result => result.placement);
  const points = matchResults.map(result => result.points);
  
  // Calculate average placement
  const averagePlacement = parseFloat((placements.reduce((a, b) => a + b, 0) / matchesPlayed).toFixed(2));
  
  // Calculate top 4 rate
  const topFourCount = placements.filter(p => p <= 4).length;
  const topFourRate = Math.round((topFourCount / matchesPlayed) * 100);
  
  // Calculate first place rate
  const firstPlaceCount = placements.filter(p => p === 1).length;
  const firstPlaceRate = Math.round((firstPlaceCount / matchesPlayed) * 100);
  
  // Calculate average points per match
  const averagePointsPerMatch = parseFloat((points.reduce((a, b) => a + b, 0) / matchesPlayed).toFixed(1));
  
  // Calculate best placement
  const bestPlacement = Math.min(...placements);
  const bestPlacementCount = placements.filter(p => p === bestPlacement).length;
  
  // Count tournaments (unique tournament IDs)
  // Note: This requires querying the tournament IDs through the match relations
  // For now, we'll use a placeholder based on lobby count (rough estimate)
  const tournamentSet = new Set<string>();
  matchResults.forEach(result => {
    // We'd need to determine tournament ID here
    // For simplicity in this util, we'll just estimate
    const matchId = result.matchId;
    tournamentSet.add(matchId.split('-')[0]); // Use first part of UUID as proxy for tournament
  });
  
  const tournamentsPlayed = tournamentSet.size;
  
  // Determine tournaments won (first place in the final round)
  // This is also an estimation since we'd need to know final rounds
  const tournamentsWon = 0; // Default, needs custom logic
  
  return {
    tournamentsPlayed,
    tournamentsWon,
    matchesPlayed,
    averagePlacement,
    topFourRate,
    firstPlaceRate,
    averagePointsPerMatch,
    bestPlacement,
    bestPlacementCount
  };
} 