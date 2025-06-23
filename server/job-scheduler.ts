/**
 * Background Job Scheduler for Automated Job Scraping
 * 
 * Implements intelligent caching and scheduled job discovery to ensure
 * candidates always see fresh opportunities without performance delays.
 */

import { jobAggregator } from './job-aggregator';
import { companyJobsAggregator } from './company-jobs-aggregator';
import { storage } from './storage';

interface JobCache {
  jobs: any[];
  lastUpdated: Date;
  expiresAt: Date;
}

export class JobScheduler {
  private jobCache: Map<string, JobCache> = new Map();
  private isRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  
  // Cache duration: 45 minutes (refresh before 1 hour expiry)
  private readonly CACHE_DURATION = 45 * 60 * 1000;
  
  // Scraping interval: every 30 minutes
  private readonly SCRAPING_INTERVAL = 30 * 60 * 1000;

  constructor() {
    this.startScheduler();
  }

  /**
   * Start the background job scheduler
   */
  startScheduler(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Job scheduler started - scraping every 30 minutes');
    
    // Run initial scrape after 10 seconds
    setTimeout(() => this.performScheduledScraping(), 10000);
    
    // Schedule regular scraping
    this.schedulerInterval = setInterval(() => {
      this.performScheduledScraping();
    }, this.SCRAPING_INTERVAL);
  }

  /**
   * Stop the background job scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Job scheduler stopped');
  }

  /**
   * Get cached jobs or fetch fresh ones
   */
  async getJobs(candidateId: string, limit: number = 25): Promise<any[]> {
    const cacheKey = `jobs_${candidateId}`;
    const cached = this.jobCache.get(cacheKey);
    
    // Return cached jobs if still valid
    if (cached && cached.expiresAt > new Date()) {
      console.log(`📦 Returning ${cached.jobs.length} cached jobs for candidate ${candidateId}`);
      return cached.jobs.slice(0, limit);
    }
    
    // Fetch fresh jobs
    console.log(`🔄 Fetching fresh jobs for candidate ${candidateId}`);
    const jobs = await this.fetchFreshJobs(candidateId, limit);
    
    // Cache the results
    this.cacheJobs(cacheKey, jobs);
    
    return jobs;
  }

  /**
   * Perform scheduled background scraping
   */
  private async performScheduledScraping(): Promise<void> {
    try {
      console.log('🕒 Starting scheduled job scraping...');
      
      // Get active candidates to refresh their job caches
      const activeCandidates = await this.getActiveCandidates();
      
      for (const candidateId of activeCandidates) {
        try {
          const jobs = await this.fetchFreshJobs(candidateId, 25);
          this.cacheJobs(`jobs_${candidateId}`, jobs);
          console.log(`✅ Refreshed ${jobs.length} jobs for candidate ${candidateId}`);
        } catch (error) {
          console.error(`❌ Failed to refresh jobs for candidate ${candidateId}:`, error);
        }
        
        // Small delay between candidates to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`🎯 Scheduled scraping completed for ${activeCandidates.length} candidates`);
      
    } catch (error) {
      console.error('❌ Scheduled scraping failed:', error);
    }
  }

  /**
   * Fetch fresh jobs from all sources
   */
  private async fetchFreshJobs(candidateId: string, limit: number): Promise<any[]> {
    try {
      // Get candidate profile for personalized matching
      const profile = await storage.getCandidateProfile(candidateId);
      
      // Fetch from company jobs aggregator using existing method
      const skillsArray = profile?.skills || [];
      const { companyJobsAggregator } = await import('./company-jobs-aggregator');
      const jobs = await companyJobsAggregator.getAllCompanyJobs(skillsArray, limit);
      
      return jobs || [];
    } catch (error) {
      console.error(`Failed to fetch fresh jobs for ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Cache jobs with expiration
   */
  private cacheJobs(cacheKey: string, jobs: any[]): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION);
    
    this.jobCache.set(cacheKey, {
      jobs,
      lastUpdated: now,
      expiresAt
    });
    
    console.log(`💾 Cached ${jobs.length} jobs, expires at ${expiresAt.toLocaleTimeString()}`);
  }

  /**
   * Get list of active candidates (logged in within last 7 days)
   */
  private async getActiveCandidates(): Promise<string[]> {
    try {
      // Get candidates who have activity in the last 7 days
      const candidates = await storage.getActiveCandidates();
      return candidates.map(c => c.userId);
    } catch (error) {
      console.error('Failed to get active candidates:', error);
      // Fallback: return a default set for testing
      return ['5GSCIUyMBUDbBFYspsSLcrIxTNjdGMeT'];
    }
  }

  /**
   * Clear cache for specific candidate
   */
  clearCandidateCache(candidateId: string): void {
    const cacheKey = `jobs_${candidateId}`;
    this.jobCache.delete(cacheKey);
    console.log(`🗑️ Cleared cache for candidate ${candidateId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.jobCache.clear();
    console.log('🗑️ Cleared all job caches');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    const stats = {
      totalCachedCandidates: this.jobCache.size,
      caches: Array.from(this.jobCache.entries()).map(([key, cache]) => ({
        candidateId: key.replace('jobs_', ''),
        jobCount: cache.jobs.length,
        lastUpdated: cache.lastUpdated,
        expiresAt: cache.expiresAt,
        isExpired: cache.expiresAt < new Date()
      }))
    };
    
    return stats;
  }
}

// Export singleton instance
export const jobScheduler = new JobScheduler();