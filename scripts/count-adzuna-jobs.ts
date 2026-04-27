import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  const result = await sql<Array<{ count: number }>>`
    SELECT COUNT(*) as count FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
  `;

  console.log(`Total Adzuna jobs with adzuna.com redirect: ${result[0].count}`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });