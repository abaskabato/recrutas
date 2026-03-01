/**
 * Firecrawl Strategy
 *
 * Handles JS-rendered career pages (Tier 3) where ATS APIs and static
 * HTML parsing fail. Uses Firecrawl's managed browser + LLM extraction.
 *
 * MVP: single-call links + JSON extraction from the career listing page.
 * Post-funding: two-phase batch scraping for full job details at scale.
 *
 * Config (env-driven — upgrade by changing vars, zero code change):
 *   FIRECRAWL_API_KEY    required
 *   FIRECRAWL_RPM        requests per minute  (default: 6  → free tier)
 *   FIRECRAWL_DELAY_MS   min ms between calls (default: 10000)
 */

import crypto from 'crypto';
import FirecrawlApp from '@mendable/firecrawl-js';
import { ScrapedJob, CompanyConfig, JobLocation } from '../types.js';
import { logger } from '../utils/logger.js';

// ── Config ─────────────────────────────────────────────────────────────────

const CONFIG = {
  apiKey:  process.env.FIRECRAWL_API_KEY,
  rpm:     parseInt(process.env.FIRECRAWL_RPM     ?? '6'),
  delayMs: parseInt(process.env.FIRECRAWL_DELAY_MS ?? '10000'),
};

// ── Lazy client ────────────────────────────────────────────────────────────

let _client: FirecrawlApp | null = null;

function getClient(): FirecrawlApp {
  if (!_client) {
    if (!CONFIG.apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set');
    }
    _client = new FirecrawlApp({ apiKey: CONFIG.apiKey });
  }
  return _client;
}

// ── Rate limiter (in-process, env-configurable) ────────────────────────────

let _lastCallAt = 0;

async function waitForRateLimit(): Promise<void> {
  const minGap = Math.ceil((60 / CONFIG.rpm) * 1000);
  const elapsed = Date.now() - _lastCallAt;
  if (elapsed < minGap) {
    await new Promise(r => setTimeout(r, minGap - elapsed));
  }
  _lastCallAt = Date.now();
}

// ── Extraction schema ──────────────────────────────────────────────────────

const JOB_LIST_SCHEMA = {
  type: 'object',
  properties: {
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:           { type: 'string' },
          department:      { type: 'string' },
          location:        { type: 'string' },
          url:             { type: 'string' },
          salary:          { type: 'string' },
          workType:        { type: 'string', enum: ['remote', 'onsite', 'hybrid'] },
          employmentType:  { type: 'string', enum: ['full-time', 'part-time', 'contract', 'internship'] },
          experienceLevel: { type: 'string', enum: ['entry', 'mid', 'senior', 'staff'] },
        },
        required: ['title'],
      },
    },
  },
  required: ['jobs'],
};

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Extract jobs from a custom career page using Firecrawl.
 * Signature matches all other strategy functions in this directory.
 */
export async function extractWithFirecrawl(
  company: CompanyConfig,
  _fetchOptions: RequestInit   // unused — Firecrawl manages its own HTTP
): Promise<ScrapedJob[]> {
  const app = getClient();

  await waitForRateLimit();

  logger.info(`[Firecrawl] Scraping ${company.name}`, { url: company.careerPageUrl });

  const result = await (app as any).scrape(company.careerPageUrl, {
    formats: [
      'links',
      {
        type: 'json',
        prompt: `Extract all job listings from this careers page for ${company.name}. ` +
          'For each job return: title, department, location, salary (if shown), ' +
          'work type (remote/onsite/hybrid), employment type, experience level, ' +
          'and the full URL to the individual job posting page.',
        schema: JOB_LIST_SCHEMA,
      },
    ],
  });

  // Track credit usage so we have data at funding time
  const creditsUsed: number = result.metadata?.creditsUsed ?? 0;
  const cached: boolean     = result.metadata?.cacheState === 'hit';
  logger.info(`[Firecrawl] ${company.name}: ${creditsUsed} credits used`, {
    company: company.name,
    creditsUsed,
    cached,
  });

  const extractedJobs: any[] = result.json?.jobs ?? [];
  const rawLinks: any[]      = result.links ?? [];

  // Filter links to job-detail pages only (not the listing itself)
  const jobLinks = rawLinks
    .map((l: any) => (typeof l === 'string' ? l : l?.url))
    .filter((u: unknown): u is string => typeof u === 'string' && isJobDetailLink(u, company.careerPageUrl));

  logger.info(
    `[Firecrawl] ${company.name}: ${extractedJobs.length} jobs extracted, ` +
    `${jobLinks.length} job links found`
  );

  if (extractedJobs.length === 0 && jobLinks.length === 0) {
    logger.warn(`[Firecrawl] No data extracted for ${company.name}`);
    return [];
  }

  return buildScrapedJobs(extractedJobs, jobLinks, company);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true if `url` looks like an individual job posting on the same origin,
 * not a listing/search/benefits page.
 */
function isJobDetailLink(url: string, baseUrl: string): boolean {
  try {
    const u    = new URL(url);
    const base = new URL(baseUrl);
    return (
      u.hostname === base.hostname &&
      u.pathname !== base.pathname &&
      /careers|jobs|positions|openings|posting/i.test(u.pathname) &&
      !/\/(search|teams?|benefits|life|culture|faq)(\/|$)/i.test(u.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Parse a human-readable salary string like "$250K – $445K" into structured data.
 * Returns defaults (undisclosed) when no salary is present.
 */
function parseSalary(salaryStr?: string): ScrapedJob['salary'] {
  if (!salaryStr) {
    return { currency: 'USD', period: 'yearly', isDisclosed: false };
  }

  const nums   = salaryStr.match(/[\d,]+(?:\.\d+)?[Kk]?/g) ?? [];
  const toNum  = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ''));
    return /[Kk]$/.test(s) ? n * 1000 : n;
  };
  const values = nums.map(toNum).filter(n => n > 1000); // ignore noise < $1k

  return {
    min:        values[0],
    max:        values[1],
    currency:   'USD',
    period:     'yearly',
    isDisclosed: values.length > 0,
  };
}

/**
 * Convert Firecrawl-extracted jobs to the canonical ScrapedJob shape.
 * Falls back to stub jobs built from link URLs when LLM extraction returns nothing.
 */
function buildScrapedJobs(
  extracted: any[],
  jobLinks: string[],
  company: CompanyConfig
): ScrapedJob[] {
  if (extracted.length > 0) {
    return extracted.map((job, i) => {
      const rawLocation = job.location || 'Remote';
      const isRemote    =
        job.workType === 'remote' ||
        rawLocation.toLowerCase().includes('remote');

      const location: JobLocation = {
        raw:        rawLocation,
        isRemote,
        country:    '',
        countryCode: '',
        normalized: rawLocation.toLowerCase(),
      };

      return {
        id: crypto
          .createHash('sha256')
          .update(`${company.id}:${job.title}:${rawLocation}`)
          .digest('hex')
          .slice(0, 16),
        title:           job.title,
        normalizedTitle: '',
        company:         company.name,
        companyId:       company.id,
        location,
        description:     '',   // Phase 2: per-job detail scrape (post-funding)
        descriptionHtml: undefined,
        requirements:    [],
        responsibilities: [],
        skills:          [],
        skillCategories: [],
        workType:        job.workType        || 'hybrid',
        employmentType:  job.employmentType  || 'full-time',
        experienceLevel: job.experienceLevel || 'mid',
        salary:          parseSalary(job.salary),
        benefits:        [],
        externalUrl:     job.url || jobLinks[i] || company.careerPageUrl,
        source: {
          type:         'career_page',
          company:      company.name,
          url:          company.careerPageUrl,
          scrapeMethod: 'ai_extraction',
        },
        postedDate:  new Date(),
        scrapedAt:   new Date(),
        updatedAt:   new Date(),
        status:      'active',
        isRemote,
        department:  job.department,
      } as ScrapedJob;
    });
  }

  // Fallback: stub jobs from links (title derived from URL slug)
  return jobLinks.slice(0, 20).map(url => {
    const slug  = new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'position';
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const location: JobLocation = {
      raw:        'Remote',
      isRemote:   true,
      country:    '',
      countryCode: '',
      normalized: 'remote',
    };

    return {
      id: crypto
        .createHash('sha256')
        .update(`${company.id}:${url}`)
        .digest('hex')
        .slice(0, 16),
      title,
      normalizedTitle: '',
      company:         company.name,
      companyId:       company.id,
      location,
      description:     '',
      requirements:    [],
      responsibilities: [],
      skills:          [],
      skillCategories: [],
      workType:        'hybrid',
      employmentType:  'full-time',
      experienceLevel: 'mid',
      salary:          { currency: 'USD', period: 'yearly', isDisclosed: false },
      benefits:        [],
      externalUrl:     url,
      source: {
        type:         'career_page',
        company:      company.name,
        url:          company.careerPageUrl,
        scrapeMethod: 'ai_extraction',
      },
      postedDate:  new Date(),
      scrapedAt:   new Date(),
      updatedAt:   new Date(),
      status:      'active',
      isRemote:    true,
    } as ScrapedJob;
  });
}
