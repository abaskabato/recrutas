/**
 * Rate Limiter
 * 
 * Implements token bucket algorithm for rate limiting per domain
 * and global rate limiting.
 */

interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
}

interface DomainBucket {
  tokens: number;
  lastUpdate: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private buckets = new Map<string, DomainBucket>();
  private globalTokens: number;
  private globalLastUpdate: number;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.globalTokens = config.burstSize;
    this.globalLastUpdate = Date.now();
  }

  /**
   * Acquire permission to make a request
   */
  async acquire(domain: string): Promise<void> {
    const now = Date.now();
    
    // Check global rate limit
    this.refillGlobalTokens(now);
    if (this.globalTokens < 1) {
      const waitTime = this.calculateGlobalWaitTime();
      await this.delay(waitTime);
      return this.acquire(domain);
    }
    
    // Check domain-specific rate limit
    const bucket = this.getBucket(domain);
    this.refillBucket(bucket, now);
    
    if (bucket.tokens < 1) {
      const waitTime = this.calculateWaitTime(bucket);
      await this.delay(waitTime);
      return this.acquire(domain);
    }
    
    // Consume tokens
    this.globalTokens--;
    bucket.tokens--;
    bucket.lastUpdate = now;
  }

  /**
   * Get current rate limit status
   */
  getStatus(domain: string): { available: number; resetIn: number } {
    const now = Date.now();
    const bucket = this.getBucket(domain);
    this.refillBucket(bucket, now);
    
    return {
      available: Math.floor(bucket.tokens),
      resetIn: Math.max(0, 60000 - (now - bucket.lastUpdate))
    };
  }

  private getBucket(domain: string): DomainBucket {
    if (!this.buckets.has(domain)) {
      this.buckets.set(domain, {
        tokens: this.config.burstSize,
        lastUpdate: Date.now()
      });
    }
    return this.buckets.get(domain)!;
  }

  private refillBucket(bucket: DomainBucket, now: number): void {
    const elapsed = now - bucket.lastUpdate;
    const refillRate = this.config.requestsPerMinute / 60000;
    const tokensToAdd = elapsed * refillRate;
    
    bucket.tokens = Math.min(
      this.config.burstSize,
      bucket.tokens + tokensToAdd
    );
  }

  private refillGlobalTokens(now: number): void {
    const elapsed = now - this.globalLastUpdate;
    const refillRate = this.config.requestsPerMinute / 60000;
    const tokensToAdd = elapsed * refillRate;
    
    this.globalTokens = Math.min(
      this.config.burstSize,
      this.globalTokens + tokensToAdd
    );
    this.globalLastUpdate = now;
  }

  private calculateWaitTime(bucket: DomainBucket): number {
    const refillRate = this.config.requestsPerMinute / 60000;
    const tokensNeeded = 1 - bucket.tokens;
    return Math.ceil(tokensNeeded / refillRate);
  }

  private calculateGlobalWaitTime(): number {
    const refillRate = this.config.requestsPerMinute / 60000;
    const tokensNeeded = 1 - this.globalTokens;
    return Math.ceil(tokensNeeded / refillRate);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
