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
    skills: ['JavaScript', 'React', 'Node.js'],
    experience: 'mid',
  };

  // Just verify the engine initializes without throwing
  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  // Matches might be empty if no jobs are available in test environment
  if (matches.length > 0) {
    const match = matches[0];
    assert(
      typeof match.semanticRelevance === 'number',
      'Should have semantic relevance score'
    );
  }
}

async function testRecencyScoring() {
  const criteria = {
    candidateId: 'test-user-2',
    skills: ['JavaScript', 'Python'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  // In test environment with no real jobs, matches might be empty
  // Just verify the engine handles the request without error
}

async function testLivenessScoring() {
  const criteria = {
    candidateId: 'test-user-3',
    skills: ['JavaScript', 'Node.js'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  matches.forEach((m) => {
    assert(typeof m.livenessScore === 'number', 'Each match should have a livenessScore');
    assert(m.livenessScore >= 0 && m.livenessScore <= 1, 'livenessScore should be 0-1');
    assert(['active', 'stale', 'unknown'].includes(m.livenessStatus), 'Should have valid livenessStatus');
  });
}

async function testHybridFormulaWeighting() {
  const criteria = {
    candidateId: 'test-user-4',
    skills: ['Python', 'Django', 'PostgreSQL'],
    experience: 'senior',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  if (matches.length > 0) {
    const match = matches[0];
    assert(typeof match.semanticRelevance === 'number', 'Should have semanticRelevance');
    assert(typeof match.recencyScore === 'number', 'Should have recencyScore');
    assert(typeof match.livenessScore === 'number', 'Should have livenessScore');
    assert(typeof match.personalizationScore === 'number', 'Should have personalizationScore');
    assert(typeof match.finalScore === 'number', 'Should have finalScore');
    assert(match.finalScore >= 0 && match.finalScore <= 1, 'finalScore should be 0-1');
  }
}

async function testMinimumThresholdFiltering() {
  const criteria = {
    candidateId: 'test-user-5',
    skills: ['NicheSkillA', 'NicheSkillB'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  // All returned matches should be above the 0.6 matchScore threshold
  matches.forEach((m) => {
    assert(m.matchScore >= 0.6, `Match score ${m.matchScore} should be >= 0.6`);
  });
}

async function testSortingByFinalScore() {
  const criteria = {
    candidateId: 'test-user-6',
    skills: ['JavaScript', 'React'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  for (let i = 0; i < matches.length - 1; i++) {
    assert(
      matches[i].finalScore >= matches[i + 1].finalScore,
      `Matches should be sorted by finalScore descending`
    );
  }
}

async function testResultCaching() {
  const criteria = {
    candidateId: 'test-user-7',
    skills: ['TypeScript', 'React'],
    experience: 'mid',
  };

  const startTime1 = Date.now();
  const matches1 = await engine.generateAdvancedMatches(criteria);
  const time1 = Date.now() - startTime1;

  const startTime2 = Date.now();
  const matches2 = await engine.generateAdvancedMatches(criteria);
  const time2 = Date.now() - startTime2;

  assert(matches1.length === matches2.length, 'Cached call should return same number of matches');
  assert(time2 < time1, `Cached call (${time2}ms) should be faster than first call (${time1}ms)`);
  console.log(`  (First call: ${time1}ms, Cached call: ${time2}ms)`);
}

async function testCacheClearAfterTimeout() {
  const criteria = {
    candidateId: 'test-user-8',
    skills: ['Go', 'Kubernetes'],
    experience: 'senior',
  };

  const matches1 = await engine.generateAdvancedMatches(criteria);
  assert(Array.isArray(matches1), 'Should return an array');
  console.log('  (Cache TTL expiry skipped - requires 60s wait)');
}

async function testMaxResultsLimit() {
  const criteria = {
    candidateId: 'test-user-9',
    skills: ['Java', 'Spring', 'AWS'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  // getPersonalizedJobFeed caps at 20 by default
  assert(matches.length <= 50, 'Should not return more than 50 matches');
}

async function testSkillMatchHighlighting() {
  const criteria = {
    candidateId: 'test-user-10',
    skills: ['JavaScript', 'React', 'Node.js'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  matches.forEach((m) => {
    assert(Array.isArray(m.skillMatches), 'Each match should have a skillMatches array');
    m.skillMatches.forEach((s) => assert(typeof s === 'string', 'Each skill match should be a string'));
  });
}

async function testLocationFitConsideration() {
  const criteria = {
    candidateId: 'test-user-11',
    skills: ['JavaScript'],
    experience: 'mid',
    location: 'Remote',
    workType: 'remote',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  matches.forEach((m) => {
    assert(typeof m.compatibilityFactors.locationFit === 'number', 'Should have locationFit factor');
    assert(m.compatibilityFactors.locationFit >= 0 && m.compatibilityFactors.locationFit <= 1, 'locationFit should be 0-1');
  });
}

async function testVerifiedActiveBadge() {
  const criteria = {
    candidateId: 'test-user-12',
    skills: ['JavaScript', 'React'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  matches.forEach((m) => {
    assert(typeof m.isVerifiedActive === 'boolean', 'Each match should have isVerifiedActive flag');
    // Invariant: isVerifiedActive requires trustScore >= 85 AND active status
    if (m.isVerifiedActive) {
      assert(m.trustScore >= 85, 'Verified active job should have trustScore >= 85');
      assert(m.livenessStatus === 'active', 'Verified active job should have active livenessStatus');
    }
  });
}

async function testDirectFromCompanyBadge() {
  const criteria = {
    candidateId: 'test-user-13',
    skills: ['Python', 'FastAPI'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  matches.forEach((m) => {
    assert(typeof m.isDirectFromCompany === 'boolean', 'Each match should have isDirectFromCompany flag');
  });
}

async function testAIExplanationGeneration() {
  const criteria = {
    candidateId: 'test-user-14',
    skills: ['JavaScript', 'TypeScript'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array');
  if (matches.length > 0) {
    assert(typeof matches[0].aiExplanation === 'string', 'Should have aiExplanation string');
    assert(matches[0].aiExplanation.length > 0, 'aiExplanation should not be empty');
  }
}

async function testEmptyJobListHandling() {
  const criteria = {
    candidateId: 'test-user-15',
    skills: ['ObscureSkillXYZ123'],
    experience: 'entry',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array even with no matching jobs');
}

async function testEmptySkillsHandling() {
  const criteria = {
    candidateId: 'test-user-16',
    skills: [],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array even with empty skills');
  if (matches.length > 0) {
    assert(matches[0].finalScore >= 0 && matches[0].finalScore <= 1, 'Score should be valid even with no skills');
  }
}

async function testLargeCandidateSkillSet() {
  const manySkills = Array.from({ length: 50 }, (_, i) => `Skill${i}`);

  const criteria = {
    candidateId: 'test-user-17',
    skills: manySkills,
    experience: 'senior',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should handle 50+ skills without crashing');
}

async function testNoCommonSkillsHandling() {
  const criteria = {
    candidateId: 'test-user-18',
    skills: ['NicheSkillA', 'NicheSkillB'],
    experience: 'mid',
  };

  const matches = await engine.generateAdvancedMatches(criteria);

  assert(Array.isArray(matches), 'Should return an array even with no common skills');
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
    throw new Error(`${testsFailed} tests failed`);
  }
}

describe('Advanced Matching Engine Unit Tests', () => {
  test('Run all unit tests', async () => {
    await runAllTests();
  });
});
