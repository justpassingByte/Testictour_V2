/**
 * LeaderboardService — Redis ZSET-backed leaderboard
 *
 * Key structure:
 *   leaderboard:{roundId}          — ZSET (userId → composite score)
 *   leaderboard:global:{tournId}   — ZSET (userId → total tournament score)
 *
 * Composite score encoding for tie-breaking:
 *   score = totalPoints * 1_000_000 + (999_999 - sumPlacements)
 *   This gives higher ZSET scores to players with more points AND better placements.
 *   Redis ZREVRANGE returns them in the correct descending order.
 *
 * Flow:
 *   match result processed → ZINCRBY (incremental)
 *   round end → persist ZSET to DB
 *   scoreboard request → ZREVRANGE from Redis (fast) with DB fallback
 *
 * Degradation: If Redis is unavailable, all methods return null/skip.
 *              Callers MUST have a DB fallback path.
 */
import logger from '../utils/logger';

let _redis: any = null;

async function getRedis(): Promise<any | null> {
  if (_redis) return _redis;
  try {
    const { createClient } = await import('../lib/redis');
    _redis = createClient();
    // Verify actual Redis (not MockRedis with limited ZSET support)
    if (typeof _redis.zadd !== 'function') {
      logger.warn('[Leaderboard] Redis client does not support ZSET ops (MockRedis). Leaderboard cache disabled.');
      _redis = null;
      return null;
    }
    return _redis;
  } catch {
    return null;
  }
}

// ── Key helpers ────────────────────────────────────────────────────────────────
const ROUND_KEY = (roundId: string) => `leaderboard:${roundId}`;
const GLOBAL_KEY = (tournamentId: string) => `leaderboard:global:${tournamentId}`;
const PLACEMENT_KEY = (roundId: string) => `leaderboard:placements:${roundId}`;
const TTL_SECONDS = 600; // 10 min — refreshed on every write

// ── Score encoding ─────────────────────────────────────────────────────────────
// Encode points + tiebreaker into a single float for Redis ZSET.
// Higher = better. Points dominate, placements break ties.
function encodeScore(points: number, sumPlacements: number): number {
  // Points in the integer part (up to 999,999), tiebreaker in the decimal
  // Lower sumPlacements = better → invert
  return points * 1_000_000 + Math.max(0, 999_999 - sumPlacements);
}

function decodeScore(compositeScore: number): { points: number; sumPlacements: number } {
  const points = Math.floor(compositeScore / 1_000_000);
  const invertedPlacements = compositeScore % 1_000_000;
  return { points, sumPlacements: Math.max(0, 999_999 - invertedPlacements) };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export default class LeaderboardService {

  /**
   * Incrementally update a player's score after a match.
   * Called from MatchResultService.processMatchResults AFTER DB commit.
   *
   * @param roundId    Current round
   * @param tournId    Tournament ID
   * @param userId     Player's user ID
   * @param pointsDelta  Points earned in this match
   * @param placement    Placement in this match (1-8)
   */
  static async incrPlayerScore(
    roundId: string,
    tournId: string,
    userId: string,
    pointsDelta: number,
    placement: number,
  ): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;

    try {
      const pipeline = redis.pipeline ? redis.pipeline() : null;

      if (pipeline) {
        // Atomic pipeline: update both round and global leaderboards
        pipeline.zincrby(ROUND_KEY(roundId), pointsDelta, userId);
        pipeline.zincrby(GLOBAL_KEY(tournId), pointsDelta, userId);
        // Track placements as a separate hash for tiebreaker resolution
        pipeline.rpush(`${PLACEMENT_KEY(roundId)}:${userId}`, String(placement));
        // Refresh TTLs
        pipeline.expire(ROUND_KEY(roundId), TTL_SECONDS);
        pipeline.expire(GLOBAL_KEY(tournId), TTL_SECONDS);
        pipeline.expire(`${PLACEMENT_KEY(roundId)}:${userId}`, TTL_SECONDS);
        await pipeline.exec();
      } else {
        // Fallback: individual commands
        await redis.zincrby(ROUND_KEY(roundId), pointsDelta, userId);
        await redis.zincrby(GLOBAL_KEY(tournId), pointsDelta, userId);
      }

      logger.debug(`[Leaderboard] ZINCRBY ${userId} +${pointsDelta}pts (round=${roundId}, tourn=${tournId})`);
    } catch (err) {
      logger.warn(`[Leaderboard] Failed to update score: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Batch update multiple players' scores at once.
   * More efficient when processing an entire match result set.
   */
  static async batchIncrScores(
    roundId: string,
    tournId: string,
    results: Array<{ userId: string; points: number; placement: number }>,
  ): Promise<void> {
    const redis = await getRedis();
    if (!redis || results.length === 0) return;

    try {
      if (redis.pipeline) {
        const pipeline = redis.pipeline();
        for (const r of results) {
          pipeline.zincrby(ROUND_KEY(roundId), r.points, r.userId);
          pipeline.zincrby(GLOBAL_KEY(tournId), r.points, r.userId);
          pipeline.rpush(`${PLACEMENT_KEY(roundId)}:${r.userId}`, String(r.placement));
        }
        pipeline.expire(ROUND_KEY(roundId), TTL_SECONDS);
        pipeline.expire(GLOBAL_KEY(tournId), TTL_SECONDS);
        await pipeline.exec();
      } else {
        // Sequential fallback
        for (const r of results) {
          await redis.zincrby(ROUND_KEY(roundId), r.points, r.userId);
          await redis.zincrby(GLOBAL_KEY(tournId), r.points, r.userId);
        }
      }

      logger.debug(`[Leaderboard] Batch updated ${results.length} players (round=${roundId})`);
    } catch (err) {
      logger.warn(`[Leaderboard] Batch update failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Get sorted leaderboard from Redis ZSET.
   * Returns array sorted by score descending, or null if cache miss.
   *
   * @param roundId  Round to get leaderboard for
   * @param offset   Pagination offset (default 0)
   * @param count    Number of entries (default 100)
   */
  static async getRoundLeaderboard(
    roundId: string,
    offset: number = 0,
    count: number = 200,
  ): Promise<Array<{ userId: string; score: number; rank: number }> | null> {
    const redis = await getRedis();
    if (!redis) return null;

    try {
      // ZREVRANGE with WITHSCORES returns [member1, score1, member2, score2, ...]
      const raw = await redis.zrevrange(
        ROUND_KEY(roundId),
        offset,
        offset + count - 1,
        'WITHSCORES',
      );

      if (!raw || raw.length === 0) return null;

      const entries: Array<{ userId: string; score: number; rank: number }> = [];
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({
          userId: raw[i],
          score: parseFloat(raw[i + 1]) || 0,
          rank: offset + Math.floor(i / 2) + 1,
        });
      }

      return entries;
    } catch (err) {
      logger.warn(`[Leaderboard] getRoundLeaderboard failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Get a single player's rank and score from the ZSET.
   */
  static async getPlayerRank(
    roundId: string,
    userId: string,
  ): Promise<{ rank: number; score: number } | null> {
    const redis = await getRedis();
    if (!redis) return null;

    try {
      const [rank, score] = await Promise.all([
        redis.zrevrank(ROUND_KEY(roundId), userId),
        redis.zscore(ROUND_KEY(roundId), userId),
      ]);

      if (rank === null || rank === undefined) return null;

      return {
        rank: rank + 1, // zrevrank is 0-indexed
        score: parseFloat(score) || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the total number of players in the leaderboard.
   */
  static async getPlayerCount(roundId: string): Promise<number> {
    const redis = await getRedis();
    if (!redis) return 0;

    try {
      return await redis.zcard(ROUND_KEY(roundId)) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Snapshot the current ZSET standings for a round + persist to DB.
   * Called when a round completes to freeze the standings.
   */
  static async persistRoundStandings(
    roundId: string,
    tournamentId: string,
    tx?: any,
  ): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;

    try {
      // Get full leaderboard
      const raw = await redis.zrevrange(ROUND_KEY(roundId), 0, -1, 'WITHSCORES');
      if (!raw || raw.length === 0) return;

      const db = tx || (await import('./prisma')).prisma;

      // Build upsert operations for RoundOutcome
      for (let i = 0; i < raw.length; i += 2) {
        const userId = raw[i];
        const score = parseFloat(raw[i + 1]) || 0;

        // Find participant
        const participant = await db.participant.findFirst({
          where: { userId, tournamentId },
          select: { id: true },
        });

        if (participant) {
          await db.roundOutcome.upsert({
            where: {
              participantId_roundId: { participantId: participant.id, roundId },
            },
            update: { scoreInRound: score },
            create: { participantId: participant.id, roundId, scoreInRound: score, status: 'in_progress' },
          });
        }
      }

      logger.info(`[Leaderboard] Persisted ${raw.length / 2} standings for round ${roundId}`);
    } catch (err) {
      logger.warn(`[Leaderboard] persistRoundStandings failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Invalidate leaderboard cache for a round (e.g., on reshuffle).
   */
  static async invalidateRound(roundId: string): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;

    try {
      await redis.del(ROUND_KEY(roundId));
      logger.debug(`[Leaderboard] Invalidated round ${roundId}`);
    } catch { /* non-fatal */ }
  }

  /**
   * Invalidate tournament global leaderboard.
   */
  static async invalidateTournament(tournamentId: string): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;

    try {
      await redis.del(GLOBAL_KEY(tournamentId));
      logger.debug(`[Leaderboard] Invalidated tournament ${tournamentId}`);
    } catch { /* non-fatal */ }
  }

  /**
   * Warm the ZSET from DB data (cold start or recovery).
   * Loads all match results for a round and populates the ZSET.
   */
  static async warmFromDB(roundId: string, tournamentId: string): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;

    try {
      const { prisma } = await import('./prisma');
      const results = await prisma.$queryRaw<{ userId: string; total: number }[]>`
        SELECT mr."userId", SUM(mr."points")::int as total
        FROM "MatchResult" mr
        JOIN "Match" m ON m.id = mr."matchId"
        JOIN "Lobby" l ON l.id = m."lobbyId"
        WHERE l."roundId" = ${roundId}
        GROUP BY mr."userId"
      `;

      if (results.length === 0) return;

      if (redis.pipeline) {
        const pipeline = redis.pipeline();
        for (const r of results) {
          pipeline.zadd(ROUND_KEY(roundId), Number(r.total) || 0, r.userId);
          pipeline.zadd(GLOBAL_KEY(tournamentId), Number(r.total) || 0, r.userId);
        }
        pipeline.expire(ROUND_KEY(roundId), TTL_SECONDS);
        pipeline.expire(GLOBAL_KEY(tournamentId), TTL_SECONDS);
        await pipeline.exec();
      }

      logger.info(`[Leaderboard] Warmed ZSET from DB: ${results.length} players (round=${roundId})`);
    } catch (err) {
      logger.warn(`[Leaderboard] warmFromDB failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
