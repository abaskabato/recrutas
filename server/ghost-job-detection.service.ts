/**
 * Ghost Job Detection Service
 * 
 * Identifies and flags jobs that are likely "ghost jobs" - posted but not actively hiring.
 * Uses engagement metrics, application-to-response ratios, and posting patterns to detect
 * suspicious job listings.
 */

import { db } from './db';
import { jobPostings, jobApplications, users, talentOwnerProfiles } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

export interface GhostJobIndicators {
  jobId: number;
  isGhostJob: boolean;
  confidence: number; // 0-100
  reasons: string[];
  metrics: {
    daysSincePosted: number;
    totalViews: number;
    totalApplications: number;
    viewToApplicationRate: number; // percentage
    responseRate: number; // percentage of applications that got a response
    avgResponseTime: number; // hours
    recruiterResponseRate: number; // historical response rate of this recruiter
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Thresholds for ghost job detection
const GHOST_JOB_THRESHOLDS = {
  // High applications but low/no responses = suspicious
  HIGH_APPLICATION_THRESHOLD: 20,
  LOW_RESPONSE_RATE_THRESHOLD: 10, // Less than 10% response rate
  
  // Jobs posted long ago with no activity
  STALE_DAYS_THRESHOLD: 45,
  
  // View to application ratio
  LOW_VIEW_TO_APP_RATE: 2, // Less than 2% of viewers apply
  HIGH_VIEW_TO_APP_RATE: 30, // More than 30% apply (too good to be true)
  
  // Recruiter history
  RECRUITER_GHOST_THRESHOLD: 3, // If recruiter has 3+ ghost jobs, flag new ones
};

export class GhostJobDetectionService {
  /**
   * Analyze a job for ghost job indicators
   */
  async analyzeJob(jobId: number): Promise<GhostJobIndicators | null> {
    const job = await db
      .select({
        id: jobPostings.id,
        talentOwnerId: jobPostings.talentOwnerId,
        viewCount: jobPostings.viewCount,
        applicationCount: jobPostings.applicationCount,
        createdAt: jobPostings.createdAt,
        source: jobPostings.source,
      })
      .from(jobPostings)
      .where(eq(jobPostings.id, jobId))
      .limit(1);

    if (!job[0]) return null;

    const jobData = job[0];
    const daysSincePosted = Math.floor(
      (Date.now() - new Date(jobData.createdAt!).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get detailed application statistics
    const appStats = await this.getApplicationStats(jobId);
    
    // Get recruiter historical data
    const recruiterStats = await this.getRecruiterStats(jobData.talentOwnerId!);

    // Calculate metrics
    const viewToAppRate = jobData.viewCount! > 0 
      ? (jobData.applicationCount! / jobData.viewCount!) * 100 
      : 0;
    
    const responseRate = appStats.totalApplications > 0
      ? (appStats.respondedApplications / appStats.totalApplications) * 100
      : 0;

    const indicators: GhostJobIndicators = {
      jobId,
      isGhostJob: false,
      confidence: 0,
      reasons: [],
      metrics: {
        daysSincePosted,
        totalViews: jobData.viewCount!,
        totalApplications: jobData.applicationCount!,
        viewToApplicationRate: parseFloat(viewToAppRate.toFixed(2)),
        responseRate: parseFloat(responseRate.toFixed(2)),
        avgResponseTime: appStats.avgResponseTime,
        recruiterResponseRate: recruiterStats.responseRate,
      },
      riskLevel: 'low',
    };

    // Detect ghost job patterns
    this.detectPatterns(indicators, jobData.source!);

    // Calculate confidence score
    indicators.confidence = this.calculateConfidence(indicators);

    return indicators;
  }

  /**
   * Get application statistics for a job (single aggregated query)
   */
  private async getApplicationStats(jobId: number) {
    const stats = await db
      .select({
        totalApplications: sql<number>`count(*)`,
        respondedApplications: sql<number>`count(case when ${jobApplications.status} != 'submitted' then 1 end)`,
        avgResponseTime: sql<number>`coalesce(avg(
          case when ${jobApplications.status} != 'submitted'
               and ${jobApplications.updatedAt} is not null
               and ${jobApplications.createdAt} is not null
          then extract(epoch from (${jobApplications.updatedAt} - ${jobApplications.createdAt})) / 3600.0
          end
        ), 0)`,
      })
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId));

    return {
      totalApplications: Number(stats[0].totalApplications),
      respondedApplications: Number(stats[0].respondedApplications),
      avgResponseTime: Math.round(Number(stats[0].avgResponseTime)),
    };
  }

  /**
   * Get recruiter's historical statistics (single aggregated query)
   */
  private async getRecruiterStats(recruiterId: string) {
    const stats = await db
      .select({
        totalApps: sql<number>`count(${jobApplications.id})`,
        respondedApps: sql<number>`count(case when ${jobApplications.status} != 'submitted' then 1 end)`,
        ghostJobCount: sql<number>`count(distinct case when ${jobPostings.ghostJobScore} > 70 then ${jobPostings.id} end)`,
      })
      .from(jobPostings)
      .leftJoin(jobApplications, eq(jobApplications.jobId, jobPostings.id))
      .where(eq(jobPostings.talentOwnerId, recruiterId));

    const totalApps = Number(stats[0].totalApps);
    const respondedApps = Number(stats[0].respondedApps);
    const responseRate = totalApps > 0 ? (respondedApps / totalApps) * 100 : 100;

    return {
      responseRate: parseFloat(responseRate.toFixed(2)),
      ghostJobCount: Number(stats[0].ghostJobCount),
    };
  }

  /**
   * Detect ghost job patterns
   */
  private detectPatterns(indicators: GhostJobIndicators, source: string) {
    const { metrics } = indicators;
    let riskScore = 0;

    // Pattern 1: High applications, no responses
    if (metrics.totalApplications >= GHOST_JOB_THRESHOLDS.HIGH_APPLICATION_THRESHOLD &&
        metrics.responseRate < GHOST_JOB_THRESHOLDS.LOW_RESPONSE_RATE_THRESHOLD) {
      indicators.reasons.push(
        `${metrics.totalApplications} applications with only ${metrics.responseRate.toFixed(1)}% response rate`
      );
      riskScore += 30;
    }

    // Pattern 2: Job posted long time ago with high views but low applications
    if (metrics.daysSincePosted > GHOST_JOB_THRESHOLDS.STALE_DAYS_THRESHOLD &&
        metrics.totalViews > 100 &&
        metrics.viewToApplicationRate < GHOST_JOB_THRESHOLDS.LOW_VIEW_TO_APP_RATE) {
      indicators.reasons.push(
        `Posted ${metrics.daysSincePosted} days ago, ${metrics.totalViews} views but only ${metrics.totalApplications} applications (${metrics.viewToApplicationRate.toFixed(1)}% rate)`
      );
      riskScore += 25;
    }

    // Pattern 3: Suspiciously high application rate (may be too good to be true / clickbait)
    if (metrics.viewToApplicationRate > GHOST_JOB_THRESHOLDS.HIGH_VIEW_TO_APP_RATE &&
        metrics.totalViews > 50) {
      indicators.reasons.push(
        `Unusually high application rate: ${metrics.viewToApplicationRate.toFixed(1)}% of viewers applied`
      );
      riskScore += 15;
    }

    // Pattern 4: Recruiter has history of ghost jobs
    if (metrics.recruiterResponseRate < GHOST_JOB_THRESHOLDS.LOW_RESPONSE_RATE_THRESHOLD) {
      indicators.reasons.push(
        `Recruiter has ${(100 - metrics.recruiterResponseRate).toFixed(1)}% non-response rate across all jobs`
      );
      riskScore += 25;
    }

    // Pattern 5: External job with very low engagement
    if (source !== 'platform' &&
        metrics.daysSincePosted > 30 &&
        metrics.totalApplications === 0 &&
        metrics.totalViews > 50) {
      indicators.reasons.push(
        `External job with ${metrics.totalViews} views but no applications in ${metrics.daysSincePosted} days`
      );
      riskScore += 20;
    }

    // Pattern 6: No response time data despite applications
    if (metrics.totalApplications > 10 && metrics.avgResponseTime === 0) {
      indicators.reasons.push(
        `${metrics.totalApplications} applications with no recorded recruiter activity`
      );
      riskScore += 20;
    }

    // Determine risk level
    if (riskScore >= 60) {
      indicators.riskLevel = 'critical';
      indicators.isGhostJob = true;
    } else if (riskScore >= 40) {
      indicators.riskLevel = 'high';
    } else if (riskScore >= 20) {
      indicators.riskLevel = 'medium';
    }

    return riskScore;
  }

  /**
   * Calculate confidence score for ghost job detection
   */
  private calculateConfidence(indicators: GhostJobIndicators): number {
    let confidence = 0;

    // Base confidence on number of data points
    if (indicators.metrics.totalApplications > 0) confidence += 20;
    if (indicators.metrics.totalViews > 50) confidence += 15;
    if (indicators.metrics.daysSincePosted > 14) confidence += 15;

    // Increase based on risk level
    switch (indicators.riskLevel) {
      case 'critical':
        confidence += 40;
        break;
      case 'high':
        confidence += 25;
        break;
      case 'medium':
        confidence += 10;
        break;
    }

    // Bonus for multiple indicators
    confidence += indicators.reasons.length * 5;

    return Math.min(100, confidence);
  }

  /**
   * Analyze and persist ghost job score in a single pass. Returns the analysis.
   */
  async updateJobGhostScore(jobId: number): Promise<GhostJobIndicators | null> {
    const analysis = await this.analyzeJob(jobId);
    if (!analysis) return null;

    await db
      .update(jobPostings)
      .set({
        ghostJobScore: analysis.confidence,
        ghostJobStatus: analysis.isGhostJob ? 'flagged' : 'clean',
        ghostJobReasons: analysis.reasons,
        lastGhostCheck: new Date(),
      })
      .where(eq(jobPostings.id, jobId));

    return analysis;
  }

  /**
   * Run ghost job detection on all active jobs
   */
  async runBatchAnalysis(): Promise<{
    checked: number;
    flagged: number;
    clean: number;
  }> {
    const activeJobs = await db
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(eq(jobPostings.status, 'active'));

    let flagged = 0;
    let clean = 0;

    for (const job of activeJobs) {
      try {
        const analysis = await this.updateJobGhostScore(job.id);
        if (analysis?.isGhostJob) {
          flagged++;
        } else {
          clean++;
        }
      } catch (error) {
        console.error(`[GhostJobDetection] Error analyzing job ${job.id}:`, error);
      }
    }

    return {
      checked: activeJobs.length,
      flagged,
      clean,
    };
  }

  /**
   * Get jobs flagged as ghost jobs
   */
  async getFlaggedJobs(limit: number = 100): Promise<Array<{
    jobId: number;
    title: string;
    company: string;
    ghostJobScore: number;
    reasons: string[];
  }>> {
    const jobs = await db
      .select({
        id: jobPostings.id,
        title: jobPostings.title,
        company: jobPostings.company,
        ghostJobScore: jobPostings.ghostJobScore,
        ghostJobReasons: jobPostings.ghostJobReasons,
      })
      .from(jobPostings)
      .where(
        and(
          eq(jobPostings.status, 'active'),
          sql`${jobPostings.ghostJobScore} > 50`
        )
      )
      .orderBy(desc(jobPostings.ghostJobScore))
      .limit(limit);

    return jobs.map(job => ({
      jobId: job.id,
      title: job.title!,
      company: job.company!,
      ghostJobScore: job.ghostJobScore!,
      reasons: job.ghostJobReasons || [],
    }));
  }

  /**
   * Record a job view for tracking
   */
  async recordJobView(jobId: number): Promise<void> {
    await db
      .update(jobPostings)
      .set({
        viewCount: sql`${jobPostings.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, jobId));
  }

  /**
   * Get ghost job statistics
   */
  async getStatistics(): Promise<{
    totalJobs: number;
    flaggedJobs: number;
    criticalRiskJobs: number;
    avgGhostScore: number;
  }> {
    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        flagged: sql<number>`count(case when ${jobPostings.ghostJobScore} > 50 then 1 end)`,
        critical: sql<number>`count(case when ${jobPostings.ghostJobScore} > 80 then 1 end)`,
        avgScore: sql<number>`avg(${jobPostings.ghostJobScore})`,
      })
      .from(jobPostings)
      .where(eq(jobPostings.status, 'active'));

    return {
      totalJobs: Number(stats[0].total),
      flaggedJobs: Number(stats[0].flagged),
      criticalRiskJobs: Number(stats[0].critical),
      avgGhostScore: parseFloat(Number(stats[0].avgScore || 0).toFixed(2)),
    };
  }
}

// Export singleton instance
export const ghostJobDetectionService = new GhostJobDetectionService();
