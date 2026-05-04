import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 2, prepare: false });

// Mirror of jobPostUrlRequirement in server/storage.ts — keeps verification honest.
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
  const active = await sql`SELECT COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())`;
  console.log('Active jobs total:                     ', active[0].n);

  const passing = await sql.unsafe(`SELECT COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND (source = 'platform' OR ${REQ})`);
  console.log('Active passing jobPostUrlRequirement:  ', passing[0].n);

  const dropped = await sql.unsafe(`SELECT COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND NOT (source = 'platform' OR ${REQ})`);
  console.log('Dropped by new filter:                 ', dropped[0].n);

  // Source breakdown of dropped jobs
  const droppedBySrc = await sql.unsafe(`SELECT source, COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND NOT (source = 'platform' OR ${REQ})
    GROUP BY source ORDER BY n DESC LIMIT 15`);
  console.log('\nDropped jobs by source:');
  for (const r of droppedBySrc) console.log(`  ${String(r.source ?? '(null)').padEnd(20)} ${r.n}`);

  // Sample 15 dropped URLs to spot-check the filter is removing the right things
  const droppedSamples = await sql.unsafe(`SELECT source, external_url FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND NOT (source = 'platform' OR ${REQ})
    ORDER BY random() LIMIT 15`);
  console.log('\nSample dropped URLs (these will no longer appear in the feed):');
  for (const r of droppedSamples) console.log(`  [${r.source}] ${r.external_url}`);

  // Sample 15 passing URLs to confirm we're keeping real job posts
  const keptSamples = await sql.unsafe(`SELECT source, external_url FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND (source = 'platform' OR ${REQ})
    ORDER BY random() LIMIT 15`);
  console.log('\nSample kept URLs (still in the feed):');
  for (const r of keptSamples) console.log(`  [${r.source}] ${r.external_url}`);

  await sql.end();
})();
