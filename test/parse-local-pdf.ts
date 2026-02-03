import 'dotenv/config';
import * as fs from 'fs';
import { AIResumeParser } from '../server/ai-resume-parser';

async function main() {
  console.log('Testing with Resume-Sample-1-Software-Engineer.pdf\n');

  const buffer = fs.readFileSync('./Resume-Sample-1-Software-Engineer.pdf');
  console.log('File size:', buffer.length, 'bytes');

  const parser = new AIResumeParser();
  const result = await parser.parseFile(buffer, 'application/pdf');

  console.log('\n=== RESULTS ===');
  console.log('Confidence:', result.confidence, '%');
  console.log('Text preview:', result.text?.substring(0, 300));
  console.log('\nSkills:', result.aiExtracted?.skills?.technical);
  console.log('\nExperience level:', result.aiExtracted?.experience?.level);
  console.log('Total years:', result.aiExtracted?.experience?.totalYears);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
