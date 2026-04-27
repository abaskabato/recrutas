import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });

  const tables = await sql<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log('Tables:', tables.map(t => t.tablename).join(', '));

  const [jobs] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE source = 'platform') as platform,
      COUNT(*) FILTER (WHERE source = 'career_page') as career_page,
      COUNT(*) FILTER (WHERE source = 'Adzuna') as adzuna,
      COUNT(*) FILTER (WHERE source NOT IN ('platform','career_page','Adzuna')) as other
    FROM job_postings
  `;
  console.log('\nJobs:', jobs);

  const [users] = await sql`SELECT COUNT(*) as total FROM users`;
  console.log('Users:', users.total);

  const [apps] = await sql`SELECT COUNT(*) as total FROM job_applications`;
  console.log('Applications:', apps.total);

  await sql.end();
}
main().catch(console.error);
