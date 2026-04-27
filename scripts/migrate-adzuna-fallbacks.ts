/**
 * Third-pass migration for Adzuna jobs still on redirect URLs.
 * Groups by unique company — runs resolution once per company, bulk-updates all jobs.
 *
 * Strategies per company:
 *   1. Extract company-matching URL from any job description for that company
 *   2. Clearbit autocomplete with cleaned name
 *   3. Domain guessing + HTML title validation (parallel candidates)
 *
 * Usage: npx tsx scripts/migrate-adzuna-fallbacks.ts [--dry-run] [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';

const DRY_RUN   = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const MAX_COMPANIES = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

const CONC    = 15;
const TIMEOUT = 3_000;

const AGGREGATORS = /adzuna|indeed|linkedin|glassdoor|ziprecruiter|monster|simplyhired|careerbuilder|bit\.ly|goo\.gl|t\.co/i;

// ── Shared utils ──────────────────────────────────────────────────────────────

// Light clean: only strip legal suffixes + c/o + location suffix — keeps brand words intact (for Clearbit)
function cleanCompanyName(company: string): string {
  return company
    .replace(/\bc\/o\b.*/i, '')
    .replace(/\b(llc|inc|ltd|corp|plc|lp|llp|dba)\.?\b/gi, '')
    .replace(/\s*[-–|]\s*.+$/, '')
    .replace(/[.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Aggressive clean: also strip generic industry words — better for domain slug guessing
function cleanForDomain(company: string): string {
  return cleanCompanyName(company)
    .replace(/\b(solutions?|services?|systems?|group|consulting|staffing|healthcare|health|technologies?|technology|milling|enterprises?|management|co)\b/gi, '')
    .replace(/[.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0', ...opts.headers } });
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// ── Strategy 1: description URL match ────────────────────────────────────────

function extractDescriptionUrl(description: string, company: string): string | null {
  const urls = [...description.matchAll(/https?:\/\/[^\s<>"')]+/gi)].map(m => m[0]);
  const companyWords = company.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  for (const url of urls) {
    if (AGGREGATORS.test(url)) continue;
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
      if (companyWords.some(w => normalizeStr(domain).includes(normalizeStr(w)))) {
        return url.split('?')[0].replace(/\/$/, '');
      }
    } catch {}
  }
  return null;
}

// ── Strategy 2: Clearbit ──────────────────────────────────────────────────────

function bestClearbitMatch(company: string, results: Array<{ name: string; domain: string }>): string | null {
  const key = normalizeStr(company);
  for (const r of results) {
    if (normalizeStr(r.name).includes(key) || normalizeStr(r.domain.split('.')[0]) === key) {
      return `https://${r.domain}`;
    }
  }
  return null;
}

async function getClearbitUrl(company: string): Promise<string | null> {
  const cleaned = cleanCompanyName(company);
  if (!cleaned) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const r = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(cleaned)}`, {
      headers: { Accept: 'application/json' }, signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const arr = await r.json() as Array<{ name: string; domain: string }>;
    return arr?.length ? bestClearbitMatch(cleaned, arr) : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// ── Strategy 3: domain guess + title validation ───────────────────────────────

function domainCandidates(company: string): string[] {
  const light = cleanCompanyName(company);
  const words = light.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const candidates = new Set<string>();
  if (words[0]) candidates.add(words[0]);                          // first word only: "divihn"
  if (words.length > 1) candidates.add(words.slice(0, 2).join('')); // first 2: "bozemanhealth"
  if (words.length > 2) candidates.add(words.slice(0, 3).join('')); // first 3
  candidates.add(words.join(''));                                    // all words
  candidates.add(words.join('-'));                                   // hyphenated
  return [...candidates].filter(c => c.length >= 4);
}

function titleMatchesCompany(title: string, company: string): boolean {
  const cleaned = cleanCompanyName(company);
  const titleWords = new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const companyWords = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  return companyWords.filter(w => titleWords.has(w)).length >= Math.min(2, companyWords.length);
}

async function tryUrl(url: string, company: string): Promise<string | null> {
  const r = await fetchWithTimeout(url);
  if (!r?.ok) return null;
  const html = await r.text();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch && titleMatchesCompany(titleMatch[1], company) ? r.url.replace(/\/$/, '') : null;
}

async function getDomainGuessUrl(company: string): Promise<string | null> {
  const candidates = domainCandidates(company);
  // Try all candidates + TLDs in parallel
  const attempts = candidates.flatMap(slug =>
    ['.com', '.org', '.net'].map(tld => tryUrl(`https://www.${slug}${tld}`, company))
  );
  const results = await Promise.all(attempts);
  return results.find(r => r !== null) ?? null;
}

// ── Resolve one company ───────────────────────────────────────────────────────

type Source = 'desc' | 'clearbit' | 'domain';

async function resolveCompany(company: string, descriptions: string[]): Promise<{ url: string; via: Source } | null> {
  // 1. Description
  for (const desc of descriptions) {
    const url = extractDescriptionUrl(desc, company);
    if (url) return { url, via: 'desc' };
  }
  // 2. Clearbit
  const clearbitUrl = await getClearbitUrl(company);
  if (clearbitUrl) return { url: clearbitUrl, via: 'clearbit' };
  // 3. Domain guess
  const domainUrl = await getDomainGuessUrl(company);
  if (domainUrl) return { url: domainUrl, via: 'domain' };
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 3, prepare: false });

  // Fetch all unresolved jobs grouped by company
  const jobs = await sql<Array<{ id: number; company: string; description: string | null }>>`
    SELECT id, company, description
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
      AND company ~ '^[A-Za-z]'
    ORDER BY id
  `;

  // Group by company
  const byCompany = new Map<string, Array<{ id: number; description: string | null }>>();
  for (const j of jobs) {
    const list = byCompany.get(j.company) ?? [];
    list.push({ id: j.id, description: j.description });
    byCompany.set(j.company, list);
  }

  const companies = [...byCompany.keys()].slice(0, MAX_COMPANIES === Infinity ? undefined : MAX_COMPANIES);
  console.log(`Found ${jobs.length} unresolved jobs across ${byCompany.size} unique companies`);
  console.log(`Processing ${companies.length} companies`);
  if (DRY_RUN) console.log('DRY RUN — no writes\n');

  let processed = 0, fromDesc = 0, fromClearbit = 0, fromDomain = 0, fallback = 0;
  const startedAt = Date.now();

  // Process companies in concurrent batches
  for (let i = 0; i < companies.length; i += CONC) {
    const batch = companies.slice(i, i + CONC);
    await Promise.all(batch.map(async company => {
      const companyJobs = byCompany.get(company)!;
      const descriptions = companyJobs.map(j => j.description ?? '').filter(Boolean);
      const result = await resolveCompany(company, descriptions);

      processed++;
      if (!result) { fallback += companyJobs.length; return; }

      if (result.via === 'desc') fromDesc += companyJobs.length;
      else if (result.via === 'clearbit') fromClearbit += companyJobs.length;
      else fromDomain += companyJobs.length;

      if (!DRY_RUN) {
        const ids = companyJobs.map(j => j.id);
        await sql`UPDATE job_postings SET external_url = ${result.url} WHERE id = ANY(${ids})`;
      }
    }));

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    const pct = ((processed / companies.length) * 100).toFixed(1);
    const resolved = fromDesc + fromClearbit + fromDomain;
    const line = `[${elapsed}s] ${processed}/${companies.length} companies (${pct}%) | desc=${fromDesc} clearbit=${fromClearbit} domain=${fromDomain} fallback=${fallback} resolved_jobs=${resolved}`;
    if (process.env.CI) console.log(line);
    else process.stdout.write(`\r${line}   `);
  }

  const resolved = fromDesc + fromClearbit + fromDomain;
  console.log(`\n\nDone in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`Companies resolved: ${companies.length - fallback / (jobs.length / companies.length) | 0}/${companies.length}`);
  console.log(`Jobs resolved: ${resolved}/${jobs.length} (${((resolved / jobs.length) * 100).toFixed(1)}%)`);
  console.log(`  Description URL: ${fromDesc}`);
  console.log(`  Clearbit:        ${fromClearbit}`);
  console.log(`  Domain guess:    ${fromDomain}`);
  console.log(`  Fallback jobs:   ${fallback}`);

  await sql.end();
}
main().catch(err => { console.error(err); process.exit(1); });
