/**
 * Batch-migrates all Adzuna jobs in job_postings that still have redirect URLs.
 * Uses our improved resolveAdzunaLink with ATS catalog, scraping, and description extraction.
 *
 * Usage: npx tsx scripts/migrate-adzuna-links.ts [--dry-run] [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

const DRY_RUN   = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const MAX_JOBS  = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

const CHUNK   = 100;
const CONC    = 5;

const domainCache = new Map<string, string | null>();

const TIMEOUT = 8_000;

function cleanCompanyName(company: string): string {
  return company
    .replace(/\bc\/o\b.*/i, '')
    .replace(/\b(llc|inc|ltd|corp|co|plc|lp|llp|dba)\.?\b/gi, '')
    .replace(/\s*[-–|]\s*.+$/, '')
    .replace(/[.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bestMatch(company: string, results: Array<{ name: string; domain: string }>): string | null {
  const key = normalize(company);
  for (const r of results) {
    const rName = normalize(r.name);
    const rDomain = normalize(r.domain.split('.')[0]);
    // Name must contain the full company key, or domain must start with the key
    if (rName.includes(key) || rDomain === key) {
      return `https://${r.domain}`;
    }
  }
  return null;
}

async function getCareersUrl(company: string): Promise<string | null> {
  const key = company.trim().toLowerCase();
  if (domainCache.has(key)) return domainCache.get(key)!;
  const cleaned = cleanCompanyName(company);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(cleaned)}`;
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) { domainCache.set(key, null); return null; }
    const arr = await r.json() as Array<{ name: string; domain: string }>;
    const result = arr?.length ? bestMatch(cleaned, arr) : null;
    domainCache.set(key, result);
    return result;
  } catch {
    domainCache.set(key, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 3, prepare: false });

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) as count FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
  `;
  const total = Math.min(parseInt(count, 10), MAX_JOBS === Infinity ? Infinity : MAX_JOBS);
  console.log(`Found ${count} unresolved Adzuna jobs${MAX_JOBS !== Infinity ? ` (limiting to ${MAX_JOBS})` : ''}`);
  if (DRY_RUN) console.log('DRY RUN — no writes\n');

  let processed = 0, exact = 0, careers = 0, fallback = 0;
  let lastId = 0;
  const startedAt = Date.now();

  while (processed < total) {
    const jobs = await sql<Array<{ id: number; title: string; company: string; location: string; external_url: string; description: string | null }>>`
      SELECT id, title, company, location, external_url, description
      FROM job_postings
      WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%' AND id > ${lastId}
      ORDER BY id
      LIMIT ${CHUNK}
    `;
    if (jobs.length === 0) break;
    lastId = jobs[jobs.length - 1].id;

    // Resolve concurrently using our resolver
    const updates: Array<{ id: number; url: string; newSource: string | null }> = [];
    for (let i = 0; i < jobs.length; i += CONC) {
      const slice = jobs.slice(i, i + CONC);
      const results = await Promise.all(slice.map(async (j) => {
        const result = await resolveAdzunaLink({
          title: j.title,
          company: j.company,
          location: j.location,
          fallbackUrl: j.external_url,
          description: j.description ?? undefined,
        });
        return { id: j.id, originalUrl: j.external_url, url: result.url, via: result.resolvedVia, atsType: result.atsType };
      }));
      for (const r of results) {
        if (r.url && r.url !== r.originalUrl) {
          // Compute new source — only for resolutions that land on a specific job page
          let newSource: string | null = null;
          if (r.via === 'ats' || r.via === 'existing') {
            newSource = r.atsType ?? 'career_page';
            exact++;
          } else if (r.via === 'description' || r.via === 'scraped') {
            newSource = 'career_page';
            careers++;
          } else {
            // careers_page → URL updated but source stays Adzuna (homepage, not a job post)
            careers++;
          }
          updates.push({ id: r.id, url: r.url, newSource });
        } else {
          fallback++;
        }
      }
    }

    processed += jobs.length;

    if (!DRY_RUN && updates.length > 0) {
      // Bulk update external_url for all resolved jobs
      const ids  = updates.map(u => u.id);
      const urls = updates.map(u => u.url);
      await sql`
        UPDATE job_postings AS jp
        SET external_url = v.url
        FROM unnest(${sql.array(ids)}::int[], ${sql.array(urls)}::text[]) AS v(id, url)
        WHERE jp.id = v.id
      `;

      // Separately update source for jobs with a meaningful job-post URL
      const sourced = updates.filter(u => u.newSource !== null);
      if (sourced.length > 0) {
        const sIds     = sourced.map(u => u.id);
        const sSources = sourced.map(u => u.newSource as string);
        await sql`
          UPDATE job_postings AS jp
          SET source = v.source
          FROM unnest(${sql.array(sIds)}::int[], ${sql.array(sSources)}::text[]) AS v(id, source)
          WHERE jp.id = v.id
        `;
      }
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    const pct = Math.min((processed / total) * 100, 100).toFixed(1);
    const line = `[${elapsed}s] ${processed}/${total} (${pct}%) | exact=${exact} careers=${careers} fallback=${fallback}`;
    if (process.env.CI) console.log(line);
    else process.stdout.write(`\r${line}   `);
  }

  console.log(`\n\nDone in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`Exact Job URLs: ${exact}/${processed} (${((exact / processed) * 100).toFixed(1)}%)`);
  console.log(`Careers Pages: ${careers}`);
  console.log(`Fallback: ${fallback}`);

  // Retroactive pass: jobs already resolved (no adzuna URL) but source still 'Adzuna'
  console.log('\nRetroactive source fix...');
  const ATS_URL_PATTERNS: Array<{ source: string; re: RegExp }> = [
    { source: 'greenhouse', re: /https?:\/\/(?:boards\.)?[\w-]+\.greenhouse\.io\//i },
    { source: 'lever',      re: /https?:\/\/jobs\.(?:eu\.)?lever\.co\//i },
    { source: 'ashby',      re: /https?:\/\/(?:jobs\.ashbyhq\.com|[\w-]+\.ashbyhq\.com)\//i },
    { source: 'workable',   re: /https?:\/\/apply\.workable\.com\//i },
    { source: 'recruitee',  re: /https?:\/\/[\w-]+\.recruitee\.com\//i },
  ];

  const stale = await sql<Array<{ id: number; external_url: string }>>`
    SELECT id, external_url FROM job_postings
    WHERE source = 'Adzuna' AND external_url NOT LIKE '%adzuna%'
  `;
  console.log(`Found ${stale.length} already-resolved jobs still tagged Adzuna`);

  if (!DRY_RUN && stale.length > 0) {
    const rIds: number[] = [];
    const rSources: string[] = [];
    for (const j of stale) {
      const match = ATS_URL_PATTERNS.find(p => p.re.test(j.external_url));
      rIds.push(j.id);
      rSources.push(match ? match.source : 'career_page');
    }
    await sql`
      UPDATE job_postings AS jp
      SET source = v.source
      FROM unnest(${sql.array(rIds)}::int[], ${sql.array(rSources)}::text[]) AS v(id, source)
      WHERE jp.id = v.id
    `;
    console.log(`Updated source for ${rIds.length} retroactive jobs`);
  } else if (DRY_RUN) {
    console.log('DRY RUN — skipping retroactive writes');
  }

  await sql.end();
}
main().catch(err => { console.error(err); process.exit(1); });
