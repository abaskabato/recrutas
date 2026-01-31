/**
 * Job Refresh Service
 * Periodically refreshes external jobs from multiple sources
 */

import { jobIngestionService } from './job-ingestion.service';

class JobRefreshService {
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  start(): void {
    if (this.isRunning) {
      console.log('[JobRefresh] Already running');
      return;
    }

    console.log('[JobRefresh] Starting job refresh service...');
    this.isRunning = true;

    // Run initial refresh
    this.runRefresh().catch(console.error);

    // Schedule periodic refresh every 6 hours
    this.refreshInterval = setInterval(() => {
      this.runRefresh().catch(console.error);
    }, 6 * 60 * 60 * 1000);
  }

  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isRunning = false;
    console.log('[JobRefresh] Stopped');
  }

  private async runRefresh(): Promise<void> {
    console.log('[JobRefresh] Starting refresh cycle...');
    const startTime = Date.now();

    try {
      // Scrape from career pages
      let careerPageJobs: any[] = [];
      try {
        const { careerPageScraper } = await import('../career-page-scraper');
        careerPageJobs = await careerPageScraper.getAllJobs(['software', 'engineer', 'developer']);
        console.log(`[JobRefresh] Scraped ${careerPageJobs.length} jobs from career pages`);
      } catch (err) {
        console.error('[JobRefresh] Career page scraping failed:', err);
      }

      // Fetch from job aggregators
      let aggregatorJobs: any[] = [];
      try {
        const { jobAggregator } = await import('../job-aggregator');
        aggregatorJobs = await jobAggregator.getAllJobs(['software', 'engineer', 'developer']);
        console.log(`[JobRefresh] Fetched ${aggregatorJobs.length} jobs from aggregators`);
      } catch (err) {
        console.error('[JobRefresh] Job aggregator failed:', err);
      }

      // Ingest all jobs
      const allJobs = [...careerPageJobs, ...aggregatorJobs];
      const stats = await jobIngestionService.ingestExternalJobs(allJobs);

      // Expire stale jobs
      const expiredCount = await jobIngestionService.expireStaleJobs();

      const duration = Date.now() - startTime;
      console.log(`[JobRefresh] Complete in ${duration}ms. New: ${stats.inserted}, Duplicates: ${stats.duplicates}, Expired: ${expiredCount}`);
    } catch (error) {
      console.error('[JobRefresh] Error during refresh:', error);
    }
  }
}

export const jobRefreshService = new JobRefreshService();