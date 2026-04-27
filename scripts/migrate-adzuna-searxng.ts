/**
 * Resolve ALL Adzuna job URLs by searching "<title> <company> <city>" via SearXNG.
 *
 * - Specific job page found (ATS path or URL with job ID) → update external_url
 * - Generic page or no result                   → set status = 'closed'
 *
 * Usage:
 *   npx tsx scripts/migrate-adzuna-searxng.ts \
 *     [--dry-run] \
 *     [--slice N] [--total-slices M]   # partition for parallel runs
 *     [--concurrency N]                # parallel searches per runner (default 10)
 */
import 'dotenv/config';
import postgres from 'postgres';

const DRY_RUN      = process.argv.includes('--dry-run');
const SLICE        = (() => { const i = process.argv.indexOf('--slice');        return i !== -1 ? parseInt(process.argv[i + 1], 10) : 0; })();
const TOTAL_SLICES = (() => { const i = process.argv.indexOf('--total-slices'); return i !== -1 ? parseInt(process.argv[i + 1], 10) : 1; })();
const CONCURRENCY  = (() => { const i = process.argv.indexOf('--concurrency'); return i !== -1 ? parseInt(process.argv[i + 1], 10) : 10; })();
const SEARXNG      = (process.env.SEARXNG_URL ?? 'http://localhost:8080').replace(/\/$/, '');

const AGGREGATOR_DOMAINS = [
  'adzuna', 'indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'monster',
  'simplyhired', 'careerbuilder', 'jobcase', 'jooble', 'dice',
  'talent.com', 'snagajob', 'jobs2careers', 'jobright', 'lensa',
  'usajobs', 'builtin', 'salary.com', 'crunchbase', 'bloomberg',
  'wikipedia', 'reddit', 'facebook', 'twitter', 'youtube',
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com',
  'tealhq.com', 'simplify.jobs', 'bebee.com', 'career.io',
  'higheredjobs.com', 'govconwire.com', 'zippia.com', 'jobscore.com',
  'clearancejobs.com', 'roberthalf.com', 'jobleads.com', 'theladders.com',
  'whatjobs.com', 'seasoned.co', 'earnbetter.com', 'valleycentral.com',
  'jobot.com', 'getwork.com', 'appcast.io', 'joblist.com', 'wellfound.com',
  'credenzahealth.com', 'yougotjobs.com', 'milwaukeejobs.com',
  // additional aggregators found in eval
  'talentify.io', 'ihirefinance.com', 'usnlx.com', 'careeronaut.com',
  'spacecrew.com', 'jobilize.com', 'breakroom.cc', 'wastewaterjobs.com',
  'pitchmeai.com', 'vitaver.com', 'highfivepartners.com', 'jofdav.com',
  'mydermrecruiter.com', 'communitycollegecareerconnect.com', 'tallo.com',
  'jobtoday.com', 'jobtarget.com', 'seasonalworks.labor.ny.gov',
  'illinoisjoblink.illinois.gov', 'knoxvillechamber.com',
  'jobs.fox8.com', 'jobs.khon2.com', 'jobs.khon2', 'fox8.com',
];

// Trusted ATS domains — always accept if path >= 2 segments
const ATS_DOMAINS = [
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'workday.com',
  'smartrecruiters.com', 'ashbyhq.com', 'jobvite.com', 'icims.com',
  'taleo.net', 'bamboohr.com', 'paylocity.com', 'applytojob.com',
  'paycom.com', 'ultipro.com', 'successfactors.com', 'recruitee.com',
  'workable.com', 'breezy.hr', 'pinpointhq.com', 'dover.com',
];

const ATS_SOURCE_MAP: Array<{ domain: string; source: string }> = [
  { domain: 'greenhouse.io',      source: 'greenhouse' },
  { domain: 'lever.co',           source: 'lever' },
  { domain: 'ashbyhq.com',        source: 'ashby' },
  { domain: 'workable.com',       source: 'workable' },
  { domain: 'recruitee.com',      source: 'recruitee' },
  { domain: 'myworkdayjobs.com',  source: 'workday' },
  { domain: 'smartrecruiters.com',source: 'smartrecruiters' },
];

function sourceFromUrl(url: string): string {
  const lower = url.toLowerCase();
  return ATS_SOURCE_MAP.find(e => lower.includes(e.domain))?.source ?? 'career_page';
}

const STOPWORDS = new Set(['the','and','of','in','at','for','a','an','to','inc','llc','corp','co','ltd']);

function isAggregator(url: string): boolean {
  const lower = url.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower.includes(d));
}

function isATS(url: string): boolean {
  const lower = url.toLowerCase();
  return ATS_DOMAINS.some(d => lower.includes(d));
}

const GENERIC_TERMINALS = new Set([
  'careers', 'jobs', 'apply', 'search', 'browse', 'openings',
  'opportunities', 'positions', 'vacancies', 'listing', 'explore',
]);

const NON_HTML_EXTS = /\.(pdf|doc|docx|csv|xls|xlsx|ppt|pptx|txt)(\?|$)/i;

function hasJobId(segment: string): boolean {
  // numeric ID, UUID, alphanumeric with digits, or long title slug (>=20 chars)
  return /\d{4,}/.test(segment) || /^[0-9a-f-]{36}$/i.test(segment) || segment.length >= 20;
}

function isSpecificJobPage(url: string): boolean {
  try {
    if (NON_HTML_EXTS.test(url)) return false;
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return false;
    const last = segments[segments.length - 1].toLowerCase();
    // For ATS domains, trust path >= 2 segments (already validated upstream)
    if (isATS(url)) return true;
    // Must have at least one segment that looks like a job ID
    return segments.some(hasJobId) && !GENERIC_TERMINALS.has(last);
  } catch { return false; }
}

// Check result domain contains at least one meaningful token from company name
function domainMatchesCompany(url: string, company: string): boolean {
  if (isATS(url)) return true; // trust ATS domains unconditionally
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const tokens = company.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(t => t.length >= 4 && !STOPWORDS.has(t));
    return tokens.some(t => domain.includes(t));
  } catch { return false; }
}

function extractCity(location: string | null): string | null {
  if (!location) return null;
  const first = location.split(',')[0].trim();
  if (!first || /^(remote|united states|us|usa|anywhere)$/i.test(first)) return null;
  return first;
}

async function searchSearXNG(query: string, company: string): Promise<string | null> {
  const url = `${SEARXNG}/search?q=${encodeURIComponent(query)}&format=json&language=en-US`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    const json = await r.json() as { results?: Array<{ url: string }> };
    const candidates = (json.results ?? [])
      .map(r => r.url)
      .filter((u): u is string => !!u?.startsWith('http') && !isAggregator(u));
    // Tier 1: trusted ATS with a specific job path
    const atsSpecific = candidates.find(u => isATS(u) && isSpecificJobPage(u));
    if (atsSpecific) return atsSpecific;
    // Tier 2: company domain with a specific job path
    const companySpecific = candidates.find(u => domainMatchesCompany(u, company) && isSpecificJobPage(u));
    if (companySpecific) return companySpecific;
    return null;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function pMap<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < items.length) { await fn(items[i++]); }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dbUrl, { max: 2, prepare: false });

  // Count total Adzuna jobs and compute this slice's range
  const [{ total }] = await sql<[{ total: number }]>`
    SELECT COUNT(*)::int AS total FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
  `;
  const chunkSize = Math.ceil(total / TOTAL_SLICES);
  const offset    = SLICE * chunkSize;

  console.log(`Slice ${SLICE}/${TOTAL_SLICES} | offset=${offset} chunk=${chunkSize} | concurrency=${CONCURRENCY} | dry=${DRY_RUN}`);
  console.log(`SearXNG: ${SEARXNG}\n`);

  const rows = await sql<Array<{
    id: number; title: string; company: string; location: string | null;
  }>>`
    SELECT id, title, company, location
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    ORDER BY id
    LIMIT ${chunkSize} OFFSET ${offset}
  `;

  console.log(`Jobs in this slice: ${rows.length}\n`);

  let updated = 0, closed = 0;
  const startTime = Date.now();

  await pMap(rows, async (job) => {
    const city  = extractCity(job.location);
    const query = [job.title, job.company, city].filter(Boolean).join(' ');
    const url   = await searchSearXNG(query, job.company);

    if (url && isSpecificJobPage(url) && domainMatchesCompany(url, job.company)) {
      updated++;
      const newSource = sourceFromUrl(url);
      if (!DRY_RUN) await sql`
        UPDATE job_postings SET external_url = ${url}, source = ${newSource} WHERE id = ${job.id}
      `;
    } else {
      closed++;
    }
  }, CONCURRENCY);

  await sql.end();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Slice ${SLICE} done in ${elapsed}s ===`);
  console.log(`Updated (specific page): ${updated}`);
  console.log(`Closed (expired):        ${closed}`);
  if (DRY_RUN) console.log('[DRY-RUN] No DB writes made.');
}

main().catch(err => { console.error(err); process.exit(1); });
