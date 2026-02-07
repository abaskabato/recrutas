/**
 * CLI script for tiered tech company scraping.
 * Invoked by GitHub Actions to scrape a subset of companies.
 *
 * Usage:
 *   npx tsx scripts/scrape-tier.ts --tier=1 --timeout=900000
 *   npx tsx scripts/scrape-tier.ts --tier=2 --timeout=600000
 *   npx tsx scripts/scrape-tier.ts --tier=3 --timeout=300000
 *   npx tsx scripts/scrape-tier.ts --cleanup --days=15
 */

import { SOTAScraperService } from '../server/services/sota-scraper.service.js';
import { jobIngestionService } from '../server/services/job-ingestion.service.js';

function parseArgs(): { tier?: number; timeout?: number; cleanup?: boolean; days?: number } {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      args[match[1]] = match[2];
    } else if (arg.startsWith('--')) {
      args[arg.slice(2)] = 'true';
    }
  }
  return {
    tier: args.tier ? parseInt(args.tier, 10) : undefined,
    timeout: args.timeout ? parseInt(args.timeout, 10) : undefined,
    cleanup: args.cleanup === 'true',
    days: args.days ? parseInt(args.days, 10) : undefined,
  };
}

async function runCleanup(days: number) {
  console.log(`[scrape-tier] Cleaning up stale jobs older than ${days} days...`);
  const expired = await jobIngestionService.expireStaleJobs();
  console.log(`[scrape-tier] Expired ${expired} stale jobs`);
}

async function runTierScrape(tier: number, timeoutMs: number) {
  console.log(`[scrape-tier] Starting tier ${tier} scrape with ${timeoutMs}ms timeout...`);

  const service = new SOTAScraperService();
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.warn(`[scrape-tier] Tier ${tier} timeout reached (${timeoutMs}ms), aborting...`);
    controller.abort();
  }, timeoutMs);

  try {
    const result = await service.scrapeSubset(tier as 1 | 2 | 3, { signal: controller.signal });

    console.log(`[scrape-tier] Tier ${tier} complete:`, {
      companiesScraped: result.companiesScraped,
      totalJobsFound: result.totalJobsFound,
      jobsIngested: result.jobsIngested,
      errors: result.errors.length,
      duration: `${(result.duration / 1000).toFixed(1)}s`,
    });

    if (result.errors.length > 0) {
      console.warn(`[scrape-tier] Errors:`, result.errors.slice(0, 10));
    }

    // Exit with error code if scrape completely failed
    if (!result.success && result.totalJobsFound === 0) {
      process.exit(1);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const { tier, timeout, cleanup, days } = parseArgs();

  if (cleanup) {
    await runCleanup(days ?? 15);
    return;
  }

  if (!tier || ![1, 2, 3].includes(tier)) {
    console.error('Usage: npx tsx scripts/scrape-tier.ts --tier=<1|2|3> --timeout=<ms>');
    console.error('       npx tsx scripts/scrape-tier.ts --cleanup --days=15');
    process.exit(1);
  }

  await runTierScrape(tier, timeout ?? 600_000);
}

main().catch(error => {
  console.error('[scrape-tier] Fatal error:', error);
  process.exit(1);
});
