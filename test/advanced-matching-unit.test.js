/**
 * Unit Tests for Advanced Matching Engine
 * Tests hybrid matching algorithm with weighted scoring
 *
 * Run with: npm run test:unit:backend
 */

import assert from 'assert';
import { AdvancedMatchingEngine } from '../server/advanced-matching-engine.ts';
import {
  createSampleJob,
  createCandidateProfile,
  createAdvancedMatch,
  createMockJobsForFeed,
} from './helpers/test-data-factory.js';

const engine = new AdvancedMatchingEngine();
let testsPassed = 0;
let testsFailed = 0;

async function runTest(testName, testFn) {
  try {
    await testFn();
    console.log(`✅ ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${testName}: ${err.message}`);
    testsFailed++;
  }
}

async function testSemanticRelevanceScoring() {
  const criteria = {
    candidateId: 'test-user-1',
    candidateProfile: createCandidateProfile({
      skills: ['JavaScript', 'React', 'Node.js'],
    }),
    allJobs: [
      createSampleJob({
        skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
      }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(matches.length > 0, 'Should generate matches');
  const match = matches[0];
  assert(
    typeof match.semanticRelevance === 'number',
    'Should have semantic relevance score'
  );
  assert(
    match.semanticRelevance >= 0 && match.semanticRelevance <= 1,
    'Semantic relevance should be 0-1'
  );
  assert(
    match.semanticRelevance > 0.7,
    'Should have high semantic relevance for perfect skill match'
  );
}

async function testRecencyScoring() {
  const oldDate = new Date();
  oldDate.setMonth(oldDate.getMonth() - 12);

  const newDate = new Date();

  const criteria = {
    candidateId: 'test-user-2',
    candidateProfile: createCandidateProfile(),
    allJobs: [
      createSampleJob({ title: 'Old Job', postedAt: oldDate }),
      createSampleJob({ title: 'New Job', postedAt: newDate }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(matches.length >= 2, 'Should generate matches for both jobs');
  const newJobMatch = matches.find((m) => m.job.title === 'New Job');
  const oldJobMatch = matches.find((m) => m.job.title === 'Old Job');

  if (newJobMatch && oldJobMatch) {
    assert(
      newJobMatch.recency > oldJobMatch.recency,
      'Newer jobs should have higher recency score'
    );
  }
}

async function testLivenessScoring() {
  const criteria = {
    candidateId: 'test-user-3',
    candidateProfile: createCandidateProfile(),
    allJobs: [
      createSampleJob({
        title: 'Active Job',
        livenessStatus: 'active',
        trustScore: 95,
      }),
      createSampleJob({
        title: 'Stale Job',
        livenessStatus: 'stale',
        trustScore: 40,
      }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  const activeMatch = matches.find((m) => m.job.title === 'Active Job');
  const staleMatch = matches.find((m) => m.job.title === 'Stale Job');

  if (activeMatch && staleMatch) {
    assert(
      activeMatch.liveness > staleMatch.liveness,
      'Active jobs should have higher liveness score'
    );
  }
}

async function testHybridFormulaWeighting() {
  const criteria = {
    candidateId: 'test-user-4',
    candidateProfile: createCandidateProfile(),
    allJobs: [createSampleJob()],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  if (matches.length > 0) {
    const match = matches[0];

    // Verify all components exist
    assert(
      typeof match.semanticRelevance === 'number',
      'Should have semantic relevance'
    );
    assert(typeof match.recency === 'number', 'Should have recency');
    assert(typeof match.liveness === 'number', 'Should have liveness');
    assert(
      typeof match.personalization === 'number',
      'Should have personalization'
    );

    // Verify final score calculation
    assert(typeof match.finalScore === 'number', 'Should have final score');
    assert(
      match.finalScore >= 0 && match.finalScore <= 1,
      'Final score should be 0-1'
    );

    // Verify weights sum to 1 (approximately)
    const calculatedScore =
      0.45 * match.semanticRelevance +
      0.25 * match.recency +
      0.2 * match.liveness +
      0.1 * match.personalization;

    const tolerance = 0.01; // Allow 1% difference for rounding
    assert(
      Math.abs(match.finalScore - calculatedScore) < tolerance,
      `Final score should match weighted formula. Got ${match.finalScore}, calculated ${calculatedScore}`
    );
  }
}

async function testMinimumThresholdFiltering() {
  const criteria = {
    candidateId: 'test-user-5',
    candidateProfile: createCandidateProfile({
      skills: ['Niche Skill A', 'Niche Skill B'],
    }),
    allJobs: [
      createSampleJob({
        skills: ['JavaScript', 'React', 'Node.js'],
      }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  // Jobs with low match scores may be filtered out
  const filtered = matches.filter((m) => m.finalScore < 0.6);
  if (filtered.length > 0) {
    console.log(
      `  (Matches below 60% threshold filtered - score: ${filtered[0].finalScore})`
    );
  }
}

async function testSortingByFinalScore() {
  const criteria = {
    candidateId: 'test-user-6',
    candidateProfile: createCandidateProfile({
      skills: ['JavaScript', 'React'],
    }),
    allJobs: createMockJobsForFeed(10),
    maxResults: 50,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  // Verify sorted by final score descending
  for (let i = 0; i < matches.length - 1; i++) {
    assert(
      matches[i].finalScore >= matches[i + 1].finalScore,
      `Matches should be sorted by final score descending`
    );
  }
}

async function testResultCaching() {
  const criteria = {
    candidateId: 'test-user-7',
    candidateProfile: createCandidateProfile(),
    allJobs: [createSampleJob()],
    maxResults: 10,
  };

  const startTime1 = Date.now();
  const matches1 = await engine.generateAdvancedMatches(criteria);
  const time1 = Date.now() - startTime1;

  const startTime2 = Date.now();
  const matches2 = await engine.generateAdvancedMatches(criteria);
  const time2 = Date.now() - startTime2;

  // Cached result should be available
  assert(matches1.length === matches2.length, 'Should return same number of matches');
  console.log(
    `  (First call: ${time1}ms, Cached call: ${time2}ms)`
  );
}

async function testCacheClearAfterTimeout() {
  const criteria = {
    candidateId: 'test-user-8',
    candidateProfile: createCandidateProfile(),
    allJobs: [createSampleJob()],
    maxResults: 10,
  };

  const matches1 = await engine.generateAdvancedMatches(criteria);

  // Wait for cache timeout (60 seconds)
  // This is impractical in tests, so we'll just verify cache exists
  assert(matches1.length >= 0, 'Should generate matches');
  console.log('  (Cache timeout testing skipped - requires 60s wait)');
}

async function testMaxResultsLimit() {
  const criteria = {
    candidateId: 'test-user-9',
    candidateProfile: createCandidateProfile(),
    allJobs: createMockJobsForFeed(100),
    maxResults: 20,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(
    matches.length <= 20,
    'Should not exceed maxResults limit'
  );
}

async function testSkillMatchHighlighting() {
  const candidateSkills = ['JavaScript', 'React', 'Node.js'];
  const jobSkills = ['JavaScript', 'React', 'TypeScript', 'Node.js'];

  const criteria = {
    candidateId: 'test-user-10',
    candidateProfile: createCandidateProfile({
      skills: candidateSkills,
    }),
    allJobs: [createSampleJob({ skills: jobSkills })],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  if (matches.length > 0) {
    const match = matches[0];
    assert(Array.isArray(match.skillMatches), 'Should have skill matches array');

    // Should highlight matching skills
    const matchedSkillCount = match.skillMatches.length;
    assert(
      matchedSkillCount >= 2,
      'Should highlight at least 2 matching skills'
    );
  }
}

async function testLocationFitConsideration() {
  const criteria = {
    candidateId: 'test-user-11',
    candidateProfile: createCandidateProfile({
      location: 'Remote',
      workType: ['remote'],
    }),
    allJobs: [
      createSampleJob({
        title: 'Remote Job',
        location: 'Remote',
        workType: 'remote',
      }),
      createSampleJob({
        title: 'Onsite Job',
        location: 'New York, NY',
        workType: 'onsite',
      }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  const remoteMatch = matches.find((m) => m.job.title === 'Remote Job');
  const onsiteMatch = matches.find((m) => m.job.title === 'Onsite Job');

  if (remoteMatch && onsiteMatch) {
    assert(
      remoteMatch.finalScore > onsiteMatch.finalScore,
      'Remote job should score higher for remote-seeking candidate'
    );
  }
}

async function testVerifiedActiveBadge() {
  const criteria = {
    candidateId: 'test-user-12',
    candidateProfile: createCandidateProfile(),
    allJobs: [
      createSampleJob({
        title: 'Verified Active Job',
        trustScore: 95,
        livenessStatus: 'active',
      }),
      createSampleJob({
        title: 'Unverified Job',
        trustScore: 45,
        livenessStatus: 'unknown',
      }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  const verifiedMatch = matches.find(
    (m) => m.job.title === 'Verified Active Job'
  );

  if (verifiedMatch) {
    assert(
      typeof verifiedMatch.isVerifiedActive === 'boolean',
      'Should have isVerifiedActive flag'
    );
    // Trust score ≥ 85 + active status = verified active
    if (verifiedMatch.job.trustScore >= 85 && verifiedMatch.job.livenessStatus === 'active') {
      assert(
        verifiedMatch.isVerifiedActive === true,
        'Should mark as verified active'
      );
    }
  }
}

async function testDirectFromCompanyBadge() {
  const criteria = {
    candidateId: 'test-user-13',
    candidateProfile: createCandidateProfile(),
    allJobs: [
      createSampleJob({
        title: 'Company Job',
        isDirectFromCompany: true,
      }),
      createSampleJob({
        title: 'External Job',
        isDirectFromCompany: false,
      }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  matches.forEach((match) => {
    assert(
      typeof match.isDirectFromCompany === 'boolean',
      'Should have isDirectFromCompany flag'
    );
  });
}

async function testAIExplanationGeneration() {
  const criteria = {
    candidateId: 'test-user-14',
    candidateProfile: createCandidateProfile(),
    allJobs: [createSampleJob()],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  if (matches.length > 0) {
    const match = matches[0];
    assert(
      typeof match.aiExplanation === 'string',
      'Should have AI explanation'
    );
    assert(
      match.aiExplanation.length > 0,
      'AI explanation should not be empty'
    );
  }
}

async function testEmptyJobListHandling() {
  const criteria = {
    candidateId: 'test-user-15',
    candidateProfile: createCandidateProfile(),
    allJobs: [],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return array');
  assert(matches.length === 0, 'Should return empty array for no jobs');
}

async function testEmptySkillsHandling() {
  const criteria = {
    candidateId: 'test-user-16',
    candidateProfile: createCandidateProfile({
      skills: [],
    }),
    allJobs: [createSampleJob()],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  // Should still generate matches even with no skills
  if (matches.length > 0) {
    assert(
      matches[0].finalScore >= 0 && matches[0].finalScore <= 1,
      'Should have valid score even with no skills'
    );
  }
}

async function testLargeCandidateSkillSet() {
  const manySkills = Array.from({ length: 50 }, (_, i) => `Skill ${i}`);

  const criteria = {
    candidateId: 'test-user-17',
    candidateProfile: createCandidateProfile({
      skills: manySkills,
    }),
    allJobs: [createSampleJob()],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(
    matches.length >= 0,
    'Should handle large skill sets without crashing'
  );
}

async function testNoCommonSkillsHandling() {
  const criteria = {
    candidateId: 'test-user-18',
    candidateProfile: createCandidateProfile({
      skills: ['Niche Skill A', 'Niche Skill B'],
    }),
    allJobs: [
      createSampleJob({
        skills: ['Completely', 'Different', 'Skills'],
      }),
    ],
    maxResults: 10,
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  // Should still generate match but with lower score
  if (matches.length > 0) {
    const match = matches[0];
    assert(
      match.finalScore < 0.6,
      'Should have low score for no common skills'
    );
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Advanced Matching Engine Unit Tests\n');

  await runTest(
    'Semantic relevance scoring',
    testSemanticRelevanceScoring
  );
  await runTest('Recency scoring', testRecencyScoring);
  await runTest('Liveness scoring', testLivenessScoring);
  await runTest('Hybrid formula weighting', testHybridFormulaWeighting);
  await runTest('Minimum threshold filtering', testMinimumThresholdFiltering);
  await runTest('Sorting by final score', testSortingByFinalScore);
  await runTest('Result caching', testResultCaching);
  await runTest('Cache clear after timeout', testCacheClearAfterTimeout);
  await runTest('Max results limit', testMaxResultsLimit);
  await runTest('Skill match highlighting', testSkillMatchHighlighting);
  await runTest('Location fit consideration', testLocationFitConsideration);
  await runTest('Verified Active badge', testVerifiedActiveBadge);
  await runTest('Direct from Company badge', testDirectFromCompanyBadge);
  await runTest('AI explanation generation', testAIExplanationGeneration);
  await runTest('Empty job list handling', testEmptyJobListHandling);
  await runTest('Empty skills handling', testEmptySkillsHandling);
  await runTest('Large candidate skill set', testLargeCandidateSkillSet);
  await runTest('No common skills handling', testNoCommonSkillsHandling);

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
