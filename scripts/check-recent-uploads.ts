/**
 * Check recent uploads and matching status
 */
import { storage } from '../server/storage.js';
import { client } from '../server/db.js';

async function main() {
  console.log('=== Recent Resume Uploads (Last 20) ===\n');

  const allCandidates = await storage.getAllCandidateUsers();
  const withResume = allCandidates
    .filter((c: any) => c.resumeUrl)
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 20);

  withResume.forEach((c: any, i: number) => {
    console.log(`${i+1}. ${c.email || c.userId}`);
    console.log(`   Status: ${c.resumeProcessingStatus}`);
    console.log(`   Parsed: ${c.parsedAt ? new Date(c.parsedAt).toISOString().slice(0,10) : 'never'}`);
    console.log(`   Skills: ${c.skills?.slice(0,5).join(', ') || 'none'}`);
    console.log(`   Location: ${c.location || 'none'}`);
    console.log('');
  });

  // Check matching stats
  console.log('\n=== Matching Stats ===\n');

  const totalWithResume = allCandidates.filter((c: any) => c.resumeUrl).length;
  console.log(`Total candidates with resumes: ${totalWithResume}`);

  const completed = allCandidates.filter((c: any) => c.resumeProcessingStatus === 'completed').length;
  console.log(`Successfully parsed: ${completed}`);

  const failed = allCandidates.filter((c: any) => c.resumeProcessingStatus === 'failed').length;
  console.log(`Failed parses: ${failed}`);

  const pending = allCandidates.filter((c: any) => c.resumeProcessingStatus === 'pending').length;
  console.log(`Pending: ${pending}`);

  // Check match counts (just show skills count)
  console.log('\n=== Match Readiness ===\n');
  let withSkills = 0;
  let withoutSkills = 0;
  for (const c of withResume) {
    if (c.skills && c.skills.length > 0) withSkills++;
    else withoutSkills++;
  }
  console.log(`Candidates with skills (ready for matching): ${withSkills}`);
  console.log(`Candidates without skills: ${withoutSkills}`);

  client?.end();
}

main().catch(console.error);