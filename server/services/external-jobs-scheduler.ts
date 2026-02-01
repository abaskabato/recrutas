/**
 * Background scheduler for external jobs scraping
 * Periodically scrapes external jobs and stores them in the database
 * This prevents timeout issues from scraping on-demand
 */

import { jobAggregator } from '../job-aggregator';
import { storage } from '../storage';

export class ExternalJobsScheduler {
  private isRunning = false;
  private lastRunTime = 0;
  private readonly MIN_INTERVAL = 3600000; // 1 hour minimum between runs

  /**
   * Start the scheduler - runs scraping in background at intervals
   */
  public start(intervalMs: number = 3600000) {
    if (this.isRunning) {
      console.log('[ExternalJobsScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[ExternalJobsScheduler] Started with ${intervalMs}ms interval`);

    // Run immediately on startup
    this.scrapeAndStore()
      .catch(err => console.error('[ExternalJobsScheduler] Initial scrape failed:', err?.message));

    // Then run at intervals
    setInterval(() => {
      this.scrapeAndStore()
        .catch(err => console.error('[ExternalJobsScheduler] Interval scrape failed:', err?.message));
    }, intervalMs);
  }

  /**
   * Manually trigger scraping (e.g., from API endpoint)
   */
  public async triggerScrape() {
    // Prevent too frequent scraping
    const now = Date.now();
    if (now - this.lastRunTime < this.MIN_INTERVAL) {
      const waitTime = Math.ceil((this.MIN_INTERVAL - (now - this.lastRunTime)) / 1000);
      console.log(`[ExternalJobsScheduler] Too soon - next scrape available in ${waitTime}s`);
      return { message: `Please wait ${waitTime}s before scraping again` };
    }

    return await this.scrapeAndStore();
  }

  /**
   * Core scraping logic
   */
  private async scrapeAndStore() {
    try {
      console.log('[ExternalJobsScheduler] Starting external job scrape...');
      const startTime = Date.now();

      // Scrape jobs with a timeout to prevent hanging
      const scrapingTimeoutMs = 30000; // 30 second timeout
      const scrapePromise = jobAggregator.getAllJobs([]);

      const jobs = await Promise.race([
        scrapePromise,
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Scraping timeout')), scrapingTimeoutMs)
        )
      ]);

      const scrapingTime = Date.now() - startTime;
      console.log(`[ExternalJobsScheduler] Scraped ${jobs?.length || 0} jobs in ${scrapingTime}ms`);

      if (!jobs || jobs.length === 0) {
        console.log('[ExternalJobsScheduler] No jobs found');
        return { jobsScraped: 0, jobsStored: 0, message: 'No jobs found' };
      }

      // Store jobs in database
      const { jobIngestionService } = await import('./job-ingestion.service');
      const ingestStats = await jobIngestionService.ingestExternalJobs(jobs);

      this.lastRunTime = Date.now();

      console.log(
        `[ExternalJobsScheduler] Completed: scraped ${jobs.length} jobs, ` +
        `stored ${ingestStats?.created || 0}, updated ${ingestStats?.updated || 0}`
      );

      return {
        jobsScraped: jobs.length,
        jobsStored: ingestStats?.created || 0,
        jobsUpdated: ingestStats?.updated || 0,
        totalTime: scrapingTime,
        message: 'External jobs scrape completed successfully'
      };
    } catch (error) {
      console.error('[ExternalJobsScheduler] Error:', error?.message);
      throw error;
    }
  }
}

export const externalJobsScheduler = new ExternalJobsScheduler();
