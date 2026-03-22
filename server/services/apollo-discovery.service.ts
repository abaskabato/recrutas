/**
 * Apollo.io Company Discovery Service
 *
 * Seeds the discovered_companies table with thousands of companies from Apollo.io,
 * covering a wide variety of industries (tech, IT, healthcare, finance, retail, etc.).
 * The existing ats-probe pipeline picks them up and detects their ATS.
 *
 * Apollo free tier: 10K credits/month. Budget: 300 companies/day (9K/month).
 */

import { db } from '../db.js';
import { discoveredCompanies } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { redis } from '../lib/redis.js';

// ── Config ──────────────────────────────────────────────────────────────────

const APOLLO_API_URL = 'https://api.apollo.io/api/v1/organizations/search';
const PER_PAGE = 25;
const MAX_PAGES_PER_RUN = 12; // 12 pages * 25 = 300 companies/day
const MONTHLY_CREDIT_BUDGET = 9000; // leave 1K buffer on 10K free tier
const REDIS_CREDITS_PREFIX = 'apollo:credits';
const CREDIT_TTL_SECONDS = 35 * 24 * 60 * 60; // 35 days

// Broad industry coverage — tech, IT, healthcare, finance, retail, manufacturing, etc.
const INDUSTRY_SEARCHES = [
  {
    label: 'tech-saas',
    keywords: ['technology', 'software', 'SaaS'],
    employeeRanges: ['51,200', '201,500', '501,1000', '1001,5000', '5001,10000'],
  },
  {
    label: 'it-services',
    keywords: ['information technology', 'IT services', 'managed services', 'cybersecurity'],
    employeeRanges: ['51,200', '201,500', '501,1000', '1001,5000'],
  },
  {
    label: 'fintech-finance',
    keywords: ['fintech', 'financial services', 'banking', 'insurance technology'],
    employeeRanges: ['101,500', '501,1000', '1001,5000', '5001,10000'],
  },
  {
    label: 'healthcare-biotech',
    keywords: ['health tech', 'biotech', 'healthcare', 'medical devices'],
    employeeRanges: ['101,500', '501,1000', '1001,5000', '5001,10000'],
  },
  {
    label: 'ecommerce-retail',
    keywords: ['e-commerce', 'retail technology', 'marketplace'],
    employeeRanges: ['51,200', '201,500', '501,1000', '1001,5000'],
  },
  {
    label: 'ai-data',
    keywords: ['artificial intelligence', 'machine learning', 'data analytics'],
    employeeRanges: ['11,50', '51,200', '201,500', '501,1000'],
  },
  {
    label: 'enterprise-consulting',
    keywords: ['enterprise software', 'consulting', 'professional services'],
    employeeRanges: ['201,500', '501,1000', '1001,5000', '5001,10000'],
  },
  {
    label: 'manufacturing-logistics',
    keywords: ['manufacturing technology', 'logistics', 'supply chain'],
    employeeRanges: ['201,500', '501,1000', '1001,5000', '5001,10000'],
  },
];

// Common domain suffixes to strip when generating ATS slugs
const DOMAIN_SUFFIXES_TO_STRIP = /(?:hq|inc|io|app|tech|labs|corp|global|group|co|us|ai)$/i;

// ── Types ───────────────────────────────────────────────────────────────────

interface ApolloCompany {
  name: string;
  primary_domain: string | null;
  industry?: string;
  estimated_num_employees?: number;
}

interface ApolloSearchResponse {
  organizations: ApolloCompany[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ApolloDiscoveryResult {
  discovered: number;
  duplicates: number;
  creditsUsed: number;
  errors: number;
  industries: Record<string, number>;
}

// ── Credit tracking ─────────────────────────────────────────────────────────

function currentMonthKey(): string {
  const now = new Date();
  return `${REDIS_CREDITS_PREFIX}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function getMonthlyCreditsUsed(): Promise<number> {
  const val = await redis.get(currentMonthKey());
  return val ? parseInt(val, 10) : 0;
}

async function addCreditsUsed(count: number): Promise<void> {
  const key = currentMonthKey();
  for (let i = 0; i < count; i++) {
    await redis.incr(key);
  }
  await redis.expire(key, CREDIT_TTL_SECONDS);
}

// ── Domain → ATS slug generation ────────────────────────────────────────────

export function domainToSlugs(domain: string): string[] {
  if (!domain) return [];

  // Strip TLD: "datadoghq.com" → "datadoghq"
  const base = domain.replace(/\.[a-z]{2,10}(\.[a-z]{2,3})?$/i, '').toLowerCase();
  if (!base) return [];

  // Also try stripping common suffixes: "datadoghq" → "datadog"
  const stripped = base.replace(DOMAIN_SUFFIXES_TO_STRIP, '');

  const slugs = new Set<string>();
  slugs.add(base);                              // datadoghq
  if (stripped && stripped !== base) {
    slugs.add(stripped);                         // datadog
  }
  // Hyphenated variant if multi-word
  slugs.add(base.replace(/[_\s]+/g, '-'));       // data-dog-hq
  slugs.add(base.replace(/[^a-z0-9]/g, ''));     // datadoghq (cleaned)

  return [...slugs].filter(s => s.length >= 2);
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/,?\s*(inc|llc|ltd|corp|corporation|co|company)\.?$/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// ── Apollo API ──────────────────────────────────────────────────────────────

async function searchApollo(
  keywords: string[],
  employeeRanges: string[],
  page: number,
): Promise<ApolloSearchResponse | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.warn('[ApolloDiscovery] APOLLO_API_KEY not set — skipping');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(APOLLO_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q_organization_keyword_tags: keywords,
        organization_num_employees_ranges: employeeRanges,
        organization_locations: ['United States'],
        per_page: PER_PAGE,
        page,
      }),
      signal: controller.signal,
    });

    if (res.status === 429) {
      console.warn('[ApolloDiscovery] Rate limited (429) — stopping this run');
      return null;
    }

    if (res.status === 401 || res.status === 403) {
      console.error('[ApolloDiscovery] Auth error:', res.status);
      return null;
    }

    if (!res.ok) {
      console.error('[ApolloDiscovery] API error:', res.status, await res.text().catch(() => ''));
      return null;
    }

    return await res.json() as ApolloSearchResponse;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[ApolloDiscovery] Request timed out');
    } else {
      console.error('[ApolloDiscovery] Fetch error:', err?.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Main discovery function ─────────────────────────────────────────────────

export async function runApolloDiscovery(maxCredits?: number): Promise<ApolloDiscoveryResult> {
  const result: ApolloDiscoveryResult = {
    discovered: 0,
    duplicates: 0,
    creditsUsed: 0,
    errors: 0,
    industries: {},
  };

  if (!process.env.APOLLO_API_KEY) {
    console.warn('[ApolloDiscovery] APOLLO_API_KEY not set — skipping');
    return result;
  }

  if (!db) {
    console.warn('[ApolloDiscovery] DB not available');
    return result;
  }

  // Check monthly budget
  const usedThisMonth = await getMonthlyCreditsUsed();
  const budgetRemaining = MONTHLY_CREDIT_BUDGET - usedThisMonth;
  const dailyBudget = maxCredits ?? (MAX_PAGES_PER_RUN * PER_PAGE); // 300
  const creditsToUse = Math.min(dailyBudget, budgetRemaining);

  if (creditsToUse <= 0) {
    console.log(`[ApolloDiscovery] Monthly budget exhausted (${usedThisMonth}/${MONTHLY_CREDIT_BUDGET})`);
    return result;
  }

  console.log(`[ApolloDiscovery] Starting — budget: ${creditsToUse} credits (${usedThisMonth} used this month)`);

  // Rotate through industry searches each day to get variety
  const dayOfMonth = new Date().getDate();
  const searchIndex = dayOfMonth % INDUSTRY_SEARCHES.length;

  // Use 2 industry categories per run for variety
  const searches = [
    INDUSTRY_SEARCHES[searchIndex],
    INDUSTRY_SEARCHES[(searchIndex + 1) % INDUSTRY_SEARCHES.length],
  ];

  let totalCreditsUsed = 0;

  for (const search of searches) {
    if (totalCreditsUsed >= creditsToUse) break;

    const pagesForThisSearch = Math.floor((creditsToUse - totalCreditsUsed) / PER_PAGE / 2); // split budget
    const maxPages = Math.min(pagesForThisSearch, MAX_PAGES_PER_RUN / 2);

    console.log(`[ApolloDiscovery] Searching: ${search.label} (up to ${maxPages} pages)`);

    for (let page = 1; page <= maxPages; page++) {
      if (totalCreditsUsed >= creditsToUse) break;

      const response = await searchApollo(search.keywords, search.employeeRanges, page);
      if (!response || !response.organizations?.length) break;

      const companies = response.organizations;
      totalCreditsUsed += companies.length;

      for (const company of companies) {
        if (!company.name || !company.primary_domain) continue;

        const normalized = normalizeCompanyName(company.name);
        if (!normalized || normalized.length < 2) continue;

        try {
          // Check for existing
          const existing = await db.select({ id: discoveredCompanies.id })
            .from(discoveredCompanies)
            .where(eq(discoveredCompanies.normalizedName, normalized))
            .limit(1);

          if (existing.length > 0) {
            result.duplicates++;
            continue;
          }

          // Insert as pending — ats-probe will detect the ATS later
          await db.insert(discoveredCompanies).values({
            name: company.name,
            normalizedName: normalized,
            discoverySource: `apollo:${search.label}`,
            jobCount: 0,
            status: 'pending',
          });

          result.discovered++;
          result.industries[search.label] = (result.industries[search.label] || 0) + 1;
        } catch (err: any) {
          // Unique constraint violation = duplicate
          if (err?.code === '23505') {
            result.duplicates++;
          } else {
            result.errors++;
            console.error(`[ApolloDiscovery] Error inserting ${company.name}:`, err?.message);
          }
        }
      }

      // Small delay between pages to be polite to Apollo API
      if (page < maxPages) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // Track credits used
  if (totalCreditsUsed > 0) {
    await addCreditsUsed(totalCreditsUsed);
  }
  result.creditsUsed = totalCreditsUsed;

  console.log(`[ApolloDiscovery] Done: ${result.discovered} new, ${result.duplicates} dupes, ${result.creditsUsed} credits`);
  return result;
}
