import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  const rows = await sql<Array<{ title: string; company: string; description: string }>>`
    SELECT title, company, description
    FROM job_postings
    WHERE source = 'Adzuna' AND description LIKE '%http%' AND company IS NOT NULL
    LIMIT 10
  `;
  await sql.end();

  console.log('Jobs with URLs in description:');
  rows.forEach(r => {
    const url = r.description.match(/https?:\/\/[^\s]+/)?.[0] || 'none';
    console.log(`${r.company}: ${url.slice(0, 80)}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });