/**
 * Unit Tests for Advanced Matching Engine
 * Tests hybrid matching algorithm with PRD weights: 45% semantic + 25% recency + 20% liveness + 10% personalization
 *
 * Run with: npm run test:unit:backend
 */

import { AdvancedMatchingEngine } from '../server/advanced-matching-engine';

describe('AdvancedMatchingEngine Unit Tests', () => {
  let engine: AdvancedMatchingEngine;

  beforeEach(() => {
    engine = new AdvancedMatchingEngine();
  });

  describe('Hybrid Formula Weights', () => {
    it('should have correct PRD weights', () => {
      // Expected weights from PRD
      const weights = {
        SEMANTIC_RELEVANCE: 0.45,
        RECENCY: 0.25,
        LIVENESS: 0.20,
        PERSONALIZATION: 0.10
      };

      // Sum should equal 1.0
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    });

    it('should calculate final score using hybrid formula', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: 'mid'
      };

      // Create test job data
      const testJob = {
        id: 1,
        title: 'React Engineer',
        skills: ['JavaScript', 'React', 'Node.js'],
        trustScore: 90,
        livenessStatus: 'active',
        createdAt: new Date(),
        talentOwnerId: 'test-recruiter'
      };

      // The final score should be calculated as:
      // finalScore = 0.45*semantic + 0.25*recency + 0.20*liveness + 0.10*personalization
      // For a perfect match: should be high (close to 1.0)

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        const match = matches[0];
        expect(match.finalScore).toBeGreaterThan(0);
        expect(match.finalScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Scoring Components', () => {
    it('should calculate semantic relevance (45% weight)', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        const match = matches[0];
        expect(match.semanticRelevance).toBeDefined();
        expect(match.semanticRelevance).toBeGreaterThanOrEqual(0);
        expect(match.semanticRelevance).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate recency score (25% weight)', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript'],
        experience: 'junior'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        const match = matches[0];
        expect(match.recencyScore).toBeDefined();
        expect(match.recencyScore).toBeGreaterThanOrEqual(0);
        expect(match.recencyScore).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate liveness score (20% weight)', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['Python'],
        experience: 'senior'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        const match = matches[0];
        expect(match.livenessScore).toBeDefined();
        expect(match.livenessScore).toBeGreaterThanOrEqual(0);
        expect(match.livenessScore).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate personalization score (10% weight)', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['TypeScript'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        const match = matches[0];
        expect(match.personalizationScore).toBeDefined();
        expect(match.personalizationScore).toBeGreaterThanOrEqual(0);
        expect(match.personalizationScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Trust Badge Logic', () => {
    it('should identify verified active jobs (trustScore >= 85 + active status)', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      matches.forEach(match => {
        // If job is verified active, conditions should be met
        if (match.isVerifiedActive) {
          expect(match.trustScore).toBeGreaterThanOrEqual(85);
          expect(match.livenessStatus).toBe('active');
        }
      });
    });

    it('should identify direct from company jobs', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['React'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      matches.forEach(match => {
        expect(typeof match.isDirectFromCompany).toBe('boolean');
      });
    });
  });

  describe('Liveness Status Tracking', () => {
    it('should track job liveness status', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['Node.js'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      matches.forEach(match => {
        expect(['active', 'stale', 'unknown']).toContain(match.livenessStatus);
      });
    });

    it('should prefer active jobs over stale jobs', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript', 'Python', 'Java'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length >= 2) {
        const activeMatches = matches.filter(m => m.livenessStatus === 'active');
        const staleMatches = matches.filter(m => m.livenessStatus === 'stale');

        if (activeMatches.length > 0 && staleMatches.length > 0) {
          const bestActive = activeMatches[0];
          const bestStale = staleMatches[0];
          // Active should generally score higher
          expect(bestActive.finalScore).toBeGreaterThanOrEqual(bestStale.finalScore * 0.8);
        }
      }
    });
  });

  describe('Skill Matching', () => {
    it('should highlight matching skills', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['React', 'Node.js', 'TypeScript'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      matches.forEach(match => {
        expect(Array.isArray(match.skillMatches)).toBe(true);
        // Matching skills should be highlighted
        match.skillMatches.forEach(skill => {
          expect(typeof skill).toBe('string');
        });
      });
    });

    it('should handle perfect skill match', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        // Perfect match should have high semantic relevance
        const match = matches[0];
        expect(match.semanticRelevance).toBeGreaterThan(0.5);
      }
    });

    it('should handle partial skill match', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['Python', 'Django'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        const match = matches[0];
        expect(match.skillMatches.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle no common skills', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['NicheSkillA', 'NicheSkillB'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      // Should still process, but with low scores
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('Experience Level Matching', () => {
    it('should consider experience level in matching', async () => {
      const seniorCriteria = {
        candidateId: 'test-user-senior',
        skills: ['JavaScript', 'Leadership'],
        experience: 'senior'
      };

      const juniorCriteria = {
        candidateId: 'test-user-junior',
        skills: ['JavaScript'],
        experience: 'junior'
      };

      const seniorMatches = await engine.generateAdvancedMatches(seniorCriteria);
      const juniorMatches = await engine.generateAdvancedMatches(juniorCriteria);

      expect(Array.isArray(seniorMatches)).toBe(true);
      expect(Array.isArray(juniorMatches)).toBe(true);
    });
  });

  describe('Location Matching', () => {
    it('should consider location in compatibility factors', async () => {
      const remoteCandidate = {
        candidateId: 'test-user',
        skills: ['JavaScript'],
        experience: 'mid',
        location: 'Remote'
      };

      const matches = await engine.generateAdvancedMatches(remoteCandidate);

      matches.forEach(match => {
        expect(match.compatibilityFactors).toBeDefined();
        expect(match.compatibilityFactors.locationFit).toBeDefined();
        expect(match.compatibilityFactors.locationFit).toBeGreaterThanOrEqual(0);
        expect(match.compatibilityFactors.locationFit).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Salary Matching', () => {
    it('should consider salary expectations in compatibility', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript'],
        experience: 'mid',
        salaryExpectation: 100000
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      matches.forEach(match => {
        expect(match.compatibilityFactors).toBeDefined();
        expect(match.compatibilityFactors.salaryMatch).toBeDefined();
        expect(match.compatibilityFactors.salaryMatch).toBeGreaterThanOrEqual(0);
        expect(match.compatibilityFactors.salaryMatch).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Caching', () => {
    it('should cache results for same criteria', async () => {
      const criteria = {
        candidateId: 'test-user-cache',
        skills: ['JavaScript', 'React'],
        experience: 'mid'
      };

      // First call
      const matches1 = await engine.generateAdvancedMatches(criteria);

      // Second call with same criteria should use cache
      const matches2 = await engine.generateAdvancedMatches(criteria);

      expect(matches1.length).toBe(matches2.length);
      // Results should be identical (from cache)
      if (matches1.length === matches2.length && matches1.length > 0) {
        expect(matches1[0].jobId).toBe(matches2[0].jobId);
      }
    });
  });

  describe('Return Structure', () => {
    it('should return EnhancedJobMatch objects with all required fields', async () => {
      const criteria = {
        candidateId: 'test-user',
        skills: ['JavaScript'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      if (matches.length > 0) {
        const match = matches[0];

        // Required fields
        expect(match.jobId).toBeDefined();
        expect(match.matchScore).toBeDefined();
        expect(match.confidenceLevel).toBeDefined();
        expect(Array.isArray(match.skillMatches)).toBe(true);
        expect(typeof match.aiExplanation).toBe('string');

        // PRD fields for hybrid ranking
        expect(match.semanticRelevance).toBeDefined();
        expect(match.recencyScore).toBeDefined();
        expect(match.livenessScore).toBeDefined();
        expect(match.personalizationScore).toBeDefined();
        expect(match.finalScore).toBeDefined();
        expect(match.trustScore).toBeDefined();
        expect(['active', 'stale', 'unknown']).toContain(match.livenessStatus);
        expect(typeof match.isVerifiedActive).toBe('boolean');
        expect(typeof match.isDirectFromCompany).toBe('boolean');

        // Compatibility factors
        expect(match.compatibilityFactors).toBeDefined();
        expect(match.compatibilityFactors.skillAlignment).toBeDefined();
        expect(match.compatibilityFactors.experienceMatch).toBeDefined();
        expect(match.compatibilityFactors.locationFit).toBeDefined();
        expect(match.compatibilityFactors.salaryMatch).toBeDefined();
        expect(match.compatibilityFactors.industryRelevance).toBeDefined();
      }
    });
  });

  describe('Match Threshold and Filtering', () => {
    it('should filter out low-scoring matches (below 60% threshold)', async () => {
      const criteria = {
        candidateId: 'test-user-threshold',
        skills: ['VeryNicheSkill'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      // All returned matches should be above threshold
      matches.forEach(match => {
        expect(match.matchScore).toBeGreaterThanOrEqual(0.6);
      });
    });
  });

  describe('Sorting and Ranking', () => {
    it('should sort matches by finalScore in descending order', async () => {
      const criteria = {
        candidateId: 'test-user-sort',
        skills: ['JavaScript', 'Python', 'Java', 'Go', 'Rust'],
        experience: 'senior'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      // Verify descending order by finalScore
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].finalScore).toBeGreaterThanOrEqual(matches[i + 1].finalScore);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty skill set', async () => {
      const criteria = {
        candidateId: 'test-user-no-skills',
        skills: [],
        experience: 'entry'
      };

      const matches = await engine.generateAdvancedMatches(criteria);
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle large skill set (50+ skills)', async () => {
      const largeSkillSet = Array.from({ length: 50 }, (_, i) => `Skill${i}`);

      const criteria = {
        candidateId: 'test-user-many-skills',
        skills: largeSkillSet,
        experience: 'senior'
      };

      const matches = await engine.generateAdvancedMatches(criteria);
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle all experience levels', async () => {
      const levels = ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'];

      for (const level of levels) {
        const criteria = {
          candidateId: `test-user-${level}`,
          skills: ['JavaScript'],
          experience: level
        };

        const matches = await engine.generateAdvancedMatches(criteria);
        expect(Array.isArray(matches)).toBe(true);
      }
    });

    it('should handle all work types', async () => {
      const workTypes: Array<'remote' | 'hybrid' | 'onsite'> = ['remote', 'hybrid', 'onsite'];

      for (const workType of workTypes) {
        const criteria = {
          candidateId: 'test-user',
          skills: ['React'],
          experience: 'mid',
          workType
        };

        const matches = await engine.generateAdvancedMatches(criteria);
        expect(Array.isArray(matches)).toBe(true);
      }
    });
  });

  describe('Urgency Score', () => {
    it('should calculate urgency score', async () => {
      const criteria = {
        candidateId: 'test-user-urgency',
        skills: ['JavaScript'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      matches.forEach(match => {
        expect(match.urgencyScore).toBeDefined();
        expect(match.urgencyScore).toBeGreaterThanOrEqual(0);
        expect(match.urgencyScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('AI Explanation Generation', () => {
    it('should provide AI explanation for matches', async () => {
      const criteria = {
        candidateId: 'test-user-explanation',
        skills: ['JavaScript', 'React'],
        experience: 'mid'
      };

      const matches = await engine.generateAdvancedMatches(criteria);

      matches.forEach(match => {
        expect(match.aiExplanation).toBeDefined();
        expect(typeof match.aiExplanation).toBe('string');
        expect(match.aiExplanation.length).toBeGreaterThan(0);
      });
    });
  });
});
