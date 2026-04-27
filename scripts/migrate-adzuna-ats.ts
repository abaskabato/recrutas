/**
 * Second-pass migration: for Adzuna jobs that now have a company homepage,
 * probe Greenhouse / Ashby / Workable to find the specific job URL by title match.
 *
 * Usage: npx tsx scripts/migrate-adzuna-ats.ts [--dry-run] [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';

const DRY_RUN   = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const MAX_JOBS  = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

const TIMEOUT  = 10_000;
const CHUNK    = 200;
const MATCH_THRESHOLD = 0.4;

// ── Title matching ────────────────────────────────────────────────────────────

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'are', 'you']);

function titleWords(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccard(a: string, b: string): number {
  const wa = titleWords(a);
  const wb = titleWords(b);
  const intersection = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

function bestTitleMatch(title: string, jobs: Array<{ title: string; url: string }>): string | null {
  let best = 0, bestUrl: string | null = null;
  for (const j of jobs) {
    const score = jaccard(title, j.title);
    if (score > best) { best = score; bestUrl = j.url; }
  }
  return best >= MATCH_THRESHOLD ? bestUrl : null;
}

// ── ATS fetchers ──────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function getGreenhouseJobs(slug: string): Promise<Array<{ title: string; url: string }> | null> {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
  if (!data?.jobs?.length) return null;
  return data.jobs.map((j: any) => ({ title: j.title, url: j.absolute_url }));
}

async function getAshbyJobs(slug: string): Promise<Array<{ title: string; url: string }> | null> {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  if (!data?.jobs?.length) return null;
  return data.jobs.map((j: any) => ({ title: j.title, url: j.jobUrl }));
}

async function getWorkableJobs(slug: string): Promise<Array<{ title: string; url: string }> | null> {
  const data = await fetchJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}/jobs`);
  if (!data?.results?.length) return null;
  return data.results.map((j: any) => ({ title: j.title, url: `https://apply.workable.com/${slug}/j/${j.shortcode}` }));
}

// ── Company → ATS probe ───────────────────────────────────────────────────────

function slugs(company: string): string[] {
  const base = company.toLowerCase();
  return [
    base.replace(/[^a-z0-9]/g, ''),
    base.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    base.replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
  ].filter((v, i, a) => a.indexOf(v) === i);
}

type AtsJobs = Array<{ title: string; url: string }>;
const atsCache = new Map<string, AtsJobs | null>();

async function probeAts(company: string): Promise<AtsJobs | null> {
  const key = company.toLowerCase();
  if (atsCache.has(key)) return atsCache.get(key)!;

  for (const slug of slugs(company)) {
    const gh = await getGreenhouseJobs(slug);
    if (gh) { atsCache.set(key, gh); return gh; }
    const ash = await getAshbyJobs(slug);
    if (ash) { atsCache.set(key, ash); return ash; }
    const wk = await getWorkableJobs(slug);
    if (wk) { atsCache.set(key, wk); return wk; }
  }

  atsCache.set(key, null);
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 3, prepare: false });

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) as count FROM job_postings
    WHERE source = 'Adzuna' AND external_url NOT LIKE '%adzuna%'
  `;
  const total = Math.min(parseInt(count, 10), MAX_JOBS === Infinity ? Infinity : MAX_JOBS);
  console.log(`Found ${count} Adzuna jobs with homepage URLs${MAX_JOBS !== Infinity ? ` (limiting to ${MAX_JOBS})` : ''}`);
  if (DRY_RUN) console.log('DRY RUN — no writes\n');

  let processed = 0, matched = 0, noAts = 0, noMatch = 0;
  let lastId = 0;
  const startedAt = Date.now();

  while (processed < total) {
    const jobs = await sql<Array<{ id: number; title: string; company: string }>>`
      SELECT id, title, company
      FROM job_postings
      WHERE source = 'Adzuna' AND external_url NOT LIKE '%adzuna%' AND id > ${lastId}
      ORDER BY id
      LIMIT ${CHUNK}
    `;
    if (jobs.length === 0) break;
    lastId = jobs[jobs.length - 1].id;

    // Group by company to probe ATS once per company
    const byCompany = new Map<string, Array<{ id: number; title: string; company: string; }>>();
    for (const j of jobs) {
      const list = byCompany.get(j.company) ?? [];
      list.push(j);
      byCompany.set(j.company, list);
    }

    const updates: Array<{ id: number; url: string }> = [];

    for (const [company, companyJobs] of byCompany) {
      const atsJobs = await probeAts(company);
      if (!atsJobs) { noAts += companyJobs.length; continue; }

      for (const job of companyJobs) {
        const url = bestTitleMatch(job.title, atsJobs);
        if (url) updates.push({ id: job.id, url });
        else noMatch++;
      }
    }

    matched += updates.length;
    processed += jobs.length;

    if (!DRY_RUN && updates.length > 0) {
      await Promise.all(
        updates.map(u => sql`UPDATE job_postings SET external_url = ${u.url} WHERE id = ${u.id}`)
      );
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    const pct = Math.min((processed / total) * 100, 100).toFixed(1);
    const line = `[${elapsed}s] ${processed}/${total} (${pct}%) | matched=${matched} noAts=${noAts} noMatch=${noMatch}`;
    if (process.env.CI) console.log(line);
    else process.stdout.write(`\r${line}   `);
  }

  console.log(`\n\nDone in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`Matched:  ${matched}/${processed} (${((matched / processed) * 100).toFixed(1)}%)`);
  console.log(`No ATS:   ${noAts}`);
  console.log(`No match: ${noMatch}`);

  await sql.end();
}
main().catch(err => { console.error(err); process.exit(1); });
