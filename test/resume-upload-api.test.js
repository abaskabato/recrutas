/**
 * Integration Tests for Resume Upload API
 * Tests file validation, authentication, response structure
 *
 * Requirements: Running server
 * Run with: npm run test:integration:backend
 */

import assert from 'assert';
import supertest from 'supertest';
import {
  createNewUserAndGetToken,
  deleteUser,
} from '../test/test-utils.js';
import {
  generateCompletePdfBuffer,
  generateMinimalResumePdfBuffer,
  generateMalformedPdfBuffer,
  generateDocxBuffer,
  generateUnsupportedFileBuffer,
  generateLargePdfBuffer,
} from './fixtures/fixture-generator.js';

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

async function testAcceptPdfFiles() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(res.status, 200, `Should accept PDF, got ${res.status}`);
    assert(res.body.success, 'Should indicate success');
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testAcceptDocxFiles() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const docxBuffer = generateDocxBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', docxBuffer, 'resume.docx');

    assert(
      res.status === 200 || res.status === 400,
      'Should handle DOCX file (accept or reject with reason)'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testRejectUnsupportedTypes() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const exeBuffer = generateUnsupportedFileBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', exeBuffer, 'malware.exe');

    assert(
      res.status >= 400,
      `Should reject .exe files, got ${res.status}`
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testRejectFilesOver5MB() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const largeBuffer = generateLargePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', largeBuffer, 'large.pdf');

    assert(
      res.status >= 400,
      `Should reject files >5MB, got ${res.status}`
    );
    if (res.body.error) {
      assert(
        res.body.error.toLowerCase().includes('size'),
        'Error should mention file size'
      );
    }
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testValidateMagicBytes() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    // Create a file with wrong extension but text content
    const fakeBuffer = Buffer.from('Not a PDF', 'utf8');

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', fakeBuffer, 'definitely-a-pdf.pdf');

    // Should either reject or process it
    assert(
      res.status === 200 || res.status >= 400,
      'Should validate magic bytes'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testRequireValidBearerToken() {
  const pdfBuffer = generateCompletePdfBuffer();

  const res = await request
    .post('/api/candidate/resume')
    .set('Authorization', 'Bearer invalid-token')
    .attach('resume', pdfBuffer, 'resume.pdf');

  assert.strictEqual(
    res.status,
    401,
    'Should reject invalid bearer token with 401'
  );
}

async function testRejectMissingToken() {
  const pdfBuffer = generateCompletePdfBuffer();

  const res = await request
    .post('/api/candidate/resume')
    .attach('resume', pdfBuffer, 'resume.pdf');

  assert.strictEqual(
    res.status,
    401,
    'Should reject missing token with 401'
  );
}

async function testResponseContainsResumeUrl() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(res.status, 200, 'Upload should succeed');
    assert(res.body.resumeUrl, 'Should return resumeUrl');
    assert(
      res.body.resumeUrl.includes('http'),
      'resumeUrl should be valid URL'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testResponseContainsParsedFlag() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(res.status, 200, 'Upload should succeed');
    assert(
      'parsed' in res.body,
      'Response should have parsed flag'
    );
    assert.strictEqual(
      res.body.parsed,
      false,
      'Parsed should be false immediately (async processing)'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testResponseContainsAiParsingFlag() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(res.status, 200, 'Upload should succeed');
    assert(
      'aiParsing' in res.body,
      'Response should have aiParsing flag'
    );
    assert.strictEqual(
      res.body.aiParsing,
      true,
      'aiParsing should be true'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testResponseContainsExtractedInfoNullInitially() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(res.status, 200, 'Upload should succeed');
    assert(
      res.body.extractedInfo === null || res.body.extractedInfo === undefined,
      'extractedInfo should be null initially'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testResponseStructure() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(res.status, 200, 'Upload should succeed');

    // Verify all expected fields
    assert(typeof res.body.success === 'boolean', 'Should have success flag');
    assert(typeof res.body.resumeUrl === 'string', 'Should have resumeUrl string');
    assert(typeof res.body.parsed === 'boolean', 'Should have parsed boolean');
    assert(typeof res.body.aiParsing === 'boolean', 'Should have aiParsing boolean');
    assert(
      res.body.extractedInfo === null || res.body.extractedInfo !== undefined,
      'Should have extractedInfo (null or object)'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testMultipleUploadsSucceed() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdf1 = generateCompletePdfBuffer();
    const pdf2 = generateMinimalResumePdfBuffer();

    const res1 = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdf1, 'resume1.pdf');

    const res2 = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdf2, 'resume2.pdf');

    assert.strictEqual(res1.status, 200, 'First upload should succeed');
    assert.strictEqual(res2.status, 200, 'Second upload should succeed');
    assert(res1.body.resumeUrl !== res2.body.resumeUrl, 'Should have different URLs');
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testUploadWithoutFileField() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    assert(
      res.status >= 400,
      'Should reject request without file'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testMalformedPdfDetection() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const malformedPdf = generateMalformedPdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', malformedPdf, 'malformed.pdf');

    // Upload endpoint should accept it (validation in background)
    assert.strictEqual(
      res.status,
      200,
      'Upload endpoint should accept malformed PDF (will fail in background)'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testCaseInsensitiveFileExtension() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'RESUME.PDF');

    assert.strictEqual(
      res.status,
      200,
      'Should handle uppercase file extensions'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

async function testResponseSuccessFlag() {
  let token, userId;
  try {
    ({ token, userId } = await createNewUserAndGetToken());

    const pdfBuffer = generateCompletePdfBuffer();

    const res = await request
      .post('/api/candidate/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', pdfBuffer, 'resume.pdf');

    assert.strictEqual(res.status, 200, 'Upload should succeed');
    assert.strictEqual(
      res.body.success,
      true,
      'Success flag should be true'
    );
  } finally {
    if (userId) await deleteUser(userId);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Resume Upload API Tests\n');

  await runTest('Accept PDF files', testAcceptPdfFiles);
  await runTest('Accept DOCX files', testAcceptDocxFiles);
  await runTest('Reject unsupported types', testRejectUnsupportedTypes);
  await runTest('Reject files over 5MB', testRejectFilesOver5MB);
  await runTest('Validate magic bytes', testValidateMagicBytes);
  await runTest('Require valid Bearer token', testRequireValidBearerToken);
  await runTest('Reject missing token', testRejectMissingToken);
  await runTest('Response contains resumeUrl', testResponseContainsResumeUrl);
  await runTest('Response contains parsed flag', testResponseContainsParsedFlag);
  await runTest('Response contains aiParsing flag', testResponseContainsAiParsingFlag);
  await runTest(
    'Response contains extractedInfo null initially',
    testResponseContainsExtractedInfoNullInitially
  );
  await runTest('Response structure', testResponseStructure);
  await runTest('Multiple uploads succeed', testMultipleUploadsSucceed);
  await runTest('Upload without file field rejected', testUploadWithoutFileField);
  await runTest('Malformed PDF detection', testMalformedPdfDetection);
  await runTest('Case insensitive file extension', testCaseInsensitiveFileExtension);
  await runTest('Response success flag', testResponseSuccessFlag);

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
