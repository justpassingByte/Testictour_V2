/**
 * Shared ioredis client for lobby ready state management.
 * BullMQ already depends on ioredis, so it's available transitively.
 *
 * Usage: import redisClient from '../lib/redis'
 */
import Redis from 'ioredis';
import { URL } from 'url';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

function buildRedisOptions() {
  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.substring(1)) || 0 : 0,
      family: 0,
      lazyConnect: true,
    };
  } catch {
    return { host: 'localhost', port: 6379, lazyConnect: true };
  }
}

let instance: any = null;

class MockRedis {
  private kv = new Map<string, { value: string; expiresAt?: number }>();
  private sets = new Map<string, Set<string>>();

  private checkExpiry(key: string) {
    const item = this.kv.get(key);
    if (item && item.expiresAt && Date.now() > item.expiresAt) {
      this.kv.delete(key);
    }
  }

  async smembers(key: string): Promise<string[]> {
    return Array.from(this.sets.get(key) || []);
  }

  async sismember(key: string, value: string): Promise<number> {
    const s = this.sets.get(key);
    return s?.has(value) ? 1 : 0;
  }

  async sadd(key: string, value: string): Promise<number> {
    const s = this.sets.get(key) || new Set();
    const added = s.has(value) ? 0 : 1;
    s.add(value);
    this.sets.set(key, s);
    return added;
  }

  async srem(key: string, value: string): Promise<number> {
    const s = this.sets.get(key);
    if (!s) return 0;
    const removed = s.delete(value) ? 1 : 0;
    if (s.size === 0) this.sets.delete(key);
    return removed;
  }

  async scard(key: string): Promise<number> {
    return this.sets.get(key)?.size || 0;
  }

  async get(key: string): Promise<string | null> {
    this.checkExpiry(key);
    return this.kv.get(key)?.value || null;
  }

  async set(key: string, value: string, nxpx?: string, exppx?: string | number, ttl?: number): Promise<'OK' | null> {
    // Basic support for SET key value NX PX ttl
    this.checkExpiry(key);
    const exists = this.kv.has(key);
    
    let isNx = false;
    let isPx = false;
    let ttlMs: number | undefined = undefined;

    const args = [nxpx, exppx, ttl].filter(Boolean);
    if (args.includes('NX')) isNx = true;
    const pxIdx = args.indexOf('PX');
    if (pxIdx !== -1 && args.length > pxIdx + 1) {
      isPx = true;
      ttlMs = Number(args[pxIdx + 1]);
    } else {
      const exIdx = args.indexOf('EX');
      if (exIdx !== -1 && args.length > exIdx + 1) {
        ttlMs = Number(args[exIdx + 1]) * 1000;
      }
    }

    if (isNx && exists) return null;

    this.kv.set(key, { 
      value, 
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined 
    });

    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deletedKv = this.kv.delete(key) ? 1 : 0;
    const deletedSet = this.sets.delete(key) ? 1 : 0;
    return deletedKv || deletedSet;
  }
}

/**
 * Returns a singleton ioredis client. If REDIS_URL is not set, returns an in-memory mock.
 */
export function createClient(): any {
  if (!instance) {
    if (process.env.REDIS_URL) {
      instance = new Redis(buildRedisOptions() as any);
      instance.on('error', (err: any) => {
        console.error('[redis] Client error:', err.message);
      });
    } else {
      console.warn('[redis] REDIS_URL not set — using in-memory Local Mock for lobby state.');
      instance = new MockRedis();
    }
  }
  return instance;
}

export default { createClient };
