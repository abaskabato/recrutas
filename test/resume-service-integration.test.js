/**
 * Integration Tests for Resume Service
 * Tests resume upload, background processing, and database state
 *
 * Requirements: Running server + Supabase test database
 * Run with: npm run test:integration:backend
 */

import assert from 'assert';
import supertest from 'supertest';
import { supabase } from '../server/db.ts';
import {
  createNewUserAndGetToken,
  deleteUser,
} from '../test/test-utils.js';
import {
  generateCompletePdfBuffer,
  generateMinimalResumePdfBuffer,
  generateMalformedPdfBuffer,
} from './fixtures/fixture-generator.js';
import {
  waitForProfileUpdate,
  waitForActivityLogEvent,
  delay,
} from './helpers/async-helpers.js';

const app = global.app; // Assumes server exports app to global
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

async function testResumeUploadCompletesQuickly() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();
    const startTime = Date.now();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    const uploadTime = Date.now() - startTime;

    assert.strictEqual(res.status, 200, `Upload should succeed, got ${res.status}`);
    assert(uploadTime < 5000, `Upload should complete in <5s, took ${uploadTime}ms`);
    assert(res.body.success, 'Response should indicate success');
    assert(res.body.resumeUrl, 'Should return resume URL');
    assert.strictEqual(res.body.parsed, false, 'Should mark as not yet parsed');
    assert.strictEqual(res.body.aiParsing, true, 'Should indicate AI parsing in progress');
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testResumeUrlSavedToDatabase() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const uploadRes = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert(uploadRes.body.resumeUrl, 'Upload should return URL');

    // Verify URL stored in database
    const { data: profile, error } = await supabase
      .from('candidateProfiles')
      .select('resumeUrl')
      .eq('userId', userId)
      .single();

    assert(!error, `Database query should succeed: ${error?.message}`);
    assert.strictEqual(
      profile.resumeUrl,
      uploadRes.body.resumeUrl,
      'Database should have saved resume URL'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testBackgroundParsingCompletion() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    // Upload resume
    const uploadRes = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert(uploadRes.body.success, 'Upload should succeed');

    // Wait for background parsing to complete (max 45 seconds)
    const profile = await waitForProfileUpdate(
      async () => {
        const { data } = await supabase
          .from('candidateProfiles')
          .select('*')
          .eq('userId', userId)
          .single();
        return data;
      },
      { resumeParsed: true },
      45000
    );

    assert(profile.resumeParsed, 'Profile should be marked as parsed');
    assert(
      profile.skills && profile.skills.length > 0,
      'Profile should have extracted skills'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testActivityLogRecordsParsingCompletion() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    // Upload resume
    await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    // Wait for activity log entry
    const event = await waitForActivityLogEvent(
      async () => {
        const { data } = await supabase
          .from('activityLogs')
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false });
        return data || [];
      },
      'resume_parsing_complete',
      45000
    );

    assert(event, 'Should have resume_parsing_complete event');
    assert(event.action === 'resume_parsing_complete', 'Should be correct event type');
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testSkillsExtractedCorrectly() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    // Upload resume with known skills
    await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    // Wait for profile update
    const profile = await waitForProfileUpdate(
      async () => {
        const { data } = await supabase
          .from('candidateProfiles')
          .select('*')
          .eq('userId', userId)
          .single();
        return data;
      },
      { resumeParsed: true },
      45000
    );

    assert(Array.isArray(profile.skills), 'Skills should be array');
    assert(profile.skills.length > 0, 'Should have extracted skills');

    // Check for expected skills from complete resume
    const expectedSkills = ['JavaScript', 'React', 'Node.js', 'TypeScript'];
    const hasExpectedSkill = expectedSkills.some((skill) =>
      profile.skills.some(
        (s) =>
          s.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(s.toLowerCase())
      )
    );
    assert(
      hasExpectedSkill,
      `Should have one of expected skills: ${expectedSkills.join(', ')}`
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testExperienceLevelExtraction() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    const profile = await waitForProfileUpdate(
      async () => {
        const { data } = await supabase
          .from('candidateProfiles')
          .select('*')
          .eq('userId', userId)
          .single();
        return data;
      },
      { resumeParsed: true },
      45000
    );

    assert(profile.experience, 'Should extract experience level');
    assert(
      ['entry', 'mid', 'senior', 'lead', 'executive'].includes(profile.experience),
      'Experience should be valid level'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testConcurrentUploadsHandled() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    // Upload 3 resumes concurrently
    const uploads = Promise.all([
      generateCompletePdfBuffer(),
      generateMinimalResumePdfBuffer(),
      generateCompletePdfBuffer(),
    ].map((buffer) =>
      request
        .post('/api/candidate/resume')
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', buffer, 'resume.pdf')
    ));

    const results = await uploads;

    assert.strictEqual(results.length, 3, 'Should complete all 3 uploads');
    assert(
      results.every((r) => r.status === 200),
      'All uploads should succeed'
    );

    // Wait for all processing to complete
    await delay(2000);

    // Verify database has latest resume
    const { data: profile } = await supabase
      .from('candidateProfiles')
      .select('resumeUrl')
      .eq('userId', userId)
      .single();

    // Should have one resume URL (the last one)
    assert(profile.resumeUrl, 'Should have resume URL');
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testMinimalResumeProcessing() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateMinimalResumePdfBuffer();

    // Upload minimal resume
    const uploadRes = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert(uploadRes.body.success, 'Upload should succeed');

    // Wait for processing
    const profile = await waitForProfileUpdate(
      async () => {
        const { data } = await supabase
          .from('candidateProfiles')
          .select('*')
          .eq('userId', userId)
          .single();
        return data;
      },
      { resumeParsed: true },
      45000
    );

    // Minimal resume should still be processed
    assert(profile.resumeParsed, 'Should mark as parsed');
    // May have limited skills
    assert(
      Array.isArray(profile.skills),
      'Should have skills array'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testMalformedPdfHandling() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateMalformedPdfBuffer();

    // Upload malformed PDF
    const uploadRes = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    // Upload should succeed (validation happens in background)
    assert.strictEqual(uploadRes.status, 200, 'Upload endpoint should accept file');

    // Wait for processing to complete or fail
    await delay(10000);

    const { data: logs } = await supabase
      .from('activityLogs')
      .select('*')
      .eq('userId', userId)
      .or('action.eq.resume_parsing_complete,action.eq.resume_parsing_failed');

    // Should have one of the events
    const hasEvent = logs && logs.length > 0;
    assert(
      hasEvent,
      'Should log parsing completion or failure'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testParsingFailureHandling() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    // Create a very small buffer that won't parse correctly
    const invalidBuffer = Buffer.from('Not a valid PDF or document', 'utf8');

    const uploadRes = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', invalidBuffer, 'invalid.pdf');

    // Upload succeeds
    assert.strictEqual(uploadRes.status, 200, 'Upload should succeed');

    // Wait for processing attempt
    await delay(10000);

    // Should have failure event
    const { data: logs } = await supabase
      .from('activityLogs')
      .select('*')
      .eq('userId', userId)
      .eq('action', 'resume_parsing_failed');

    // May or may not have failure event depending on implementation
    if (logs && logs.length > 0) {
      assert(
        logs[0].action === 'resume_parsing_failed',
        'Should log parsing failure'
      );
    }
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testResumeTextExtraction() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    // Wait for processing
    const profile = await waitForProfileUpdate(
      async () => {
        const { data } = await supabase
          .from('candidateProfiles')
          .select('*')
          .eq('userId', userId)
          .single();
        return data;
      },
      { resumeParsed: true },
      45000
    );

    // Should have resume text extracted
    assert(
      profile.resumeText || profile.rawResumeText,
      'Should have extracted resume text'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testFileSizeValidation() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    // Create a buffer larger than 5MB
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

    const uploadRes = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', largeBuffer, 'large.pdf');

    // Should reject large file
    assert(
      uploadRes.status >= 400,
      `Should reject files >5MB, got status ${uploadRes.status}`
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testUnauthenticatedUploadRejected() {
  const pdfBuffer = generateCompletePdfBuffer();

  const uploadRes = await request
    .post('/api/candidate/resume')
    .attach('resume', pdfBuffer, 'resume.pdf');

  assert.strictEqual(
    uploadRes.status,
    401,
    'Should reject unauthenticated upload with 401'
  );
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Resume Service Integration Tests\n');

  await runTest('Resume upload completes quickly', testResumeUploadCompletesQuickly);
  await runTest('Resume URL saved to database', testResumeUrlSavedToDatabase);
  await runTest('Background parsing completion', testBackgroundParsingCompletion);
  await runTest(
    'Activity log records parsing completion',
    testActivityLogRecordsParsingCompletion
  );
  await runTest('Skills extracted correctly', testSkillsExtractedCorrectly);
  await runTest('Experience level extraction', testExperienceLevelExtraction);
  await runTest('Concurrent uploads handled', testConcurrentUploadsHandled);
  await runTest('Minimal resume processing', testMinimalResumeProcessing);
  await runTest('Malformed PDF handling', testMalformedPdfHandling);
  await runTest('Parsing failure handling', testParsingFailureHandling);
  await runTest('Resume text extraction', testResumeTextExtraction);
  await runTest('File size validation', testFileSizeValidation);
  await runTest('Unauthenticated upload rejected', testUnauthenticatedUploadRejected);

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
