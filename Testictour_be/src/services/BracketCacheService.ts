/**
 * Bracket Cache Service
 * 
 * Proxies through TournamentCacheService for unified key management.
 * Maintained as a thin wrapper for backward compatibility — existing code
 * imports { bracketCache } from this file.
 * 
 * Cache key: bracket:{tournamentId}
 * TTL: 30 seconds
 * 
 * Invalidation points (all places that emit 'bracket_update'):
 *   - RoundService.preAssignGroups
 *   - RoundService.reshuffleAfterElimination
 *   - RoundService.autoAdvance
 *   - worker.ts (fetchMatchData result processing)
 *   - roundCompletionWorker
 *   - dev.routes.ts (simulate-match)
 */
import { tournamentCache } from './TournamentCacheService';
import logger from '../utils/logger';

class BracketCacheService {
  /**
   * Get cached bracket data for a tournament.
   * Returns parsed object or null if not cached.
   */
  async get(tournamentId: string): Promise<any | null> {
    return tournamentCache.getBracket(tournamentId);
  }

  /**
   * Store bracket data in cache.
   */
  async set(tournamentId: string, data: any): Promise<void> {
    return tournamentCache.setBracket(tournamentId, data);
  }

  /**
   * Invalidate (delete) cached bracket for a tournament.
   * Call this whenever bracket data changes.
   */
  async invalidate(tournamentId: string): Promise<void> {
    return tournamentCache.invalidateBracket(tournamentId);
  }
}

// Singleton export — backward compatible
export const bracketCache = new BracketCacheService();
