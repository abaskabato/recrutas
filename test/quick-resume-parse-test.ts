/**
 * Quick test to parse the sample resume file
 */
import 'dotenv/config';
import * as fs from 'fs';
import { AIResumeParser } from '../server/ai-resume-parser';

async function main() {
  console.log('🧪 Testing Resume Parser with test-resume-simple.txt\n');

  const parser = new AIResumeParser();
  const resumeText = fs.readFileSync('./test-resume-simple.txt', 'utf-8');

  console.log('📄 Resume content preview (first 200 chars):');
  console.log(resumeText.substring(0, 200) + '...\n');

  console.log('⏳ Parsing resume...\n');
  const startTime = Date.now();

  try {
    const result = await parser.parseText(resumeText);
    const elapsed = Date.now() - startTime;

    console.log('✅ Parsing complete!\n');
    console.log('='.repeat(60));
    console.log('PARSING RESULTS');
    console.log('='.repeat(60));

    console.log('\n📊 Confidence Score:', result.confidence, '%');
    console.log('⏱️  Processing Time:', elapsed, 'ms');

    console.log('\n👤 Personal Info:');
    const info = result.aiExtracted.personalInfo;
    console.log('   Name:', info.name || 'N/A');
    console.log('   Email:', info.email || 'N/A');
    console.log('   Phone:', info.phone || 'N/A');
    console.log('   Location:', info.location || 'N/A');
    console.log('   LinkedIn:', info.linkedin || 'N/A');
    console.log('   GitHub:', info.github || 'N/A');

    console.log('\n📝 Summary:');
    console.log('  ', result.aiExtracted.summary || 'N/A');

    console.log('\n🛠️  Skills:');
    console.log('   Technical:', result.aiExtracted.skills.technical.join(', ') || 'None');
    console.log('   Soft:', result.aiExtracted.skills.soft.join(', ') || 'None');
    console.log('   Tools:', result.aiExtracted.skills.tools.join(', ') || 'None');

    console.log('\n💼 Experience:');
    console.log('   Total Years:', result.aiExtracted.experience.totalYears);
    console.log('   Level:', result.aiExtracted.experience.level);
    console.log('   Positions:');
    for (const pos of result.aiExtracted.experience.positions) {
      console.log(`     - ${pos.title} at ${pos.company} (${pos.duration})`);
    }

    console.log('\n🎓 Education:');
    for (const edu of result.aiExtracted.education) {
      console.log(`   - ${edu.degree} from ${edu.institution}${edu.year ? ` (${edu.year})` : ''}`);
    }

    console.log('\n📜 Certifications:', result.aiExtracted.certifications.join(', ') || 'None');

    console.log('\n📂 Projects:');
    for (const proj of result.aiExtracted.projects) {
      console.log(`   - ${proj.name}: ${proj.description}`);
    }

    console.log('\n🌍 Languages:', result.aiExtracted.languages.join(', ') || 'None');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Resume parsing test complete!');

  } catch (error) {
    console.error('❌ Parsing failed:', error);
    process.exit(1);
  }
}

main();
