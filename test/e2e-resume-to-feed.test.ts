/**
 * End-to-End Tests: Complete User Journey
 * Resume Upload → AI Parsing → Job Matching → Job Feed → Apply
 *
 * Run with: npm run test:e2e
 * Timeout: 120 seconds per test
 */

import { generateCompletePdfBuffer } from './fixtures/fixture-generator';
import {
  createNewUserAndGetToken,
  deleteUser,
  getCandidateProfile,
  getActivityLogs,
} from './test-utils';
import { waitForActivityLogEvent } from './helpers/async-helpers';

// Increase timeout for E2E tests
jest.setTimeout(120000);

describe('E2E: Resume Upload to Job Feed', () => {
  let testUserId: string;
  let authToken: string;
  const API_BASE = 'http://localhost:3000/api';

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

  describe('Complete User Flow', () => {
    it('should complete full journey: upload → parse → match → display → apply', async () => {
      // Step 1: Upload resume
      console.log('Step 1: Uploading resume...');
      const pdfBuffer = generateCompletePdfBuffer();
      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const uploadResponse = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(uploadResponse.status).toBe(200);
      const uploadData = await uploadResponse.json();
      expect(uploadData).toHaveProperty('resumeUrl');
      console.log(`✓ Resume uploaded: ${uploadData.resumeUrl}`);

      // Step 2: Wait for AI parsing to complete
      console.log('Step 2: Waiting for AI parsing...');
      const parseCompleted = await waitForActivityLogEvent(
        () => getActivityLogs(testUserId),
        'resume_parsing_complete',
        60000
      );
      expect(parseCompleted).toBe(true);
      console.log('✓ AI parsing completed');

      // Step 3: Verify profile updated with extracted data
      console.log('Step 3: Verifying profile update...');
      const profile = await getCandidateProfile(testUserId);
      expect(profile.skills).toBeDefined();
      expect(Array.isArray(profile.skills)).toBe(true);
      expect(profile.skills.length).toBeGreaterThan(0);
      expect(['entry', 'mid', 'senior', 'lead', 'executive']).toContain(
        profile.experienceLevel
      );
      console.log(
        `✓ Profile updated with ${profile.skills.length} skills, level: ${profile.experienceLevel}`
      );

      // Step 4: Fetch job recommendations
      console.log('Step 4: Fetching job matches...');
      const matchResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(matchResponse.status).toBe(200);
      const matches = await matchResponse.json();
      expect(Array.isArray(matches)).toBe(true);
      console.log(`✓ Retrieved ${matches.length} job matches`);

      // Step 5: Verify match quality and structure
      console.log('Step 5: Validating match quality...');
      if (matches.length > 0) {
        const topMatch = matches[0];

        // Verify structure
        expect(topMatch).toHaveProperty('jobId');
        expect(topMatch).toHaveProperty('job');
        expect(topMatch).toHaveProperty('finalScore');
        expect(topMatch).toHaveProperty('aiExplanation');
        expect(topMatch).toHaveProperty('skillMatches');
        expect(topMatch).toHaveProperty('isVerifiedActive');
        expect(topMatch).toHaveProperty('isDirectFromCompany');

        // Verify scores are valid
        expect(topMatch.finalScore).toBeGreaterThan(0);
        expect(topMatch.finalScore).toBeLessThanOrEqual(1);

        console.log(
          `✓ Top match: "${topMatch.job.title}" at ${topMatch.job.company}, score: ${topMatch.finalScore.toFixed(2)}`
        );
      }

      // Step 6: Apply to top job if matches exist
      if (matches.length > 0) {
        console.log('Step 6: Applying to top job...');
        const topMatch = matches[0];

        const applyResponse = await fetch(`${API_BASE}/candidate/apply/${topMatch.jobId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'I am very interested in this position!',
          }),
        });

        expect([200, 201]).toContain(applyResponse.status);
        const applyData = await applyResponse.json();
        expect(applyData.success || applyData.applied).toBe(true);
        console.log(`✓ Successfully applied to job ${topMatch.jobId}`);

        // Step 7: Verify application was recorded
        console.log('Step 7: Verifying application recorded...');
        const updatedProfile = await getCandidateProfile(testUserId);
        expect(updatedProfile).toHaveProperty('appliedJobs');

        if (Array.isArray(updatedProfile.appliedJobs)) {
          expect(updatedProfile.appliedJobs).toContain(topMatch.jobId);
          console.log(`✓ Application recorded in profile`);
        }
      }

      console.log('✓✓✓ Complete user journey successful! ✓✓✓');
    });

    it('should handle failed parsing with manual profile update fallback', async () => {
      console.log('Step 1: Creating minimal resume for potential parsing issues...');
      const pdfBuffer = generateCompletePdfBuffer();
      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf');

      const uploadResponse = await fetch(`${API_BASE}/candidate/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(uploadResponse.status).toBe(200);
      console.log('✓ Resume uploaded');

      // Wait for parsing (may succeed or fail)
      console.log('Step 2: Waiting for parsing completion...');
      const activityLogs = await getActivityLogs(testUserId);
      const hasParsingEvent = activityLogs.some(
        (log: any) =>
          log.type === 'resume_parsing_complete' || log.type === 'resume_parsing_failed'
      );

      if (!hasParsingEvent) {
        console.log('Waiting for parsing event...');
        await waitForActivityLogEvent(() => getActivityLogs(testUserId), 'resume_parsing_complete', 45000).catch(
          () => {
            console.log('Parsing may have failed, will use manual update');
          }
        );
      }

      // Step 3: Perform manual profile update as fallback
      console.log('Step 3: Updating profile manually...');
      const profileResponse = await fetch(`${API_BASE}/candidate/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
          experienceLevel: 'mid',
          location: 'San Francisco',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);
      console.log('✓ Profile manually updated');

      // Step 4: Still able to get matches
      console.log('Step 4: Fetching job matches after manual update...');
      const matchResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(matchResponse.status).toBe(200);
      const matches = await matchResponse.json();
      expect(Array.isArray(matches)).toBe(true);
      console.log(`✓ Retrieved ${matches.length} matches despite potential parsing issues`);
    });
  });

  describe('Filter and Discover Flow', () => {
    it('should filter job feed by search term', async () => {
      // First, set up profile
      console.log('Setting up candidate profile...');
      const profileResponse = await fetch(`${API_BASE}/candidate/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['React', 'JavaScript', 'Node.js'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      // Get all matches
      console.log('Fetching all matches...');
      const allMatchesResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(allMatchesResponse.status).toBe(200);
      const allMatches = await allMatchesResponse.json();
      console.log(`✓ Found ${allMatches.length} total matches`);

      // Filter by search term
      if (allMatches.length > 0) {
        const firstJobTitle = allMatches[0].job.title;
        const searchTerm = firstJobTitle.split(' ')[0]; // Get first word of title

        console.log(`Filtering by search term: "${searchTerm}"...`);
        const filteredResponse = await fetch(`${API_BASE}/ai-matches?q=${encodeURIComponent(searchTerm)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        expect(filteredResponse.status).toBe(200);
        const filteredMatches = await filteredResponse.json();
        console.log(`✓ Filtered to ${filteredMatches.length} matches`);

        // Verify filtering worked
        expect(filteredMatches.length).toBeLessThanOrEqual(allMatches.length);
      }
    });

    it('should save and unsave jobs', async () => {
      console.log('Setting up profile...');
      const profileResponse = await fetch(`${API_BASE}/candidate/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Python', 'Django'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      console.log('Fetching matches...');
      const matchResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      if (matches.length > 0) {
        const jobToSave = matches[0];

        // Save job
        console.log(`Saving job ${jobToSave.jobId}...`);
        const saveResponse = await fetch(`${API_BASE}/candidate/saved-jobs`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: jobToSave.jobId,
          }),
        });

        expect([200, 201]).toContain(saveResponse.status);
        console.log('✓ Job saved');

        // Unsave job
        console.log('Unsaving job...');
        const unsaveResponse = await fetch(
          `${API_BASE}/candidate/saved-jobs/${jobToSave.jobId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        expect([200, 204]).toContain(unsaveResponse.status);
        console.log('✓ Job unsaved');
      }
    });
  });

  describe('Match Quality Validation', () => {
    it('should provide AI explanations for matches', async () => {
      console.log('Setting up profile...');
      const profileResponse = await fetch(`${API_BASE}/candidate/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Go', 'Kubernetes', 'AWS'],
          experienceLevel: 'senior',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      console.log('Fetching matches...');
      const matchResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      if (matches.length > 0) {
        matches.forEach((match: any) => {
          expect(match.aiExplanation).toBeDefined();
          expect(typeof match.aiExplanation).toBe('string');
          expect(match.aiExplanation.length).toBeGreaterThan(0);

          console.log(`Match explanation: "${match.aiExplanation.substring(0, 80)}..."`);
        });
      }
    });

    it('should show trust badges for verified jobs', async () => {
      console.log('Setting up profile...');
      const profileResponse = await fetch(`${API_BASE}/candidate/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Rust', 'WebAssembly'],
          experienceLevel: 'senior',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      console.log('Fetching matches...');
      const matchResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      if (matches.length > 0) {
        const verifiedMatches = matches.filter((m: any) => m.isVerifiedActive);
        console.log(`✓ Found ${verifiedMatches.length} verified active jobs`);

        const directMatches = matches.filter((m: any) => m.isDirectFromCompany);
        console.log(`✓ Found ${directMatches.length} direct from company jobs`);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle API failures gracefully', async () => {
      console.log('Testing API error handling...');

      // Try to get matches without valid profile
      const matchResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer invalid-token`,
        },
      });

      expect(matchResponse.status).toBe(401);
      console.log('✓ Properly rejected invalid authentication');

      // Valid auth but no data
      const validResponse = await fetch(`${API_BASE}/ai-matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(validResponse.status).toBe(200);
      const matches = await validResponse.json();
      expect(Array.isArray(matches)).toBe(true);
      console.log(`✓ Successfully handled request (${matches.length} matches)`);
    });
  });
});
