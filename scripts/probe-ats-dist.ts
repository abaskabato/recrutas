import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });

  const rows = await sql<any[]>`
    SELECT external_url FROM job_postings
    WHERE source = 'Adzuna'
      AND external_url NOT LIKE '%adzuna%'
      AND external_url !~ '^https?://[^/]+/?$'
    LIMIT 5000
  `;

  const counts: Record<string, number> = {};
  for (const { external_url } of rows) {
    try {
      const host = new URL(external_url).hostname;
      const key =
        host.includes('myworkdayjobs') ? 'workday' :
        host.includes('greenhouse.io') ? 'greenhouse' :
        host.includes('lever.co')      ? 'lever' :
        host.includes('icims.com')     ? 'icims' :
        host.includes('taleo.net')     ? 'taleo' :
        host.includes('smartrecruiters') ? 'smartrecruiters' :
        host.includes('ashbyhq.com')   ? 'ashby' :
        host.includes('bamboohr.com')  ? 'bamboohr' :
        host.includes('jobvite.com')   ? 'jobvite' :
        host.includes('paylocity.com') ? 'paylocity' :
        host.includes('successfactors') ? 'successfactors' :
        'custom';
      counts[key] = (counts[key] || 0) + 1;
    } catch {}
  }

  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  console.log(`Total specific pages: ${rows.length}\n`);
  for (const [ats, n] of sorted) console.log(`  ${ats.padEnd(20)} ${n}`);

  await sql.end();
}
main().catch(console.error);
