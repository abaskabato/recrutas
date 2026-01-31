/**
 * End-to-End Tests: Resume Upload → Parsing → Matching → Feed Display
 * Tests complete user journey with 60-second timeout
 *
 * Requirements: Full stack running (server + database + frontend capable)
 * Run with: npm run test:e2e
 */

import assert from 'assert';
import supertest from 'supertest';
import { supabase } from '../server/lib/supabase-client.ts';
import {
  createNewUserAndGetToken,
  createNewTalentOwnerAndGetToken,
  deleteUser,
} from '../test/test-utils.js';
import {
  generateCompletePdfBuffer,
  generateMinimalResumePdfBuffer,
} from './fixtures/fixture-generator.js';
import {
  waitForProfileUpdate,
  waitForActivityLogEvent,
  delay,
} from './helpers/async-helpers.js';
import { createSampleJob } from './helpers/test-data-factory.js';

const app = global.app;
const request = supertest(app);

let testsPassed = 0;
let testsFailed = 0;

async function runTest(testName, testFn) {
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ ${testName} (${duration}ms)`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${testName}: ${err.message}`);
    testsFailed++;
  }
}

async function testCompleteE2EFlow() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    console.log('  Step 1: Create test user');
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    console.log('  Step 2: Upload resume');
    const pdfBuffer = generateCompletePdfBuffer();
    const uploadRes = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${candidateToken}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(uploadRes.status, 200, 'Resume upload should succeed');
    assert(uploadRes.body.resumeUrl, 'Should return resume URL');
    const resumeUrl = uploadRes.body.resumeUrl;

    console.log('  Step 3: Wait for background AI parsing');
    const profile = await waitForProfileUpdate(
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

    assert(profile.resumeParsed, 'Resume should be marked as parsed');
    assert(
      profile.skills && profile.skills.length > 0,
      'Skills should be extracted'
    );

    console.log('  Step 4: Verify activity log');
    const event = await waitForActivityLogEvent(
      async () => {
        const { data } = await supabase
          .from('activityLogs')
          .select('*')
          .eq('userId', candidateId)
          .order('createdAt', { ascending: false });
        return data || [];
      },
      'resume_parsing_complete',
      45000
    );

    assert(event, 'Activity log should record parsing completion');

    console.log('  Step 5: Create talent owner and matching job');
    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    const jobData = createSampleJob({
      talentOwnerId: talentId,
      skills: profile.skills.slice(0, 3), // Use extracted skills
      title: 'Perfect Match Engineer',
    });

    const { data: job, error: jobError } = await supabase
      .from('jobPostings')
      .insert([jobData])
      .select()
      .single();

    assert(!jobError, `Failed to create job: ${jobError?.message}`);

    console.log('  Step 6: Fetch job recommendations');
    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should get recommendations');
    assert(Array.isArray(recsRes.body), 'Should return array');

    const jobMatch = recsRes.body.find((m) => m.jobId === job.id);
    assert(
      jobMatch,
      `Should include matching job. Got ${recsRes.body.length} matches`
    );

    console.log('  Step 7: Verify match details');
    assert(jobMatch.score !== undefined, 'Should have match score');
    assert(jobMatch.score > 0.5, 'Score should be > 0.5 for matching skills');
    assert(jobMatch.aiExplanation, 'Should have AI explanation');
    assert(
      Array.isArray(jobMatch.skillMatches),
      'Should have skill matches'
    );

    console.log('  Step 8: Apply to job');
    const applyRes = await request
      .post(`/api/candidate/apply/${job.id}`)
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(applyRes.status, 200, 'Apply should succeed');

    console.log('  Step 9: Verify application tracked');
    const { data: applications } = await supabase
      .from('jobApplications')
      .select('*')
      .eq('jobId', job.id)
      .eq('candidateId', candidateId);

    assert(
      applications && applications.length > 0,
      'Application should be tracked'
    );

    console.log('✅ Complete E2E flow successful');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testE2EWithMultipleJobs() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    console.log('  Creating candidate and uploading resume');
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();
    await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${candidateToken}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    console.log('  Waiting for resume parsing');
    const profile = await waitForProfileUpdate(
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

    console.log('  Creating talent owner and multiple jobs');
    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    const jobs = [];
    for (let i = 0; i < 3; i++) {
      const jobData = createSampleJob({
        talentOwnerId: talentId,
        title: `Job ${i + 1}`,
        skills: [profile.skills[0], profile.skills[1] || 'React'],
      });

      const { data: job } = await supabase
        .from('jobPostings')
        .insert([jobData])
        .select()
        .single();

      jobs.push(job);
    }

    console.log('  Fetching recommendations for multiple jobs');
    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should get recommendations');

    const matchedJobs = recsRes.body.filter((m) =>
      jobs.some((j) => j.id === m.jobId)
    );

    assert(
      matchedJobs.length > 0,
      `Should match at least one job. Got ${matchedJobs.length}`
    );

    console.log(`✅ Matched ${matchedJobs.length} jobs`);
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testE2EWithMinimalResume() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    console.log('  Creating candidate with minimal resume');
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    const pdfBuffer = generateMinimalResumePdfBuffer();
    await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${candidateToken}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    console.log('  Waiting for parsing');
    const profile = await waitForProfileUpdate(
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

    // Minimal resume may have limited skills
    assert(profile.resumeParsed, 'Should mark as parsed');

    console.log('  Creating job and fetching recommendations');
    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    const jobData = createSampleJob({
      talentOwnerId: talentId,
      skills: ['React', 'JavaScript'],
    });

    const { data: job } = await supabase
      .from('jobPostings')
      .insert([jobData])
      .select()
      .single();

    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert.strictEqual(recsRes.status, 200, 'Should get recommendations');
    assert(Array.isArray(recsRes.body), 'Should return array');

    console.log('✅ Minimal resume E2E flow successful');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testE2EManualProfileUpdate() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    console.log('  Creating candidate');
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    console.log('  Updating profile manually (no resume)');
    const updateRes = await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['Python', 'Django', 'PostgreSQL'],
        experience: 'mid',
      });

    assert.strictEqual(updateRes.status, 200, 'Profile update should succeed');

    console.log('  Creating matching job');
    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    const jobData = createSampleJob({
      talentOwnerId: talentId,
      skills: ['Python', 'Django', 'PostgreSQL'],
      title: 'Backend Engineer',
    });

    const { data: job } = await supabase
      .from('jobPostings')
      .insert([jobData])
      .select()
      .single();

    console.log('  Fetching recommendations');
    const recsRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    const jobMatch = recsRes.body.find((m) => m.jobId === job.id);
    assert(jobMatch, 'Should match job without resume upload');

    console.log('✅ Manual profile update E2E flow successful');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testE2EJobFiltering() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    console.log('  Setting up candidate and jobs');
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['JavaScript', 'React'],
        location: 'Remote',
        workType: ['remote'],
      });

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    // Create remote and onsite jobs
    const remoteJob = await supabase
      .from('jobPostings')
      .insert([
        createSampleJob({
          talentOwnerId: talentId,
          title: 'Remote React Job',
          location: 'Remote',
          workType: 'remote',
          skills: ['React', 'JavaScript'],
        }),
      ])
      .select()
      .single();

    const onsiteJob = await supabase
      .from('jobPostings')
      .insert([
        createSampleJob({
          talentOwnerId: talentId,
          title: 'Onsite React Job',
          location: 'New York, NY',
          workType: 'onsite',
          skills: ['React', 'JavaScript'],
        }),
      ])
      .select()
      .single();

    console.log('  Fetching all matches');
    const allRes = await request
      .get('/api/ai-matches')
      .set('Authorization', `Bearer ${candidateToken}`);

    console.log('  Fetching filtered matches');
    const remoteRes = await request
      .get('/api/ai-matches?workType=remote')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert(
      remoteRes.body.length <= allRes.body.length,
      'Filtered results should be subset'
    );

    console.log('✅ Job filtering E2E flow successful');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

async function testE2EConcurrentApplications() {
  let candidateToken, candidateId;
  let talentToken, talentId;

  try {
    console.log('  Setting up candidate and jobs');
    ({ token: candidateToken, userId: candidateId } =
      await createNewUserAndGetToken());

    await request
      .post('/api/candidate/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        skills: ['JavaScript', 'React'],
        experience: 'mid',
      });

    ({ token: talentToken, userId: talentId } =
      await createNewTalentOwnerAndGetToken());

    const jobs = [];
    for (let i = 0; i < 3; i++) {
      const { data: job } = await supabase
        .from('jobPostings')
        .insert([
          createSampleJob({
            talentOwnerId: talentId,
            title: `Job ${i}`,
            skills: ['JavaScript', 'React'],
          }),
        ])
        .select()
        .single();
      jobs.push(job);
    }

    console.log('  Applying to multiple jobs concurrently');
    const applies = jobs.map((job) =>
      request
        .post(`/api/candidate/apply/${job.id}`)
        .set('Authorization', `Bearer ${candidateToken}`)
    );

    const results = await Promise.all(applies);

    assert(
      results.every((r) => r.status === 200),
      'All applications should succeed'
    );

    console.log('✅ Concurrent applications E2E flow successful');
  } finally {
    if (candidateId) await deleteUser(candidateId);
    if (talentId) await deleteUser(talentId);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 End-to-End Tests: Resume → Parsing → Matching → Feed\n');

  await runTest(
    'Complete E2E flow (upload → parse → match → apply)',
    testCompleteE2EFlow
  );
  await runTest('E2E with multiple matching jobs', testE2EWithMultipleJobs);
  await runTest('E2E with minimal resume', testE2EWithMinimalResume);
  await runTest('E2E with manual profile update', testE2EManualProfileUpdate);
  await runTest('E2E job filtering', testE2EJobFiltering);
  await runTest('E2E concurrent applications', testE2EConcurrentApplications);

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

describe('E2E Tests', () => {
  test('Run all E2E tests', async () => {
    await runAllTests();
  });
});
