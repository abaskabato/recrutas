/**
 * Sanity check for isJobPostUrl(): pulls real production URLs from the DB
 * and compares the JS validator's verdict against the SQL predicate's verdict.
 * Any disagreement is a bug — the JS guard at ingestion must accept exactly
 * the same set the SQL feed filter accepts.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { isJobPostUrl } from '../server/services/job-ingestion.service';

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 2, prepare: false });

const REQ = `(
  external_url IS NOT NULL
  AND NOT (external_url ~ '^https?://[^/]+/?$')
  AND (
    external_url ~ '[/?][^/?#]*\\d{4,}'
    OR external_url ~* '(gh_jid|jobid|requisition|posting|/job/|/jobs/[a-z0-9_-]{8,})'
    OR external_url ~* '(boards\\.greenhouse\\.io|job-boards\\.greenhouse\\.io|jobs\\.lever\\.co|jobs\\.ashbyhq\\.com|\\.recruitee\\.com|\\.workable\\.com|\\.bamboohr\\.com|myworkdayjobs\\.com|smartrecruiters\\.com|icims\\.com|taleo\\.net)'
  )
)`;

(async () => {
  const rows = await sql.unsafe(`
    SELECT external_url, (${REQ}) AS sql_verdict
    FROM job_postings
    WHERE status = 'active' AND external_url IS NOT NULL
    ORDER BY random()
    LIMIT 1000
  `) as Array<{ external_url: string; sql_verdict: boolean }>;

  let agree = 0, disagree = 0;
  const mismatches: Array<{ url: string; sql: boolean; js: boolean }> = [];
  for (const r of rows) {
    const js = isJobPostUrl(r.external_url);
    if (js === r.sql_verdict) {
      agree++;
    } else {
      disagree++;
      if (mismatches.length < 20) mismatches.push({ url: r.external_url, sql: r.sql_verdict, js });
    }
  }
  console.log(`Sampled ${rows.length} URLs. Agree: ${agree}. Disagree: ${disagree}.`);
  if (mismatches.length) {
    console.log('\nMismatches:');
    for (const m of mismatches) console.log(`  sql=${m.sql} js=${m.js}  ${m.url}`);
  }

  await sql.end();
})();
