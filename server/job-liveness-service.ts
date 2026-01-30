/**
 * Job Liveness Service - Validates external job URLs
 *
 * This service periodically checks if external job URLs are still valid
 * by detecting:
 * - 404 responses
 * - Redirects to generic career pages
 * - "Position filled" / "No longer available" text
 *
 * Based on HiringCafe's approach to eliminate stale jobs
 */

import { db } from './db';
import { jobPostings } from '@shared/schema';
import { eq, lt, and, isNotNull, sql } from 'drizzle-orm';

export interface LivenessCheckResult {
  jobId: number;
  externalUrl: string;
  isActive: boolean;
  reason?: string;
  lastChecked: Date;
  httpStatus?: number;
  responseTime?: number;
  trustScore?: number;
  livenessStatus?: 'active' | 'stale' | 'unknown';
}

// Phrases that indicate a job is no longer available
const STALE_JOB_INDICATORS = [
  'position has been filled',
  'position filled',
  'no longer available',
  'no longer accepting',
  'job closed',
  'expired',
  'this job is no longer open',
  'sorry, this position is no longer available',
  'this position has been closed',
  'role has been filled',
  'we are no longer accepting applications',
  'application deadline has passed',
  'this listing has ended',
  'job posting expired',
  'requisition closed'
];

// Generic career page URLs that indicate a redirect away from specific job
const GENERIC_CAREER_PAGE_PATTERNS = [
  /\/careers\/?$/i,
  /\/jobs\/?$/i,
  /\/careers\/search/i,
  /\/jobs\/search/i,
  /\/careers\/openings/i,
  /\/join-us\/?$/i,
  /\/work-with-us\/?$/i,
  /\/opportunities\/?$/i
];

export class JobLivenessService {
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private userAgent = 'RecrutasJobValidator/1.0 (+https://recrutas.ai)';

  /**
   * Start the liveness checking background service
   */
  start(): void {
    if (this.isRunning) {
      console.log('[LivenessService] Already running');
      return;
    }

    console.log('[LivenessService] Starting job liveness service...');
    this.isRunning = true;

    // Run initial check
    this.runLivenessChecks().catch(console.error);

    // Schedule periodic checks every 6 hours
    this.checkInterval = setInterval(() => {
      this.runLivenessChecks().catch(console.error);
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Stop the liveness checking service
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[LivenessService] Stopped job liveness service');
  }

  /**
   * Run liveness checks on jobs based on their age
   */
  async runLivenessChecks(): Promise<void> {
    console.log('[LivenessService] Starting liveness check run...');

    const now = new Date();
    const stats = { checked: 0, active: 0, stale: 0, errors: 0 };

    try {
      // Get jobs that need checking based on tiered schedule
      const jobsToCheck = await this.getJobsToCheck();
      console.log(`[LivenessService] Found ${jobsToCheck.length} jobs to check`);

      // Process jobs in batches to avoid overwhelming servers
      const batchSize = 10;
      for (let i = 0; i < jobsToCheck.length; i += batchSize) {
        const batch = jobsToCheck.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(job => this.checkJobLiveness(job))
        );

        for (const result of results) {
          stats.checked++;
          if (result.status === 'fulfilled') {
            if (result.value.isActive) {
              stats.active++;
              // Update liveness check timestamp and increase trust score for active jobs
              await this.updateJobLivenessStatus(result.value.jobId, 'active', result.value.lastChecked);
            } else {
              stats.stale++;
              // Mark job as stale and decrease trust score
              await this.markJobAsStale(result.value.jobId, result.value.reason, result.value.lastChecked);
            }
          } else {
            stats.errors++;
          }
        }

        // Rate limiting: wait 2 seconds between batches
        if (i + batchSize < jobsToCheck.length) {
          await this.delay(2000);
        }
      }

      console.log(`[LivenessService] Check completed. Checked: ${stats.checked}, Active: ${stats.active}, Stale: ${stats.stale}, Errors: ${stats.errors}`);
    } catch (error) {
      console.error('[LivenessService] Error running liveness checks:', error);
    }
  }

  /**
   * Get jobs that need liveness checking based on tiered schedule:
   * - Jobs < 7 days old: check every 24 hours
   * - Jobs 7-30 days old: check every 48 hours
   * - Jobs > 30 days old: check every 72 hours
   */
  private async getJobsToCheck(): Promise<Array<{ id: number; externalUrl: string; createdAt: Date; lastLivenessCheck: Date | null }>> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all external jobs with URLs
    const externalJobs = await db.select({
      id: jobPostings.id,
      externalUrl: jobPostings.externalUrl,
      createdAt: jobPostings.createdAt,
      source: jobPostings.source,
      status: jobPostings.status
    })
    .from(jobPostings)
    .where(
      and(
        isNotNull(jobPostings.externalUrl),
        eq(jobPostings.status, 'active')
      )
    );

    // Filter based on tiered schedule
    // Note: In a real implementation, we'd track lastLivenessCheck in the DB
    // For now, we'll check all external jobs
    return externalJobs
      .filter(job => job.externalUrl && job.source !== 'platform')
      .map(job => ({
        id: job.id,
        externalUrl: job.externalUrl!,
        createdAt: job.createdAt!,
        lastLivenessCheck: null
      }));
  }

  /**
   * Check if a single job URL is still active
   */
  async checkJobLiveness(job: { id: number; externalUrl: string }): Promise<LivenessCheckResult> {
    const startTime = Date.now();

    try {
      // Validate URL format
      if (!this.isValidUrl(job.externalUrl)) {
        return {
          jobId: job.id,
          externalUrl: job.externalUrl,
          isActive: false,
          reason: 'Invalid URL format',
          lastChecked: new Date()
        };
      }

      // Make HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(job.externalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Check HTTP status
      if (response.status === 404 || response.status === 410) {
        return {
          jobId: job.id,
          externalUrl: job.externalUrl,
          isActive: false,
          reason: `HTTP ${response.status} - Page not found`,
          lastChecked: new Date(),
          httpStatus: response.status,
          responseTime
        };
      }

      // Check for redirect to generic career page
      const finalUrl = response.url;
      if (this.isGenericCareerPage(finalUrl, job.externalUrl)) {
        return {
          jobId: job.id,
          externalUrl: job.externalUrl,
          isActive: false,
          reason: 'Redirected to generic career page',
          lastChecked: new Date(),
          httpStatus: response.status,
          responseTime
        };
      }

      // Check page content for stale indicators
      if (response.ok) {
        const html = await response.text();
        const staleReason = this.checkForStaleIndicators(html);

        if (staleReason) {
          return {
            jobId: job.id,
            externalUrl: job.externalUrl,
            isActive: false,
            reason: staleReason,
            lastChecked: new Date(),
            httpStatus: response.status,
            responseTime
          };
        }
      }

      // Job appears to be active
      return {
        jobId: job.id,
        externalUrl: job.externalUrl,
        isActive: true,
        lastChecked: new Date(),
        httpStatus: response.status,
        responseTime
      };

    } catch (error: any) {
      // Handle network errors, timeouts, etc.
      const reason = error.name === 'AbortError'
        ? 'Request timeout'
        : `Network error: ${error.message}`;

      return {
        jobId: job.id,
        externalUrl: job.externalUrl,
        isActive: true, // Don't mark as inactive on network errors
        reason,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if URL redirected to a generic career page
   */
  private isGenericCareerPage(finalUrl: string, originalUrl: string): boolean {
    // If URL didn't change significantly, it's probably fine
    const finalPath = new URL(finalUrl).pathname;
    const originalPath = new URL(originalUrl).pathname;

    // If final path is much shorter, might be a redirect to landing page
    if (finalPath.length < originalPath.length * 0.5) {
      for (const pattern of GENERIC_CAREER_PAGE_PATTERNS) {
        if (pattern.test(finalPath)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check page content for indicators that the job is no longer available
   */
  private checkForStaleIndicators(html: string): string | null {
    const lowerHtml = html.toLowerCase();

    for (const indicator of STALE_JOB_INDICATORS) {
      if (lowerHtml.includes(indicator)) {
        return `Page contains: "${indicator}"`;
      }
    }

    return null;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Update job liveness status for active jobs (increases trust score)
   */
  private async updateJobLivenessStatus(jobId: number, status: 'active' | 'stale' | 'unknown', checkedAt: Date): Promise<void> {
    try {
      // Get current trust score
      const job = await db.select({ trustScore: jobPostings.trustScore })
        .from(jobPostings)
        .where(eq(jobPostings.id, jobId))
        .limit(1);

      const currentTrustScore = job[0]?.trustScore ?? 50;
      // Increase trust score for active jobs (max 95 for external jobs, 100 for internal)
      const newTrustScore = Math.min(95, currentTrustScore + 5);

      await db.update(jobPostings)
        .set({
          lastLivenessCheck: checkedAt,
          livenessStatus: status,
          trustScore: newTrustScore,
          updatedAt: new Date()
        })
        .where(eq(jobPostings.id, jobId));

      console.log(`[LivenessService] Updated job ${jobId} liveness: ${status}, trust: ${newTrustScore}`);
    } catch (error) {
      console.error(`[LivenessService] Failed to update liveness for job ${jobId}:`, error);
    }
  }

  /**
   * Mark a job as stale (decreases trust score significantly)
   */
  private async markJobAsStale(jobId: number, reason?: string, checkedAt?: Date): Promise<void> {
    try {
      // Get current trust score
      const job = await db.select({ trustScore: jobPostings.trustScore })
        .from(jobPostings)
        .where(eq(jobPostings.id, jobId))
        .limit(1);

      const currentTrustScore = job[0]?.trustScore ?? 50;
      // Decrease trust score significantly for stale jobs
      const newTrustScore = Math.max(0, currentTrustScore - 30);

      await db.update(jobPostings)
        .set({
          lastLivenessCheck: checkedAt || new Date(),
          livenessStatus: 'stale',
          trustScore: newTrustScore,
          updatedAt: new Date()
        })
        .where(eq(jobPostings.id, jobId));

      console.log(`[LivenessService] Marked job ${jobId} as stale: ${reason}, trust: ${newTrustScore}`);
    } catch (error) {
      console.error(`[LivenessService] Failed to mark job ${jobId} as stale:`, error);
    }
  }

  /**
   * Mark a job as inactive in the database (closes the job)
   */
  private async markJobAsInactive(jobId: number, reason?: string): Promise<void> {
    try {
      await db.update(jobPostings)
        .set({
          status: 'closed',
          livenessStatus: 'stale',
          trustScore: 0,
          updatedAt: new Date()
        })
        .where(eq(jobPostings.id, jobId));

      console.log(`[LivenessService] Marked job ${jobId} as inactive: ${reason}`);
    } catch (error) {
      console.error(`[LivenessService] Failed to mark job ${jobId} as inactive:`, error);
    }
  }

  /**
   * Set trust score to 100 for internal/platform jobs
   */
  async setInternalJobsTrustScore(): Promise<number> {
    try {
      const result = await db.update(jobPostings)
        .set({
          trustScore: 100,
          livenessStatus: 'active',
          lastLivenessCheck: new Date()
        })
        .where(eq(jobPostings.source, 'platform'));

      console.log('[LivenessService] Updated internal jobs to trust score 100');
      return 0; // Return count if available
    } catch (error) {
      console.error('[LivenessService] Failed to update internal jobs trust score:', error);
      return 0;
    }
  }

  /**
   * Manually check a specific job's liveness
   */
  async checkSingleJob(jobId: number): Promise<LivenessCheckResult | null> {
    const job = await db.select({
      id: jobPostings.id,
      externalUrl: jobPostings.externalUrl
    })
    .from(jobPostings)
    .where(eq(jobPostings.id, jobId))
    .limit(1);

    if (!job[0] || !job[0].externalUrl) {
      return null;
    }

    return this.checkJobLiveness({
      id: job[0].id,
      externalUrl: job[0].externalUrl
    });
  }

  /**
   * Get liveness check statistics
   */
  async getStatistics(): Promise<{
    totalExternalJobs: number;
    activeJobs: number;
    closedJobs: number;
    lastCheckTime?: Date;
  }> {
    const stats = await db.select({
      status: jobPostings.status,
      count: sql<number>`count(*)`
    })
    .from(jobPostings)
    .where(isNotNull(jobPostings.externalUrl))
    .groupBy(jobPostings.status);

    const result = {
      totalExternalJobs: 0,
      activeJobs: 0,
      closedJobs: 0
    };

    for (const stat of stats) {
      result.totalExternalJobs += Number(stat.count);
      if (stat.status === 'active') {
        result.activeJobs = Number(stat.count);
      } else if (stat.status === 'closed') {
        result.closedJobs = Number(stat.count);
      }
    }

    return result;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const jobLivenessService = new JobLivenessService();
