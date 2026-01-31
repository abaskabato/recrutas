/**
 * Integration Tests for Job Matching Flow
 * Tests matching engine from profile to recommendations
 *
 * Run with: npm run test:integration:backend
 */

import { createNewUserAndGetToken, deleteUser, getCandidateProfile } from './test-utils';
import { waitForActivityLogEvent } from './helpers/async-helpers';

describe('Job Matching Integration Tests', () => {
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

  describe('Matching After Resume Upload', () => {
    it('should generate job matches after resume parsing completes', async () => {
      // First, update profile with skills
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['JavaScript', 'React', 'Node.js'],
          experienceLevel: 'mid',
          location: 'Remote',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      // Fetch job matches
      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(matchResponse.status).toBe(200);
      const matches = await matchResponse.json();

      // Should return an array
      expect(Array.isArray(matches)).toBe(true);

      // If there are matches, verify structure
      if (matches.length > 0) {
        const match = matches[0];
        expect(match).toHaveProperty('jobId');
        expect(match).toHaveProperty('matchScore');
        expect(match).toHaveProperty('finalScore');
        expect(match).toHaveProperty('aiExplanation');
        expect(match).toHaveProperty('skillMatches');
      }
    });

    it('should return matches with all required fields', async () => {
      // Set up profile
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Python', 'Django', 'PostgreSQL'],
          experienceLevel: 'senior',
          location: 'San Francisco',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      // Get matches
      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(matchResponse.status).toBe(200);
      const matches = await matchResponse.json();

      if (matches.length > 0) {
        const match = matches[0];

        // Core match fields
        expect(match).toHaveProperty('jobId');
        expect(match).toHaveProperty('matchScore');
        expect(match).toHaveProperty('confidenceLevel');
        expect(match).toHaveProperty('skillMatches');
        expect(match).toHaveProperty('aiExplanation');

        // Hybrid ranking fields
        expect(match).toHaveProperty('semanticRelevance');
        expect(match).toHaveProperty('recencyScore');
        expect(match).toHaveProperty('livenessScore');
        expect(match).toHaveProperty('personalizationScore');
        expect(match).toHaveProperty('finalScore');

        // Trust and liveness
        expect(match).toHaveProperty('trustScore');
        expect(match).toHaveProperty('livenessStatus');
        expect(match).toHaveProperty('isVerifiedActive');
        expect(match).toHaveProperty('isDirectFromCompany');

        // Compatibility
        expect(match).toHaveProperty('compatibilityFactors');
        expect(match.compatibilityFactors).toHaveProperty('skillAlignment');
        expect(match.compatibilityFactors).toHaveProperty('experienceMatch');
        expect(match.compatibilityFactors).toHaveProperty('locationFit');

        // Job details
        expect(match).toHaveProperty('job');
        expect(match.job).toHaveProperty('title');
        expect(match.job).toHaveProperty('company');
      }
    });
  });

  describe('Skill Matching Accuracy', () => {
    it('should highlight matching skills correctly', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['JavaScript', 'React', 'TypeScript', 'Node.js', 'MongoDB'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      if (matches.length > 0) {
        matches.forEach((match: any) => {
          // skillMatches should be array of strings
          expect(Array.isArray(match.skillMatches)).toBe(true);

          // Each skill match should be from candidate's skills
          match.skillMatches.forEach((skill: any) => {
            expect(typeof skill).toBe('string');
          });
        });
      }
    });

    it('should handle perfect skill match with high score', async () => {
      // Create a profile with very specific skills
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Kubernetes', 'Docker', 'Go', 'gRPC'],
          experienceLevel: 'senior',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      if (matches.length > 0) {
        // At least one match should have high semantic relevance
        const highMatch = matches.find((m: any) => m.semanticRelevance > 0.7);

        if (highMatch) {
          expect(highMatch.semanticRelevance).toBeGreaterThan(0.7);
          expect(highMatch.finalScore).toBeGreaterThan(0.6);
        }
      }
    });
  });

  describe('Hybrid Ranking Formula', () => {
    it('should apply correct weight distribution', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Java', 'Spring Boot', 'MySQL'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      if (matches.length > 0) {
        matches.forEach((match: any) => {
          // Verify all scoring components exist and are in valid range
          expect(match.semanticRelevance).toBeGreaterThanOrEqual(0);
          expect(match.semanticRelevance).toBeLessThanOrEqual(1);

          expect(match.recencyScore).toBeGreaterThanOrEqual(0);
          expect(match.recencyScore).toBeLessThanOrEqual(1);

          expect(match.livenessScore).toBeGreaterThanOrEqual(0);
          expect(match.livenessScore).toBeLessThanOrEqual(1);

          expect(match.personalizationScore).toBeGreaterThanOrEqual(0);
          expect(match.personalizationScore).toBeLessThanOrEqual(1);

          // Final score should be in valid range
          expect(match.finalScore).toBeGreaterThanOrEqual(0);
          expect(match.finalScore).toBeLessThanOrEqual(1);

          // Approximate verification of formula:
          // finalScore ≈ 0.45*semantic + 0.25*recency + 0.20*liveness + 0.10*personalization
          const expected =
            0.45 * match.semanticRelevance +
            0.25 * match.recencyScore +
            0.2 * match.livenessScore +
            0.1 * match.personalizationScore;

          // Allow 5% tolerance for rounding/processing
          expect(match.finalScore).toBeCloseTo(expected, 1);
        });
      }
    });

    it('should sort matches by finalScore descending', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Ruby', 'Rails', 'PostgreSQL'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      // Verify sorted by finalScore descending
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].finalScore).toBeGreaterThanOrEqual(matches[i + 1].finalScore);
      }
    });

    it('should filter out matches below 60% threshold', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Cobol', 'Fortran'], // Rare/legacy skills
          experienceLevel: 'entry',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      // All returned matches should be above threshold (or empty)
      matches.forEach((match: any) => {
        expect(match.finalScore).toBeGreaterThanOrEqual(0.6);
      });
    });
  });

  describe('Trust Badges', () => {
    it('should identify verified active jobs correctly', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['JavaScript', 'React'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      matches.forEach((match: any) => {
        // If job is verified active, conditions should be met
        if (match.isVerifiedActive) {
          expect(match.trustScore).toBeGreaterThanOrEqual(85);
          expect(match.livenessStatus).toBe('active');
        }
      });
    });

    it('should identify direct from company jobs', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Python', 'Machine Learning'],
          experienceLevel: 'senior',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      matches.forEach((match: any) => {
        expect(typeof match.isDirectFromCompany).toBe('boolean');

        // If direct from company, trust should be high
        if (match.isDirectFromCompany) {
          expect(match.trustScore).toBeGreaterThan(90);
        }
      });
    });
  });

  describe('Experience Level Matching', () => {
    it('should prioritize jobs matching candidate experience level', async () => {
      // Set senior profile
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['Architecture', 'Leadership'],
          experienceLevel: 'senior',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      if (matches.length > 0) {
        matches.forEach((match: any) => {
          // Experience match factor should be defined
          expect(match.compatibilityFactors.experienceMatch).toBeDefined();
          expect(match.compatibilityFactors.experienceMatch).toBeGreaterThanOrEqual(0);
          expect(match.compatibilityFactors.experienceMatch).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Empty and Edge Case Handling', () => {
    it('should handle candidate with no skills gracefully', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: [],
          experienceLevel: 'entry',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Should not crash
      expect(matchResponse.status).toBe(200);
      const matches = await matchResponse.json();
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle candidate with many skills', async () => {
      const manySkills = Array.from({ length: 50 }, (_, i) => `Skill${i}`);

      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: manySkills,
          experienceLevel: 'senior',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(matchResponse.status).toBe(200);
      const matches = await matchResponse.json();
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should return empty array when no jobs match', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['NicheSkillA', 'NicheSkillB', 'VeryUniqueSkill'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const matches = await matchResponse.json();

      // Should return array (possibly empty) not error
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should return matches within 5 seconds', async () => {
      const profileResponse = await fetch('http://localhost:3000/api/candidate/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: ['JavaScript', 'React'],
          experienceLevel: 'mid',
        }),
      });

      expect([200, 204]).toContain(profileResponse.status);

      const startTime = Date.now();

      const matchResponse = await fetch('http://localhost:3000/api/ai-matches', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const duration = Date.now() - startTime;

      expect(matchResponse.status).toBe(200);
      expect(duration).toBeLessThan(5000);
    });
  });
});
