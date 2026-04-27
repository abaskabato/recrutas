import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });
  const jobs = await sql<Array<{ title: string; company: string; location: string; external_url: string }>>`
    SELECT title, company, location, external_url
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    ORDER BY RANDOM() LIMIT 10
  `;
  await sql.end();

  for (const [i, j] of jobs.entries()) {
    const r = await resolveAdzunaLink({ title: j.title, company: j.company, location: j.location, fallbackUrl: j.external_url });
    const via = r.resolved ? `${r.resolvedVia}${r.atsType ? `(${r.atsType})` : ''}${r.score != null ? ` ${r.score.toFixed(2)}` : ''}` : 'FALLBACK';
    console.log(`[${String(i+1).padStart(2)}] [${via.padEnd(22)}] ${j.company}`);
    console.log(`      "${j.title.slice(0,70)}"`);
    console.log(`      ${r.url.slice(0,90)}`);
  }
}
main().catch(console.error);
