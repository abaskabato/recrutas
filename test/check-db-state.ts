import 'dotenv/config';
import { db } from '../server/db';
import { candidateProfiles, jobPostings } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function check() {
  // Check candidates with skills
  const candidates = await db.select({
    id: candidateProfiles.id,
    email: candidateProfiles.email,
    skills: candidateProfiles.skills,
    resumeProcessingStatus: candidateProfiles.resumeProcessingStatus
  }).from(candidateProfiles).limit(5);

  console.log('=== CANDIDATES ===');
  for (const c of candidates) {
    console.log('ID:', c.id);
    console.log('Email:', c.email);
    console.log('Skills:', c.skills);
    console.log('Resume Status:', c.resumeProcessingStatus);
    console.log('---');
  }

  // Check job count
  const jobCount = await db.select({ count: sql<number>`count(*)` }).from(jobPostings);
  console.log('\n=== JOBS ===');
  console.log('Total jobs:', jobCount[0].count);

  // Check a few jobs with skills
  const jobs = await db.select({
    id: jobPostings.id,
    title: jobPostings.title,
    skills: jobPostings.skills,
    status: jobPostings.status
  }).from(jobPostings).limit(5);

  for (const j of jobs) {
    console.log('Job:', j.title);
    console.log('Skills:', j.skills);
    console.log('Status:', j.status);
    console.log('---');
  }

  process.exit(0);
}
check();
