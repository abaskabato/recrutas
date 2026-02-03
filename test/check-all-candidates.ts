import 'dotenv/config';
import { db } from '../server/db';
import { candidateProfiles } from '../shared/schema';
import { sql, isNotNull, gt } from 'drizzle-orm';

async function check() {
  // Count candidates with and without skills
  const allCandidates = await db.select({
    id: candidateProfiles.id,
    userId: candidateProfiles.userId,
    email: candidateProfiles.email,
    skills: candidateProfiles.skills,
    resumeProcessingStatus: candidateProfiles.resumeProcessingStatus,
    resumeUrl: candidateProfiles.resumeUrl
  }).from(candidateProfiles);

  const withSkills = allCandidates.filter(c => c.skills && Array.isArray(c.skills) && c.skills.length > 0);
  const withResume = allCandidates.filter(c => c.resumeUrl);
  const processing = allCandidates.filter(c => c.resumeProcessingStatus === 'processing');
  const completed = allCandidates.filter(c => c.resumeProcessingStatus === 'completed');

  console.log('=== CANDIDATE STATS ===');
  console.log('Total candidates:', allCandidates.length);
  console.log('With skills:', withSkills.length);
  console.log('With resume URL:', withResume.length);
  console.log('Processing status = processing:', processing.length);
  console.log('Processing status = completed:', completed.length);

  console.log('\n=== CANDIDATES WITH SKILLS ===');
  for (const c of withSkills) {
    console.log(`ID: ${c.id}, UserID: ${c.userId}`);
    console.log(`  Email: ${c.email}`);
    console.log(`  Skills: ${JSON.stringify(c.skills)}`);
    console.log(`  Resume Status: ${c.resumeProcessingStatus}`);
    console.log('---');
  }

  console.log('\n=== CANDIDATES WITH RESUME BUT NO SKILLS ===');
  const resumeNoSkills = allCandidates.filter(c => c.resumeUrl && (!c.skills || c.skills.length === 0));
  for (const c of resumeNoSkills.slice(0, 5)) {
    console.log(`ID: ${c.id}, UserID: ${c.userId}`);
    console.log(`  Resume: ${c.resumeUrl}`);
    console.log(`  Skills: ${JSON.stringify(c.skills)}`);
    console.log(`  Status: ${c.resumeProcessingStatus}`);
    console.log('---');
  }

  process.exit(0);
}
check();
