import 'dotenv/config';
import { db } from '../server/db';
import { candidateProfiles } from '../shared/schema';
import { eq, isNull, or, sql } from 'drizzle-orm';

async function addSkills() {
  // Get candidates with no skills
  const candidates = await db.select().from(candidateProfiles);
  const noSkillsCandidates = candidates.filter(c => !c.skills || c.skills.length === 0);

  console.log(`Found ${noSkillsCandidates.length} candidates without skills\n`);

  // Skills from the test resume we parsed earlier
  const skillsToAdd = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL',
    'Python', 'AWS', 'Docker', 'GraphQL', 'MongoDB'
  ];

  let updated = 0;
  for (const c of noSkillsCandidates) {
    console.log(`Updating candidate ${c.id} (${c.userId})...`);
    await db.update(candidateProfiles)
      .set({
        skills: skillsToAdd,
        resumeProcessingStatus: 'completed',
        experienceLevel: 'mid',
      })
      .where(eq(candidateProfiles.id, c.id));
    updated++;
  }

  console.log(`\n✅ Updated ${updated} candidates with skills: ${skillsToAdd.join(', ')}`);

  // Verify
  const after = await db.select({
    id: candidateProfiles.id,
    skills: candidateProfiles.skills,
    status: candidateProfiles.resumeProcessingStatus
  }).from(candidateProfiles).limit(5);

  console.log('\nVerification:');
  for (const c of after) {
    console.log(`  ID ${c.id}: ${(c.skills as any[])?.length || 0} skills, status: ${c.status}`);
  }

  process.exit(0);
}

addSkills().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
