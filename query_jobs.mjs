import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, { ssl: 'require' });

async function getExternalJobs() {
  try {
    const jobs = await sql`
      SELECT 
        id, 
        title, 
        company, 
        location, 
        source,
        external_source as "externalSource",
        external_url as "externalUrl",
        description,
        skills,
        work_type as "workType",
        created_at
      FROM job_postings 
      WHERE external_source IS NOT NULL OR source = 'external'
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    if (jobs.length === 0) {
      console.log("No external jobs found yet. Checking all sources:");
      const sources = await sql`
        SELECT DISTINCT source FROM job_postings LIMIT 10
      `;
      console.log("Available sources:", sources);
    } else {
      console.log(JSON.stringify(jobs[0], null, 2));
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getExternalJobs();
