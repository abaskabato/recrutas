import 'dotenv/config';
import { db } from '../server/db';
import { candidateProfiles } from '../shared/schema';
import { AIResumeParser } from '../server/ai-resume-parser';
import { eq } from 'drizzle-orm';

async function manualParse() {
  // Get a candidate with resume but no skills
  const candidates = await db.select().from(candidateProfiles).limit(10);
  const candidate = candidates.find(c => c.resumeUrl && (!c.skills || c.skills.length === 0));

  if (!candidate) {
    console.log('No candidate found with resume but no skills');
    process.exit(0);
  }

  console.log('=== MANUAL RESUME PARSING ===');
  console.log('Candidate ID:', candidate.id);
  console.log('User ID:', candidate.userId);
  console.log('Resume URL:', candidate.resumeUrl);
  console.log('Current skills:', candidate.skills);
  console.log('Current status:', candidate.resumeProcessingStatus);

  // Download the resume
  console.log('\n1. Downloading resume...');
  const response = await fetch(candidate.resumeUrl!);
  if (!response.ok) {
    console.error('Failed to download resume:', response.status);
    process.exit(1);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log('Downloaded:', buffer.length, 'bytes');

  // Determine content type from URL or response
  const contentType = response.headers.get('content-type') || 'application/pdf';
  console.log('Content-Type:', contentType);

  // Parse with AI
  console.log('\n2. Parsing with AI...');
  const parser = new AIResumeParser();
  const result = await parser.parseFile(buffer, contentType);

  console.log('\n=== PARSING RESULTS ===');
  console.log('Confidence:', result.confidence, '%');
  console.log('Text preview:', result.text?.substring(0, 200));
  console.log('Technical skills:', result.aiExtracted?.skills?.technical);
  console.log('Experience level:', result.aiExtracted?.experience?.level);
  console.log('Personal info:', result.aiExtracted?.personalInfo);

  // Update the candidate with extracted skills
  if (result.aiExtracted?.skills?.technical?.length > 0) {
    console.log('\n3. Updating candidate profile...');
    const skills = result.aiExtracted.skills.technical.slice(0, 25);

    await db.update(candidateProfiles)
      .set({
        skills: skills,
        resumeProcessingStatus: 'completed',
        experienceLevel: result.aiExtracted.experience?.level || 'mid',
        location: result.aiExtracted.personalInfo?.location,
        linkedinUrl: result.aiExtracted.personalInfo?.linkedin,
        githubUrl: result.aiExtracted.personalInfo?.github,
        parsedAt: new Date(),
      })
      .where(eq(candidateProfiles.id, candidate.id));

    console.log('Updated candidate with', skills.length, 'skills');
    console.log('Skills saved:', skills);
  } else {
    console.log('\nNo skills extracted - cannot update');
  }

  process.exit(0);
}

manualParse().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
