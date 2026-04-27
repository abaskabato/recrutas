import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });

  const [stats] = await sql<[any]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE external_url LIKE '%adzuna%')::int AS adzuna,
      COUNT(*) FILTER (WHERE external_url NOT LIKE '%adzuna%')::int AS resolved,
      COUNT(*) FILTER (WHERE external_url ~ '^https?://[^/]+/?$')::int AS homepage_only,
      COUNT(*) FILTER (WHERE external_url NOT LIKE '%adzuna%' AND external_url !~ '^https?://[^/]+/?$')::int AS specific_page
    FROM job_postings WHERE source = 'Adzuna'
  `;
  console.log('Total Adzuna jobs:    ', stats.total);
  console.log('Still Adzuna URLs:    ', stats.adzuna);
  console.log('Resolved (any):       ', stats.resolved);
  console.log('  → Homepage only:    ', stats.homepage_only);
  console.log('  → Specific page:    ', stats.specific_page);

  await sql.end();
}
main().catch(console.error);
