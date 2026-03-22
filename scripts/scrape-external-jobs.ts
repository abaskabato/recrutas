/**
 * CLI script for scraping external job boards (Adzuna, Jooble, JSearch, etc.)
 * Invoked by GitHub Actions 4x/day to populate the DB with fresh jobs.
 *
 * Usage:
 *   npx tsx scripts/scrape-external-jobs.ts
 *   npx tsx scripts/scrape-external-jobs.ts --timeout=300000
 */

import { jobAggregator } from '../server/job-aggregator.js';
import { jobIngestionService } from '../server/services/job-ingestion.service.js';

function checkRequiredEnvVars(): void {
  const required = ['DATABASE_URL'];
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error(`[scrape-external] ERROR: Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Log which optional sources are available
  const sources: string[] = [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) sources.push('Adzuna');
  if (process.env.JOOBLE_API_KEY) sources.push('Jooble');
  if (process.env.RAPIDAPI_KEY) sources.push('JSearch');
  sources.push('WeWorkRemotely', 'RemoteOK', 'TheMuse'); // always available
  console.log(`[scrape-external] Available sources: ${sources.join(', ')}`);
}

function parseArgs(): { timeout: number } {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  }
  return {
    timeout: args.timeout ? parseInt(args.timeout, 10) : 300000, // 5 min default
  };
}

async function main() {
  checkRequiredEnvVars();
  const { timeout } = parseArgs();

  console.log(`[scrape-external] Starting scrape (timeout: ${timeout / 1000}s)...`);
  const startTime = Date.now();

  try {
    // Fetch from all configured sources
    const jobs = await Promise.race([
      jobAggregator.getAllJobs([]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Scraping timeout')), timeout)
      ),
    ]);

    const scrapeTime = Date.now() - startTime;
    console.log(`[scrape-external] Scraped ${jobs.length} jobs in ${scrapeTime}ms`);

    if (!jobs || jobs.length === 0) {
      console.log('[scrape-external] No jobs found — exiting');
      process.exit(0);
    }

    // Ingest into database
    const ingestStats = await jobIngestionService.ingestExternalJobs(
      jobs.map((job: any) => ({
        title: job.title || '',
        company: job.company || '',
        location: job.location || '',
        description: job.description || '',
        requirements: job.requirements || [],
        skills: job.skills || [],
        workType: job.workType || 'hybrid',
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        source: job.source || 'external',
        externalId: job.externalId || job.id || `ext-${Date.now()}`,
        externalUrl: job.externalUrl || '',
        postedDate: job.postedDate || new Date().toISOString(),
      }))
    );

    const totalTime = Date.now() - startTime;
    console.log(`[scrape-external] Done in ${totalTime}ms:`);
    console.log(`  Scraped:    ${jobs.length}`);
    console.log(`  Inserted:   ${ingestStats?.inserted || 0}`);
    console.log(`  Duplicates: ${ingestStats?.duplicates || 0}`);
    console.log(`  Errors:     ${ingestStats?.errors || 0}`);

    process.exit(0);
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[scrape-external] Failed after ${elapsed}ms:`, error?.message);
    process.exit(1);
  }
}

main();
