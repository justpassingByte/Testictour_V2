/**
 * Bracket Cache Service
 * 
 * Caches the pre-computed bracket JSON for each tournament.
 * Uses Redis if available, falls back to in-memory Map.
 * 
 * Cache key: bracket:{tournamentId}
 * TTL: 5 minutes (safety net — normally invalidated on bracket changes)
 * 
 * Invalidation points (all places that emit 'bracket_update'):
 *   - RoundService.preAssignGroups
 *   - RoundService.reshuffleAfterElimination
 *   - RoundService.autoAdvance (round started, round completed, phase transitions)
 *   - worker.ts (fetchMatchData result processing)
 *   - roundCompletionWorker
 *   - dev.routes.ts (simulate-match)
 */
import { createClient } from '../lib/redis';
import logger from '../utils/logger';

const CACHE_PREFIX = 'bracket:';
const CACHE_TTL_SECONDS = 300; // 5 minutes safety TTL

class BracketCacheService {
  private redis: any;

  constructor() {
    this.redis = createClient();
  }

  private key(tournamentId: string): string {
    return `${CACHE_PREFIX}${tournamentId}`;
  }

  /**
   * Get cached bracket data for a tournament.
   * Returns parsed object or null if not cached.
   */
  async get(tournamentId: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(this.key(tournamentId));
      if (cached) {
        logger.debug(`[BracketCache] HIT for tournament ${tournamentId}`);
        return JSON.parse(cached);
      }
      logger.debug(`[BracketCache] MISS for tournament ${tournamentId}`);
      return null;
    } catch (err) {
      logger.warn(`[BracketCache] Error reading cache: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Store bracket data in cache.
   */
  async set(tournamentId: string, data: any): Promise<void> {
    try {
      await this.redis.set(this.key(tournamentId), JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
      logger.debug(`[BracketCache] SET for tournament ${tournamentId} (TTL=${CACHE_TTL_SECONDS}s)`);
    } catch (err) {
      logger.warn(`[BracketCache] Error writing cache: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Invalidate (delete) cached bracket for a tournament.
   * Call this whenever bracket data changes.
   */
  async invalidate(tournamentId: string): Promise<void> {
    try {
      await this.redis.del(this.key(tournamentId));
      logger.debug(`[BracketCache] INVALIDATED for tournament ${tournamentId}`);
    } catch (err) {
      logger.warn(`[BracketCache] Error invalidating cache: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// Singleton export
export const bracketCache = new BracketCacheService();
