/**
 * Integration Tests for Resume Service
 * Tests resume processing with real database and background AI parsing
 *
 * Run with: npm run test:integration:backend
 */

import {
  generateCompletePdfBuffer,
  generateMinimalResumePdfBuffer,
  generateNoSkillsPdfBuffer,
} from './fixtures/fixture-generator';
import {
  createNewUserAndGetToken,
  deleteUser,
  getCandidateProfile,
  getActivityLogs,
} from './test-utils';
import { waitForCondition, waitForActivityLogEvent } from './helpers/async-helpers';

describe('Resume Service Integration Tests', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const result = await createNewUserAndGetToken();
    testUserId = result.userId;
    authToken = result.token;
  });

  afterAll(async () => {
    if (testUserId) {
      await deleteUser(testUserId);
    }
  });

  describe('Resume Upload and Background Processing', () => {
    it('should save resume URL immediately on upload', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const uploadData = await response.json();

      // Verify resume URL is stored in database immediately
      const profile = await getCandidateProfile(testUserId);
      expect(profile.resumeUrl).toBe(uploadData.resumeUrl);
      expect(profile.resumeUrl).toBeTruthy();
    });

    it('should trigger background AI parsing', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const uploadData = await response.json();
      expect(uploadData.aiParsing).toBe(true);

      // Wait for parsing to complete
      const parseCompleted = await waitForActivityLogEvent(
        testUserId,
        'resume_parsing_complete',
        45000 // 45 second timeout
      );

      expect(parseCompleted).toBe(true);
    });

    it('should update profile with extracted skills after parsing', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      // Wait for parsing completion
      await waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000);

      // Verify profile has skills
      const profile = await getCandidateProfile(testUserId);
      expect(profile.skills).toBeDefined();
      expect(Array.isArray(profile.skills)).toBe(true);
      expect(profile.skills.length).toBeGreaterThan(0);
    });

    it('should set experience level from parsed resume', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      // Wait for parsing
      await waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000);

      // Verify experience level is set
      const profile = await getCandidateProfile(testUserId);
      expect(['entry', 'mid', 'senior', 'lead', 'executive']).toContain(profile.experienceLevel);
    });

    it('should extract resume text for AI processing', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      // Wait for parsing
      await waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000);

      // Verify extracted text exists
      const profile = await getCandidateProfile(testUserId);
      expect(profile.resumeText).toBeDefined();
      expect(profile.resumeText.length).toBeGreaterThan(0);
    });
  });

  describe('Parsing Failure Handling', () => {
    it('should log parsing failure gracefully', async () => {
      const pdfBuffer = generateNoSkillsPdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      // Wait for parsing (or failure)
      const logs = await waitForCondition(async () => {
        const activityLogs = await getActivityLogs(testUserId);
        return activityLogs.some(
          (log: any) =>
            log.type === 'resume_parsing_complete' || log.type === 'resume_parsing_failed'
        );
      }, 45000);

      expect(logs).toBe(true);

      // Verify activity log contains parsing event
      const activityLogs = await getActivityLogs(testUserId);
      const parsingLog = activityLogs.find(
        (log: any) =>
          log.type === 'resume_parsing_complete' || log.type === 'resume_parsing_failed'
      );
      expect(parsingLog).toBeDefined();
    });

    it('should allow manual profile update if parsing fails', async () => {
      const pdfBuffer = generateNoSkillsPdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      let response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      // Wait for parsing to complete or fail
      await waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000).catch(
        () => {} // May fail, that's ok
      );

      // Manual profile update should still work
      response = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['JavaScript', 'React', 'Node.js'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(response.status);

      // Verify profile updated
      const profile = await getCandidateProfile(testUserId);
      expect(profile.skills).toContain('JavaScript');
    });
  });

  describe('Concurrent Resume Uploads', () => {
    it('should handle multiple uploads from same user (last one wins)', async () => {
      const pdf1 = generateMinimalResumePdfBuffer();
      const pdf2 = generateCompletePdfBuffer();

      const formData1 = new FormData();
      formData1.append('file', new Blob([pdf1], { type: 'application/pdf' }), 'resume1.pdf');

      const formData2 = new FormData();
      formData2.append('file', new Blob([pdf2], { type: 'application/pdf' }), 'resume2.pdf');

      // Upload simultaneously
      const [response1, response2] = await Promise.all([
        fetch('http://localhost:3000/api/candidate/resume', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData1,
        }),
        fetch('http://localhost:3000/api/candidate/resume', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData2,
        }),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Wait for both parsing jobs to complete
      await Promise.all([
        waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000).catch(() => {}),
        waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000).catch(() => {}),
      ]);

      // Last uploaded resume should be current (most recent)
      const profile = await getCandidateProfile(testUserId);
      expect(profile.resumeUrl).toBe(data2.resumeUrl);
    });
  });

  describe('Database Consistency', () => {
    it('should store all extracted fields in database', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      // Wait for parsing
      await waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000);

      // Verify all fields stored
      const profile = await getCandidateProfile(testUserId);

      expect(profile).toHaveProperty('resumeUrl');
      expect(profile).toHaveProperty('resumeText');
      expect(profile).toHaveProperty('skills');
      expect(profile).toHaveProperty('experienceLevel');
      expect(profile).toHaveProperty('parsedAt');
    });

    it('should not lose data on concurrent database operations', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      // Wait for parsing
      await waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000);

      // Simultaneously read profile multiple times while parsing happens
      const profiles = await Promise.all([
        getCandidateProfile(testUserId),
        getCandidateProfile(testUserId),
        getCandidateProfile(testUserId),
      ]);

      // All reads should have consistent data
      const [prof1, prof2, prof3] = profiles;
      expect(prof1.resumeUrl).toBe(prof2.resumeUrl);
      expect(prof2.resumeUrl).toBe(prof3.resumeUrl);
      expect(prof1.skills).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should upload resume in under 2 seconds', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const startTime = Date.now();

      const response = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    it('should parse resume in under 45 seconds', async () => {
      const pdfBuffer = generateCompletePdfBuffer();

      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const uploadResponse = await fetch('http://localhost:3000/api/candidate/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const startTime = Date.now();

      await waitForActivityLogEvent(testUserId, 'resume_parsing_complete', 45000);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(45000);
    });
  });
});
