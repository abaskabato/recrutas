/**
 * Distributed Groq Rate Limiter backed by Redis (Upstash).
 *
 * Replaces the in-process token bucket with Redis atomic counters so
 * state is shared across all Vercel instances — prevents N instances
 * from collectively exceeding the Groq rate limit.
 *
 * Falls back transparently to the original in-process limiter when
 * Redis is not configured.
 */

import { redis, redisEnabled } from './redis.js';
import { throttledGroqRequest, getLimiterStats, getCachedSummary, setCachedSummary, summaryKey } from './groq-limiter.js';
export type { GroqPriority } from './groq-limiter.js';

// Re-export LRU cache helpers unchanged (they stay in-process; they're read-only summaries)
export { getCachedSummary, setCachedSummary, summaryKey, getLimiterStats };

// Redis key namespace
const GROQ_REQ_KEY = 'groq:req_count';
const GROQ_CIRCUIT_KEY = 'groq:circuit_pause_until';
const GROQ_429_KEY = 'groq:consecutive_429s';

// Conservative limits (below Groq free tier: 6k tokens/min, 30 req/min)
const REQ_WINDOW_SECONDS = 60;
const REQ_MAX = 25;

/**
 * Distributed request-level rate check using Redis INCR + TTL window.
 * Returns true if the request is allowed, false if rate-limited.
 */
async function isAllowedDistributed(): Promise<boolean> {
  if (!redisEnabled) return true; // let local limiter handle it

  const count = await redis.incrWithExpire(GROQ_REQ_KEY, REQ_WINDOW_SECONDS);
  return count <= REQ_MAX;
}

/**
 * Check if circuit breaker is open (distributed).
 */
async function isCircuitOpen(): Promise<boolean> {
  if (!redisEnabled) return false;
  const val = await redis.get(GROQ_CIRCUIT_KEY);
  if (!val) return false;
  return Date.now() < parseInt(val, 10);
}

/**
 * Trip circuit breaker (distributed). pauseMs = how long to pause.
 */
async function tripCircuit(pauseMs: number): Promise<void> {
  if (!redisEnabled) return;
  const until = Date.now() + pauseMs;
  await redis.set(GROQ_CIRCUIT_KEY, String(until), Math.ceil(pauseMs / 1000) + 5);
}

/**
 * Wrap a Groq API call with distributed rate limiting + local priority queue fallback.
 *
 * When Redis is available: distributed req/min counter + distributed circuit breaker.
 * When Redis is absent: delegates entirely to the local in-process limiter.
 */
export async function throttledGroqRequestDistributed<T>(
  fn: () => Promise<T>,
  priority: import('./groq-limiter.js').GroqPriority = 'medium',
  estimatedTokens: number = 1000
): Promise<T> {
  if (!redisEnabled) {
    // No Redis — use original in-process limiter
    return throttledGroqRequest(fn, priority, estimatedTokens);
  }

  // Check distributed circuit breaker
  if (await isCircuitOpen()) {
    const val = await redis.get(GROQ_CIRCUIT_KEY);
    const remaining = val ? Math.ceil((parseInt(val, 10) - Date.now()) / 1000) : 0;
    throw new Error(`[GroqLimiter] Circuit breaker open (${remaining}s remaining)`);
  }

  // Check distributed request rate
  const allowed = await isAllowedDistributed();
  if (!allowed) {
    // Still allow critical requests through (will rely on Groq's own 429 + local queue)
    if (priority !== 'critical' && priority !== 'high') {
      throw new Error('[GroqLimiter] Distributed rate limit reached — dropping low-priority request');
    }
  }

  // Execute with local priority queue for ordering + token-level throttling
  try {
    const result = await throttledGroqRequest(fn, priority, estimatedTokens);
    // Reset consecutive 429s on success
    await redis.del(GROQ_429_KEY);
    return result;
  } catch (error: any) {
    const is429 =
      error?.status === 429 ||
      (typeof error?.message === 'string' && error.message.includes('429'));

    if (is429) {
      const count = await redis.incrWithExpire(GROQ_429_KEY, 300);
      if (count >= 3) {
        await tripCircuit(5 * 60 * 1000); // 5 min
        console.error('[GroqLimiter:Redis] Circuit tripped globally — 3 consecutive 429s');
      } else {
        await tripCircuit(60 * 1000); // 60s
        console.warn(`[GroqLimiter:Redis] 429 received (${count}/3) — circuit paused 60s`);
      }
    }
    throw error;
  }
}
