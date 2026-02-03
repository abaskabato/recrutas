/**
 * Quick Integration Test - Resume Upload → Extraction → Matching → Feed
 *
 * Tests the complete flow without requiring external services.
 * Run with: node test/quick-integration-test.js
 */

import { AIResumeParser } from '../server/ai-resume-parser.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Sample job postings for testing matching
const sampleJobs = [
  {
    id: 1,
    title: 'Senior React Developer',
    company: 'TechCorp',
    description: 'Looking for an experienced React developer...',
    skills: ['React', 'JavaScript', 'TypeScript', 'Node.js'],
    location: 'Remote',
    workType: 'remote',
    salaryMin: 120000,
    salaryMax: 180000,
    status: 'active',
    trustScore: 90,
    livenessStatus: 'active'
  },
  {
    id: 2,
    title: 'Full Stack Engineer',
    company: 'StartupXYZ',
    description: 'Full stack role with React and Node.js...',
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
    location: 'Austin, TX',
    workType: 'hybrid',
    salaryMin: 100000,
    salaryMax: 150000,
    status: 'active',
    trustScore: 85,
    livenessStatus: 'active'
  },
  {
    id: 3,
    title: 'Python Backend Developer',
    company: 'DataCo',
    description: 'Backend development with Python and Django...',
    skills: ['Python', 'Django', 'PostgreSQL', 'Redis'],
    location: 'San Francisco',
    workType: 'onsite',
    salaryMin: 130000,
    salaryMax: 170000,
    status: 'active',
    trustScore: 95,
    livenessStatus: 'active'
  },
  {
    id: 4,
    title: 'DevOps Engineer',
    company: 'CloudInc',
    description: 'Kubernetes and AWS infrastructure...',
    skills: ['Kubernetes', 'AWS', 'Docker', 'Terraform'],
    location: 'Remote',
    workType: 'remote',
    salaryMin: 140000,
    salaryMax: 190000,
    status: 'active',
    trustScore: 80,
    livenessStatus: 'active'
  }
];

/**
 * Calculate match score between candidate skills and job skills
 */
function calculateMatchScore(candidateSkills, job) {
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());
  const jobSkillsLower = job.skills.map(s => s.toLowerCase());

  const matchingSkills = candidateSkillsLower.filter(skill =>
    jobSkillsLower.some(jobSkill =>
      skill.includes(jobSkill) || jobSkill.includes(skill)
    )
  );

  const matchScore = matchingSkills.length > 0
    ? Math.round((matchingSkills.length / Math.max(candidateSkillsLower.length, 1)) * 100)
    : 0;

  return {
    matchScore,
    matchingSkills: candidateSkills.filter(s =>
      matchingSkills.includes(s.toLowerCase())
    ),
    aiExplanation: matchingSkills.length > 0
      ? `${matchingSkills.length} skill matches: ${matchingSkills.slice(0, 3).join(', ')}`
      : 'No direct skill matches'
  };
}

/**
 * Generate job feed from matches
 */
function generateJobFeed(candidateSkills, jobs) {
  return jobs
    .map(job => {
      const matchResult = calculateMatchScore(candidateSkills, job);
      return {
        id: job.id,
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          workType: job.workType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          skills: job.skills,
          aiCurated: true,
          confidenceScore: matchResult.matchScore / 100,
          trustScore: job.trustScore,
          livenessStatus: job.livenessStatus
        },
        matchScore: `${matchResult.matchScore}%`,
        confidenceLevel: matchResult.matchScore / 100,
        skillMatches: matchResult.matchingSkills,
        aiExplanation: matchResult.aiExplanation,
        status: 'pending',
        createdAt: new Date().toISOString(),
        isVerifiedActive: job.livenessStatus === 'active' && job.trustScore >= 90,
        isDirectFromCompany: job.trustScore >= 85
      };
    })
    .filter(match => match.confidenceLevel > 0)
    .sort((a, b) => b.confidenceLevel - a.confidenceLevel);
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('QUICK INTEGRATION TEST - Resume to Job Feed');
  console.log('='.repeat(60));
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Resume Text Extraction
  console.log('TEST 1: Resume Text Extraction');
  console.log('-'.repeat(40));

  try {
    const resumeText = readFileSync(join(__dirname, '..', 'test-resume-simple.txt'), 'utf8');
    console.log(`✓ Read resume file (${resumeText.length} chars)`);

    const parser = new AIResumeParser();
    console.log('  Parsing resume with AI...');

    const parsed = await parser.parseText(resumeText);

    console.log(`✓ Resume parsed successfully!`);
    console.log(`  - Confidence: ${parsed.confidence}%`);
    console.log(`  - Processing time: ${parsed.processingTime}ms`);
    console.log(`  - Name: ${parsed.aiExtracted.personalInfo.name || 'Not found'}`);
    console.log(`  - Email: ${parsed.aiExtracted.personalInfo.email || 'Not found'}`);
    console.log(`  - Location: ${parsed.aiExtracted.personalInfo.location || 'Not found'}`);
    console.log(`  - Technical Skills: ${parsed.aiExtracted.skills.technical.slice(0, 5).join(', ')}${parsed.aiExtracted.skills.technical.length > 5 ? '...' : ''}`);
    console.log(`  - Total skills: ${parsed.aiExtracted.skills.technical.length}`);
    console.log(`  - Experience level: ${parsed.aiExtracted.experience.level}`);
    console.log(`  - Total years: ${parsed.aiExtracted.experience.totalYears}`);
    console.log(`  - Work history: ${parsed.aiExtracted.experience.positions.length} positions`);
    console.log(`  - Education: ${parsed.aiExtracted.education.length} entries`);
    console.log(`  - Certifications: ${parsed.aiExtracted.certifications.length}`);

    results.tests.push({ name: 'Resume Text Extraction', passed: true });
    results.passed++;

    // Test 2: Job Matching
    console.log('');
    console.log('TEST 2: Job Matching Algorithm');
    console.log('-'.repeat(40));

    const candidateSkills = parsed.aiExtracted.skills.technical;
    console.log(`  Candidate has ${candidateSkills.length} skills`);
    console.log(`  Testing against ${sampleJobs.length} jobs...`);

    const jobFeed = generateJobFeed(candidateSkills, sampleJobs);

    console.log(`✓ Generated ${jobFeed.length} job matches`);

    if (jobFeed.length === 0) {
      console.log('  WARNING: No matches found - check skill matching logic');
      results.tests.push({ name: 'Job Matching', passed: false, error: 'No matches' });
      results.failed++;
    } else {
      results.tests.push({ name: 'Job Matching', passed: true });
      results.passed++;
    }

    // Test 3: Job Feed Display
    console.log('');
    console.log('TEST 3: Job Feed Display');
    console.log('-'.repeat(40));

    if (jobFeed.length > 0) {
      console.log('✓ Job Feed Contents:');
      console.log('');

      jobFeed.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.job.title} at ${match.job.company}`);
        console.log(`     Match Score: ${match.matchScore}`);
        console.log(`     Skills: ${match.skillMatches.join(', ') || 'None'}`);
        console.log(`     Location: ${match.job.location} (${match.job.workType})`);
        console.log(`     Salary: $${match.job.salaryMin?.toLocaleString()} - $${match.job.salaryMax?.toLocaleString()}`);
        console.log(`     AI Explanation: ${match.aiExplanation}`);
        console.log(`     Verified Active: ${match.isVerifiedActive ? 'Yes' : 'No'}`);
        console.log(`     Direct from Company: ${match.isDirectFromCompany ? 'Yes' : 'No'}`);
        console.log('');
      });

      results.tests.push({ name: 'Job Feed Display', passed: true });
      results.passed++;
    } else {
      console.log('  No jobs to display');
      results.tests.push({ name: 'Job Feed Display', passed: false, error: 'Empty feed' });
      results.failed++;
    }

    // Test 4: Match Quality
    console.log('TEST 4: Match Quality Validation');
    console.log('-'.repeat(40));

    const topMatch = jobFeed[0];
    if (topMatch) {
      const hasRequiredFields =
        topMatch.job.id &&
        topMatch.job.title &&
        topMatch.job.company &&
        topMatch.matchScore &&
        topMatch.aiExplanation !== undefined;

      if (hasRequiredFields) {
        console.log('✓ Match has all required fields');
        console.log(`  - Job ID: ${topMatch.job.id}`);
        console.log(`  - Match Score: ${topMatch.matchScore}`);
        console.log(`  - Confidence: ${topMatch.confidenceLevel}`);
        console.log(`  - Has AI explanation: ${topMatch.aiExplanation ? 'Yes' : 'No'}`);
        console.log(`  - Has skill matches: ${topMatch.skillMatches?.length > 0 ? 'Yes' : 'No'}`);
        results.tests.push({ name: 'Match Quality Validation', passed: true });
        results.passed++;
      } else {
        console.log('✗ Match missing required fields');
        results.tests.push({ name: 'Match Quality Validation', passed: false, error: 'Missing fields' });
        results.failed++;
      }
    }

  } catch (error) {
    console.error(`✗ Test failed: ${error.message}`);
    console.error(error.stack);
    results.tests.push({ name: 'Resume Processing', passed: false, error: error.message });
    results.failed++;
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.passed + results.failed} tests`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('');

  results.tests.forEach(test => {
    const status = test.passed ? '✓' : '✗';
    const error = test.error ? ` (${test.error})` : '';
    console.log(`  ${status} ${test.name}${error}`);
  });

  console.log('');

  if (results.failed > 0) {
    console.log('Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('All tests passed! ✓');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
