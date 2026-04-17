/**
 * TournamentCacheService — Unified caching layer for all tournament data
 *
 * Key structure:
 *   bracket:{tournamentId}                — JSON bracket data (30s TTL)
 *   scoreboard:{roundId}:{limitMatch}     — JSON scoreboard (15s TTL)
 *   lobby:state:{lobbyId}                 — JSON lobby snapshot (10s TTL)
 *   leaderboard:{roundId}                 — ZSET (managed by LeaderboardService)
 *   leaderboard:global:{tournamentId}     — ZSET (managed by LeaderboardService)
 *
 * TTL strategy:
 *   - Dynamic data (scoreboard, lobby state): 10-15s
 *   - Semi-static data (bracket): 30s
 *   - Leaderboard ZSET: 10 min (refreshed on every write)
 *   - All caches invalidated on relevant mutations
 *
 * Invalidation triggers:
 *   - matchResult processed → scoreboard, bracket
 *   - lobby state change → lobby state, bracket
 *   - round completion → all caches for that round
 *   - phase/tournament state change → bracket
 */
import { createClient } from '../lib/redis';
import logger from '../utils/logger';

// ── TTL configuration ──────────────────────────────────────────────────────────

const TTL = {
  BRACKET: 30,         // seconds — semi-static, full bracket structure
  SCOREBOARD: 15,      // seconds — active games, scores changing
  LOBBY_STATE: 10,     // seconds — very dynamic during ready check
} as const;

// ── Key prefixes ───────────────────────────────────────────────────────────────

const KEY = {
  BRACKET: (tournamentId: string) => `bracket:${tournamentId}`,
  SCOREBOARD: (roundId: string, limitMatch: string) => `scoreboard:${roundId}:${limitMatch}`,
  LOBBY_STATE: (lobbyId: string) => `lobby:state:${lobbyId}`,
} as const;

class TournamentCacheService {
  private redis: any;

  constructor() {
    this.redis = createClient();
  }

  // ── Bracket cache (existing behavior, unified here) ──

  async getBracket(tournamentId: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(KEY.BRACKET(tournamentId));
      if (cached) {
        logger.debug(`[Cache] BRACKET HIT: ${tournamentId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch { return null; }
  }

  async setBracket(tournamentId: string, data: any): Promise<void> {
    try {
      await this.redis.set(KEY.BRACKET(tournamentId), JSON.stringify(data), 'EX', TTL.BRACKET);
    } catch { /* non-fatal */ }
  }

  async invalidateBracket(tournamentId: string): Promise<void> {
    try {
      await this.redis.del(KEY.BRACKET(tournamentId));
    } catch { /* non-fatal */ }
  }

  // ── Scoreboard cache ──

  async getScoreboard(roundId: string, limitMatch?: number | null): Promise<any | null> {
    try {
      const key = KEY.SCOREBOARD(roundId, String(limitMatch ?? 'all'));
      const cached = await this.redis.get(key);
      if (cached) {
        logger.debug(`[Cache] SCOREBOARD HIT: round=${roundId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch { return null; }
  }

  async setScoreboard(roundId: string, limitMatch: number | null, data: any): Promise<void> {
    try {
      const key = KEY.SCOREBOARD(roundId, String(limitMatch ?? 'all'));
      await this.redis.set(key, JSON.stringify(data), 'EX', TTL.SCOREBOARD);
    } catch { /* non-fatal */ }
  }

  async invalidateScoreboard(roundId: string): Promise<void> {
    try {
      // Delete known variants
      const variants = ['all', '1', '2', '3', '4', '5'];
      if (this.redis.pipeline) {
        const pipeline = this.redis.pipeline();
        for (const v of variants) {
          pipeline.del(KEY.SCOREBOARD(roundId, v));
        }
        await pipeline.exec();
      } else {
        for (const v of variants) {
          await this.redis.del(KEY.SCOREBOARD(roundId, v));
        }
      }
    } catch { /* non-fatal */ }
  }

  // ── Lobby state cache ──

  async getLobbyState(lobbyId: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(KEY.LOBBY_STATE(lobbyId));
      if (cached) return JSON.parse(cached);
      return null;
    } catch { return null; }
  }

  async setLobbyState(lobbyId: string, data: any): Promise<void> {
    try {
      await this.redis.set(KEY.LOBBY_STATE(lobbyId), JSON.stringify(data), 'EX', TTL.LOBBY_STATE);
    } catch { /* non-fatal */ }
  }

  async invalidateLobbyState(lobbyId: string): Promise<void> {
    try {
      await this.redis.del(KEY.LOBBY_STATE(lobbyId));
    } catch { /* non-fatal */ }
  }

  // ── Bulk invalidation ──

  /**
   * Invalidate all caches related to a tournament.
   * Called on major state transitions (round completion, phase advancement).
   */
  async invalidateAll(tournamentId: string, roundId?: string): Promise<void> {
    try {
      const ops: Promise<void>[] = [this.invalidateBracket(tournamentId)];
      if (roundId) {
        ops.push(this.invalidateScoreboard(roundId));
      }
      await Promise.all(ops);
      logger.debug(`[Cache] INVALIDATED ALL for tournament=${tournamentId}`);
    } catch { /* non-fatal */ }
  }
}

// Singleton export
export const tournamentCache = new TournamentCacheService();
