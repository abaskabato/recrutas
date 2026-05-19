/**
 * Backfill descriptions + skills for existing ATS:* jobs that landed with
 * empty bodies (the bulk discovery path in scrape-all-company-jobs.ts used
 * to only fetch listing data, not per-job content).
 *
 * Strategy: group active rows by company, re-fetch each ATS API with content
 * enabled, then match by external_url and update description + skills.
 *
 * Usage: npx tsx scripts/backfill-ats-descriptions.ts [--dry-run] [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';
import { listAtsJobs, type AtsType } from '../server/lib/adzuna-link-resolver';
import { normalizeSkills } from '../server/skill-normalizer';

const DRY_RUN  = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const COMPANY_LIMIT = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;
const CONC = 6;

// Lightweight skill extractor — mirrors job-ingestion.service.ts so we don't
// pull the whole module (which imports drizzle and triggers DB connect).
async function loadSkillExtractor() {
  const { SKILL_ALIASES } = await import('../server/skill-normalizer');
  return (text: string): string[] => {
    if (!text) return [];
    const words = text.split(/[\s,;|•·()[\]{}<>]+/).filter(w => w.length > 0);
    const found = new Set<string>();
    for (let i = 0; i < words.length; i++) {
      for (let n = 1; n <= 4 && i + n <= words.length; n++) {
        const phrase = words.slice(i, i + n).join(' ').toLowerCase();
        const canonical = (SKILL_ALIASES as Record<string, string>)[phrase];
        if (canonical) found.add(canonical);
      }
    }
    return Array.from(found).slice(0, 20);
  };
}

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 3, prepare: false });
  const extractSkills = await loadSkillExtractor();

  // Find companies with empty-description ATS rows. We pull the ATS type from
  // the source prefix and the boardId/atsId from discovered_companies.
  const companies = await sql<Array<{ ats_type: string; ats_id: string; row_count: number }>>`
    SELECT
      lower(substring(jp.source from 'ATS:(.*)')) AS ats_type,
      dc."atsId" AS ats_id,
      COUNT(*)::int AS row_count
    FROM job_postings jp
    JOIN discovered_companies dc
      ON lower(dc."normalizedName") = lower(jp.company)
     AND dc."detectedAts" = lower(substring(jp.source from 'ATS:(.*)'))
    WHERE jp.status = 'active'
      AND jp.source LIKE 'ATS:%'
      AND (jp.description IS NULL OR length(jp.description) < 100)
      AND dc."atsId" IS NOT NULL
    GROUP BY ats_type, ats_id
    ORDER BY row_count DESC
    LIMIT ${COMPANY_LIMIT === Infinity ? 10000 : COMPANY_LIMIT}
  `;
  console.log(`Found ${companies.length} ATS companies with empty-description rows`);

  let scraped = 0, updated = 0, skipped = 0;

  for (let i = 0; i < companies.length; i += CONC) {
    const slice = companies.slice(i, i + CONC);
    const fetches = await Promise.allSettled(
      slice.map(async (c) => {
        const jobs = await listAtsJobs(c.ats_type as AtsType, c.ats_id, { includeDescription: true });
        return { atsType: c.ats_type, atsId: c.ats_id, jobs };
      })
    );

    for (const f of fetches) {
      if (f.status !== 'fulfilled' || f.value.jobs.length === 0) continue;
      scraped++;

      // Build a URL → description map for this company. Match against
      // external_url so we hit the right row even when a company posts the
      // same role twice with different IDs.
      const byUrl = new Map<string, { description: string; skills: string[] }>();
      for (const j of f.value.jobs) {
        if (!j.url || !j.description || j.description.length < 100) continue;
        const skills = normalizeSkills(extractSkills(j.description));
        byUrl.set(j.url, { description: j.description, skills });
      }

      if (byUrl.size === 0) continue;

      if (!DRY_RUN) {
        const urls = Array.from(byUrl.keys());
        const descs = urls.map(u => byUrl.get(u)!.description);
        const skillsArr = urls.map(u => JSON.stringify(byUrl.get(u)!.skills));
        const res = await sql`
          UPDATE job_postings AS jp
          SET description = v.description,
              skills = v.skills::jsonb,
              updated_at = NOW()
          FROM unnest(
            ${sql.array(urls)}::text[],
            ${sql.array(descs)}::text[],
            ${sql.array(skillsArr)}::text[]
          ) AS v(url, description, skills)
          WHERE jp.external_url = v.url
            AND jp.source = ${'ATS:' + f.value.atsType}
            AND (jp.description IS NULL OR length(jp.description) < 100)
        `;
        updated += res.count ?? 0;
      } else {
        skipped += byUrl.size;
      }
    }

    process.stdout.write(`\r  [${Math.min(i + CONC, companies.length)}/${companies.length}] scraped=${scraped} updated=${updated} ${DRY_RUN ? `would-update=${skipped}` : ''}   `);
  }

  console.log(`\nDone. Scraped ${scraped} companies, ${DRY_RUN ? `would update ${skipped} rows` : `updated ${updated} rows`}`);
  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
