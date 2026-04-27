import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function test() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });
  const jobs = await sql`SELECT title, company, location FROM job_postings WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%' AND location IS NOT NULL ORDER BY RANDOM() LIMIT 30`;
  await sql.end();

  for (const j of jobs) {
    const r = await resolveAdzunaLink({ title: j.title, company: j.company, location: j.location, fallbackUrl: 'https://adzuna.com' });
    const status = r.resolved
      ? (r.resolvedVia === 'ats' ? `ATS(${r.atsType}) ${r.score?.toFixed(2)}` : `hp:${r.resolvedVia}`)
      : 'FALLBACK';
    console.log(`[${status.padEnd(20)}] ${j.company} — "${j.title}"`);
  }
}
test().catch(console.error);
