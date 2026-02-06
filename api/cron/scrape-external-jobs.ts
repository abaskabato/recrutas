/**
 * Vercel Cron Job API Route
 * 
 * This endpoint is called by Vercel's cron scheduler daily at midnight.
 * It runs the SOTA scraper to fetch and ingest external jobs.
 * 
 * Cron schedule: 0 0 * * * (daily at midnight UTC)
 * 
 * For unpaid Vercel (Hobby plan):
 * - Maximum execution time: 60 seconds
 * - We scrape in batches to fit within this limit
 * - Prioritize ATS APIs (faster) over browser automation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sotaScraperService } from '../server/services/sota-scraper.service.js';
import { logger } from '../server/scraper-v2/utils/logger.js';

// Vercel Hobby plan has 60s execution limit
const MAX_EXECUTION_TIME = 55000; // Leave 5s buffer

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing authorization header'
    });
  }

  const startTime = Date.now();
  
  try {
    logger.info('Cron job started: scrape-external-jobs');
    
    // Run the SOTA scraper
    const result = await sotaScraperService.scrapeAll();
    
    const duration = Date.now() - startTime;
    
    logger.info('Cron job completed', {
      duration,
      companiesScraped: result.companiesScraped,
      jobsFound: result.totalJobsFound,
      jobsIngested: result.jobsIngested
    });
    
    // Return success response
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
      errors: result.errors.slice(0, 10) // Limit errors in response
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
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
