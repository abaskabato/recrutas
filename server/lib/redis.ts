/**
 * Upstash Redis client with graceful in-memory fallback.
 *
 * Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable Redis.
 * Without these, all operations use an in-process Map (single-instance only).
 */

import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisEnabled = !!(REDIS_URL && REDIS_TOKEN);

// Real Redis client
let _redis: Redis | null = null;
if (redisEnabled) {
  _redis = new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
  console.log('[Redis] Upstash Redis connected');
} else {
  console.log('[Redis] No UPSTASH_REDIS_REST_URL set — using in-process fallback');
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const memStore = new Map<string, { value: string; expiresAt?: number }>();

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return entry.value;
}

function memSet(key: string, value: string, exSeconds?: number): void {
  memStore.set(key, { value, expiresAt: exSeconds ? Date.now() + exSeconds * 1000 : undefined });
}

function memIncr(key: string): number {
  const cur = parseInt(memGet(key) || '0', 10);
  const next = cur + 1;
  const entry = memStore.get(key);
  memStore.set(key, { value: String(next), expiresAt: entry?.expiresAt });
  return next;
}

function memExpire(key: string, seconds: number): void {
  const entry = memStore.get(key);
  if (entry) memStore.set(key, { ...entry, expiresAt: Date.now() + seconds * 1000 });
}

// ── Unified adapter ───────────────────────────────────────────────────────────

export const redis = {
  async get(key: string): Promise<string | null> {
    if (_redis) return (await _redis.get<string>(key)) ?? null;
    return memGet(key);
  },

  async set(key: string, value: string, exSeconds?: number): Promise<void> {
    if (_redis) {
      if (exSeconds) await _redis.set(key, value, { ex: exSeconds });
      else await _redis.set(key, value);
    } else {
      memSet(key, value, exSeconds);
    }
  },

  async del(key: string): Promise<void> {
    if (_redis) await _redis.del(key);
    else memStore.delete(key);
  },

  /** Atomic increment — returns new value */
  async incr(key: string): Promise<number> {
    if (_redis) return await _redis.incr(key);
    return memIncr(key);
  },

  /** Set TTL on existing key */
  async expire(key: string, seconds: number): Promise<void> {
    if (_redis) await _redis.expire(key, seconds);
    else memExpire(key, seconds);
  },

  /** Increment and set TTL atomically (pipeline if Redis, sequential if memory) */
  async incrWithExpire(key: string, seconds: number): Promise<number> {
    if (_redis) {
      const pipe = _redis.pipeline();
      pipe.incr(key);
      pipe.expire(key, seconds);
      const results = await pipe.exec();
      return results[0] as number;
    }
    const v = memIncr(key);
    memExpire(key, seconds);
    return v;
  },
};
