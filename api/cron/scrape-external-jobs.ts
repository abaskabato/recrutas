/**
 * Vercel Cron Job API Route
 *
 * This endpoint is called by Vercel's cron scheduler daily at 6 AM UTC.
 * It runs the SOTA scraper to fetch and ingest external jobs.
 *
 * Cron schedule: 0 6 * * * (daily at 6 AM UTC)
 *
 * For Vercel Hobby plan:
 * - Maximum execution time: 60 seconds
 * - We use a 55s AbortController timeout to return partial results gracefully
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SOTAScraperService } from '../server/services/sota-scraper.service.js';
import { logger } from '../server/scraper-v2/utils/logger.js';

// Vercel Hobby plan has 60s execution limit
const MAX_EXECUTION_TIME = 55000; // Leave 5s buffer

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'CRON_SECRET is not configured'
    });
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authorization header'
    });
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_EXECUTION_TIME);

  try {
    logger.info('Cron job started: scrape-external-jobs');

    // Create a fresh service instance per invocation (no singletons in serverless)
    const service = new SOTAScraperService();
    const result = await service.scrapeAll({ signal: controller.signal });

    const duration = Date.now() - startTime;

    logger.info('Cron job completed', {
      duration,
      companiesScraped: result.companiesScraped,
      jobsFound: result.totalJobsFound,
      jobsIngested: result.jobsIngested
    });

    return res.status(200).json({
      success: result.success,
      message: 'External jobs scraping completed',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        companiesScraped: result.companiesScraped,
        totalJobsFound: result.totalJobsFound,
        jobsIngested: result.jobsIngested,
        errors: result.errors.length
      },
      errors: result.errors.slice(0, 10)
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Cron job failed', {
      error: error instanceof Error ? error.message : String(error),
      duration
    });

    return res.status(500).json({
      success: false,
      message: 'External jobs scraping failed',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: 'Internal server error'
    });
  } finally {
    clearTimeout(timeout);
  }
}
