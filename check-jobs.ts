import { db } from './server/db';
import { jobPostings, candidateProfiles } from './shared/schema';
import { sql, desc, like, or } from 'drizzle-orm';

async function main() {
  // Check what skills the jobs have
  const jobsWithSkills = await db
    .select({
      skills: jobPostings.skills,
      title: jobPostings.title,
      company: jobPostings.company
    })
    .from(jobPostings)
    .limit(50);
  
  console.log('=== SAMPLE JOB SKILLS ===');
  for (const job of jobsWithSkills.slice(0, 10)) {
    console.log(`\n${job.title} at ${job.company}:`);
    console.log(`  Skills: ${JSON.stringify(job.skills?.slice(0, 10) || [])}`);
  }
  
  // Check unique skill values
  const allSkills = new Set<string>();
  for (const job of jobsWithSkills) {
    if (job.skills && Array.isArray(job.skills)) {
      job.skills.forEach((s: string) => allSkills.add(s.toLowerCase()));
    }
  }
  
  console.log('\n=== TOP SKILLS IN JOBS ===');
  const skillCounts: Record<string, number> = {};
  for (const job of jobsWithSkills) {
    if (job.skills && Array.isArray(job.skills)) {
      job.skills.forEach((s: string) => {
        const lower = s.toLowerCase();
        skillCounts[lower] = (skillCounts[lower] || 0) + 1;
      });
    }
  }
  
  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  
  for (const [skill, count] of topSkills) {
    console.log(`${skill}: ${count}`);
  }
  
  // Check if there are any candidate profiles
  console.log('\n=== CHECKING CANDIDATES ===');
  const candidates = await db
    .select({
      userId: candidateProfiles.userId,
      skills: candidateProfiles.skills
    })
    .from(candidateProfiles)
    .limit(5);
  
  console.log(`Found ${candidates.length} candidate profiles in DB`);
  for (const c of candidates) {
    console.log(`Candidate ${c.userId}: ${JSON.stringify(c.skills?.slice(0, 10) || [])}`);
  }
}

main();
