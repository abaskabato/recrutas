import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
  try {
    const jobs = await sql`SELECT source, COUNT(*) as count FROM job_postings GROUP BY source`;
    console.log('Jobs by source:');
    jobs.forEach(j => console.log(`  ${j.source}: ${j.count}`));
    
    const latest = await sql`SELECT title, company, location, source FROM job_postings ORDER BY created_at DESC LIMIT 1`;
    if (latest.length > 0) {
      console.log('\nLatest job:');
      console.log(`  Title: ${latest[0].title}`);
      console.log(`  Company: ${latest[0].company}`);
      console.log(`  Location: ${latest[0].location}`);
      console.log(`  Source: ${latest[0].source}`);
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

check();
