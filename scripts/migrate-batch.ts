import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, idle_timeout: 20 });

  // Get count
  const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM job_postings WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'`;
  console.log(`Found ${count} jobs to migrate\n`);

  let offset = 0, totalUpd = 0, ats = 0, hp = 0, fb = 0;
  const BATCH = 100;

  while (offset < count) {
    const jobs = await sql`
      SELECT id, title, company, location, external_url, description
      FROM job_postings
      WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
      LIMIT ${BATCH} OFFSET ${offset}
    `;

    for (const j of jobs) {
      const r = await resolveAdzunaLink({
        title: j.title, company: j.company,
        location: j.location, fallbackUrl: j.external_url,
        description: j.description
      });

      if (r.url !== j.external_url) {
        await sql`UPDATE job_postings SET external_url = ${r.url} WHERE id = ${j.id}`;
        totalUpd++;
      }
      if (r.atsType) ats++; else if (r.resolved) hp++; else fb++;
    }

    console.log(`${Math.min(offset + BATCH, count)}/${count} | Updated: ${totalUpd} | ATS: ${ats} HP: ${hp} FB: ${fb}`);
    offset += BATCH;
    await new Promise(r => setTimeout(r, 50));
  }

  await sql.end();
  console.log(`\nDone! ${totalUpd} updated, ${ats} ATS, ${hp} HP, ${fb} fallback`);
}

main().catch(e => { console.error(e); process.exit(1); });