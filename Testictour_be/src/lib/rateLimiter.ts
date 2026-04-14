import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * Redis-backed Token Bucket Rate Limiter for external API calls (Riot/Grimoire).
 *
 * Uses a sliding-window token bucket stored in Redis as a sorted set.
 * Before any API call, the caller must `consume()` a token. If the bucket is
 * empty, the call blocks until a token becomes available — preventing 429 errors
 * from Riot and ensuring fair distribution across all concurrent workers.
 *
 * Default limits are tuned for a development Riot API key:
 *   - 20 requests / 1 second
 *   - 100 requests / 2 minutes (120 seconds)
 *
 * Production keys can override these via constructor or env vars.
 */

export interface RateLimiterConfig {
  /** Max requests allowed per short window */
  shortWindowMax: number;
  /** Short window duration in milliseconds */
  shortWindowMs: number;
  /** Max requests allowed per long window */
  longWindowMax: number;
  /** Long window duration in milliseconds */
  longWindowMs: number;
  /** Redis key prefix */
  keyPrefix: string;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  shortWindowMax: parseInt(process.env.RATE_LIMIT_SHORT_MAX || '20', 10),
  shortWindowMs: parseInt(process.env.RATE_LIMIT_SHORT_WINDOW_MS || '1000', 10),
  longWindowMax: parseInt(process.env.RATE_LIMIT_LONG_MAX || '100', 10),
  longWindowMs: parseInt(process.env.RATE_LIMIT_LONG_WINDOW_MS || '120000', 10),
  keyPrefix: 'ratelimit:grimoire',
};

export class RateLimiter {
  private redis: Redis;
  private config: RateLimiterConfig;
  private shortKey: string;
  private longKey: string;

  constructor(redis: Redis, config?: Partial<RateLimiterConfig>) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.shortKey = `${this.config.keyPrefix}:short`;
    this.longKey = `${this.config.keyPrefix}:long`;
  }

  /**
   * Consume a token. Blocks (with async sleep) until a token is available.
   * Returns the wait time in ms (0 if no wait was needed).
   */
  async consume(): Promise<number> {
    let totalWait = 0;
    const maxAttempts = 60; // Max 60s total wait to prevent infinite loops

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const waitMs = await this._tryConsume();
      if (waitMs === 0) {
        if (totalWait > 0) {
          logger.debug(`[RateLimiter] Token acquired after waiting ${totalWait}ms`);
        }
        return totalWait;
      }

      // Sleep for the required wait time
      logger.debug(`[RateLimiter] Rate limit reached, waiting ${waitMs}ms (attempt ${attempt + 1})`);
      await this._sleep(waitMs);
      totalWait += waitMs;
    }

    // If we've waited too long, log a warning but allow the request through
    logger.warn(`[RateLimiter] Exceeded max wait time (${totalWait}ms). Allowing request through.`);
    return totalWait;
  }

  /**
   * Try to consume a token. Returns 0 if successful, or the ms to wait before retrying.
   * Uses a Lua script for atomic check-and-add.
   */
  private async _tryConsume(): Promise<number> {
    const now = Date.now();

    // Lua script: atomically check both windows and add if allowed
    const luaScript = `
      local shortKey = KEYS[1]
      local longKey = KEYS[2]
      local now = tonumber(ARGV[1])
      local shortWindowMs = tonumber(ARGV[2])
      local shortMax = tonumber(ARGV[3])
      local longWindowMs = tonumber(ARGV[4])
      local longMax = tonumber(ARGV[5])
      local tokenId = ARGV[6]

      -- Clean expired entries from both windows
      redis.call('ZREMRANGEBYSCORE', shortKey, '-inf', now - shortWindowMs)
      redis.call('ZREMRANGEBYSCORE', longKey, '-inf', now - longWindowMs)

      -- Count current entries in both windows
      local shortCount = redis.call('ZCARD', shortKey)
      local longCount = redis.call('ZCARD', longKey)

      -- Check short window
      if shortCount >= shortMax then
        -- Find oldest entry to calculate wait time
        local oldest = redis.call('ZRANGE', shortKey, 0, 0, 'WITHSCORES')
        if #oldest >= 2 then
          local waitUntil = tonumber(oldest[2]) + shortWindowMs
          return waitUntil - now
        end
        return 1000  -- Default 1s wait
      end

      -- Check long window
      if longCount >= longMax then
        local oldest = redis.call('ZRANGE', longKey, 0, 0, 'WITHSCORES')
        if #oldest >= 2 then
          local waitUntil = tonumber(oldest[2]) + longWindowMs
          return waitUntil - now
        end
        return 5000  -- Default 5s wait
      end

      -- Both windows have capacity — add the token
      redis.call('ZADD', shortKey, now, tokenId)
      redis.call('ZADD', longKey, now, tokenId)

      -- Set TTL on keys to auto-cleanup
      redis.call('PEXPIRE', shortKey, shortWindowMs + 1000)
      redis.call('PEXPIRE', longKey, longWindowMs + 1000)

      return 0  -- Success
    `;

    try {
      const tokenId = `${now}-${Math.random().toString(36).substring(2, 8)}`;
      const result = await this.redis.eval(
        luaScript,
        2,
        this.shortKey,
        this.longKey,
        now.toString(),
        this.config.shortWindowMs.toString(),
        this.config.shortWindowMax.toString(),
        this.config.longWindowMs.toString(),
        this.config.longWindowMax.toString(),
        tokenId,
      ) as number;

      return Math.max(0, result);
    } catch (err) {
      // If Redis fails, allow the request through (fail-open)
      logger.warn(`[RateLimiter] Redis error, allowing request through: ${err}`);
      return 0;
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ── Singleton instance ──────────────────────────────────────────────────────────
// Lazily initialized when first consumed. Uses the same Redis connection config
// as BullMQ queues.

let _instance: RateLimiter | null = null;

/**
 * Get the global rate limiter instance. Creates one on first call.
 * Returns null if REDIS_URL is not configured (rate limiting disabled).
 */
export function getGrimoireRateLimiter(): RateLimiter | null {
  if (_instance) return _instance;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn('[RateLimiter] REDIS_URL not set — rate limiting disabled');
    return null;
  }

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableReadyCheck: false,
    });
    _instance = new RateLimiter(redis);
    logger.info('[RateLimiter] Grimoire rate limiter initialized');
    return _instance;
  } catch (err) {
    logger.warn(`[RateLimiter] Failed to initialize: ${err}`);
    return null;
  }
}
