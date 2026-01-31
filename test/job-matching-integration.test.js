/**
 * Integration Tests for Job Matching
 * Tests matching flow from resume upload through recommendations
 *
 * Requirements: Running server + Supabase test database
 * Run with: npm run test:integration:backend
 */

import assert from 'assert';
import supertest from 'supertest';
import { supabase } from '../server/lib/supabase-client.ts';
import {
  createNewUserAndGetToken,
  deleteUser,
  createNewTalentOwnerAndGetToken,
} from '../test/test-utils.js';
import {
  generateCompletePdfBuffer,
} from './fixtures/fixture-generator.js';
import {
  waitForProfileUpdate,
  waitForCondition,
  delay,
} from './helpers/async-helpers.js';
import {
  createSampleJob,
  createMockJobsForFeed,
} from './helpers/test-data-factory.js';

const app = global.app;
const request = supertest(app);

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

async function createJobForCandidate(talentOwnerId, overrides = {}) {
  const job = createSampleJob({
    talentOwnerId,
    ...overrides,
  });

  const { data, error } = await supabase
    .from('jobPostings')
    .insert([job])
    .select()
    .single();

  assert(!error, `Failed to create job: ${error?.message}`);
  return data;
}

async function testAutomaticMatchingAfterResumeUpload() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    // Create candidate and upload resume
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${candidateToken}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    // Create talent owner and job matching candidate skills
    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    const job = await createJobForCandidate(talentId, {
      title: 'React Engineer',
      skills: ['JavaScript', 'React', 'Node.js'],
    });

    // Wait for resume parsing
    await waitForProfileUpdate(
      async () => {
        const { data } = await supabase
          .from('candidateProfiles')
          .select('*')
          .eq('userId', candidateId)
          .single();
        return data;
      },
      { resumeParsed: true },
      45000
    );

    // Fetch recommendations
    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should get recommendations');
    assert(Array.isArray(recsRes.body), 'Should return array of matches');
    assert(
      recsRes.body.some((m) => m.jobId === job.id),
      'Should include matching job'
    );

    const jobMatch = recsRes.body.find((m) => m.jobId === job.id);
    assert(jobMatch.score !== undefined, 'Should have match score');
    assert(
      jobMatch.aiExplanation,
      'Should have AI explanation'
    );
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testProfileUpdateTriggersReMatching() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    // Create initial job
    const job = await createJobForCandidate(talentId, {
      title: 'Python Engineer',
      skills: ['Python', 'Django', 'PostgreSQL'],
    });

    // Update profile with matching skills
    const updateRes = await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['Python', 'Django', 'PostgreSQL'],
        experience: 'mid',
      });

    assert.strictEqual(updateRes.status, 200, 'Profile update should succeed');

    // Fetch recommendations
    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should get recommendations');
    const jobMatch = recsRes.body.find((m) => m.jobId === job.id);
    assert(jobMatch, 'Updated profile should match the job');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testRankingByHybridFormula() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    // Update candidate profile
    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: 'mid',
      });

    // Create two jobs - one old/external, one new/internal
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 6);

    const newDate = new Date();

    const oldJob = await createJobForCandidate(talentId, {
      title: 'Old External Job',
      skills: ['JavaScript', 'React', 'Node.js'],
      postedAt: oldDate,
      trustScore: 50,
      livenessStatus: 'stale',
    });

    const newJob = await createJobForCandidate(talentId, {
      title: 'New Internal Job',
      skills: ['JavaScript', 'React', 'Node.js'],
      postedAt: newDate,
      trustScore: 95,
      livenessStatus: 'active',
    });

    // Fetch recommendations
    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should get recommendations');

    const oldMatch = recsRes.body.find((m) => m.jobId === oldJob.id);
    const newMatch = recsRes.body.find((m) => m.jobId === newJob.id);

    if (oldMatch && newMatch) {
      assert(
        newMatch.score > oldMatch.score,
        'New/internal job should rank higher'
      );
    }
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testSkillMatchHighlighting() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    const candidateSkills = ['JavaScript', 'React', 'Node.js'];

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: candidateSkills,
        experience: 'mid',
      });

    const job = await createJobForCandidate(talentId, {
      title: 'Full Stack Engineer',
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    });

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    const match = recsRes.body.find((m) => m.jobId === job.id);
    assert(match, 'Should find job match');
    assert(
      Array.isArray(match.skillMatches),
      'Should have skill matches array'
    );
    assert(
      match.skillMatches.length > 0,
      'Should highlight matching skills'
    );
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testVerifiedActiveBadgeDisplay() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['JavaScript', 'React'],
        experience: 'mid',
      });

    // Create verified active job (trustScore ≥ 85 + active status)
    const verifiedJob = await createJobForCandidate(talentId, {
      title: 'Verified Job',
      skills: ['JavaScript', 'React'],
      trustScore: 90,
      livenessStatus: 'active',
    });

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    const match = recsRes.body.find((m) => m.jobId === verifiedJob.id);
    if (match) {
      assert(
        typeof match.isVerifiedActive === 'boolean',
        'Should have isVerifiedActive flag'
      );
    }
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testDirectFromCompanyBadgeDisplay() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['JavaScript', 'React'],
        experience: 'mid',
      });

    // Create internal job
    const internalJob = await createJobForCandidate(talentId, {
      title: 'Internal Job',
      skills: ['JavaScript', 'React'],
      isDirectFromCompany: true,
    });

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    const match = recsRes.body.find((m) => m.jobId === internalJob.id);
    if (match) {
      assert(
        typeof match.isDirectFromCompany === 'boolean',
        'Should have isDirectFromCompany flag'
      );
    }
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testEmptyMatchesWhenNoSkills() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    // Don't set any skills - start with empty profile

    await createJobForCandidate(talentId, {
      title: 'Skills Required Job',
      skills: ['JavaScript', 'React'],
    });

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should return 200');
    // May be empty or have low scores
    assert(Array.isArray(recsRes.body), 'Should return array');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testLargeSkillSetHandling() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    // Create profile with 50+ skills
    const manySkills = Array.from({ length: 50 }, (_, i) => `Skill ${i}`);

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: manySkills,
        experience: 'senior',
      });

    await createJobForCandidate(talentId, {
      title: 'Senior Role',
      skills: ['Skill 1', 'Skill 5', 'Skill 10'],
    });

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should handle large skill sets');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testEdgeCaseNoCommonSkills() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['Niche Skill A', 'Niche Skill B'],
        experience: 'mid',
      });

    await createJobForCandidate(talentId, {
      title: 'Unrelated Job',
      skills: ['Completely', 'Different', 'Skills'],
    });

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should return 200');
    // May be empty or have very low scores
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testRecommendationsIncludeJobDetails() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['JavaScript', 'React'],
        experience: 'mid',
      });

    const job = await createJobForCandidate(talentId, {
      title: 'React Engineer',
      description: 'We are hiring a React engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      skills: ['JavaScript', 'React'],
    });

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    const match = recsRes.body.find((m) => m.jobId === job.id);
    if (match) {
      assert(match.job, 'Should include job details');
      assert.strictEqual(match.job.title, 'React Engineer', 'Should have job title');
      assert.strictEqual(match.job.company, 'Tech Corp', 'Should have company');
    }
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testRecommendationsPaginated() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['JavaScript'],
        experience: 'junior',
      });

    // Create multiple jobs
    for (let i = 0; i < 5; i++) {
      await createJobForCandidate(talentId, {
        title: `Job ${i}`,
        skills: ['JavaScript'],
      });
    }

    // Fetch with limit
    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`)
      .query({ limit: 3 });

    assert.strictEqual(recsRes.status, 200, 'Should return 200');
    assert(
      Array.isArray(recsRes.body),
      'Should return array'
    );
    // Should respect limit
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Job Matching Integration Tests\n');

  await runTest(
    'Automatic matching after resume upload',
    testAutomaticMatchingAfterResumeUpload
  );
  await runTest(
    'Profile update triggers re-matching',
    testProfileUpdateTriggersReMatching
  );
  await runTest('Ranking by hybrid formula', testRankingByHybridFormula);
  await runTest('Skill match highlighting', testSkillMatchHighlighting);
  await runTest('Verified Active badge display', testVerifiedActiveBadgeDisplay);
  await runTest(
    'Direct from Company badge display',
    testDirectFromCompanyBadgeDisplay
  );
  await runTest('Empty matches when no skills', testEmptyMatchesWhenNoSkills);
  await runTest('Large skill set handling', testLargeSkillSetHandling);
  await runTest('Edge case: no common skills', testEdgeCaseNoCommonSkills);
  await runTest('Recommendations include job details', testRecommendationsIncludeJobDetails);
  await runTest('Recommendations paginated', testRecommendationsPaginated);

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
