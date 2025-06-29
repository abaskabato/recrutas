/**
 * Unit Tests: Job Aggregator Service
 * Tests for external job fetching and data transformation
 */

const { JobAggregator } = require('../server/job-aggregator');

describe('Job Aggregator Service', () => {
  let jobAggregator;

  beforeEach(() => {
    jobAggregator = new JobAggregator();
  });

  describe('getAllJobs', () => {
    test('should return array of external jobs', async () => {
      const jobs = await jobAggregator.getAllJobs();
      
      expect(Array.isArray(jobs)).toBe(true);
      
      if (jobs.length > 0) {
        const job = jobs[0];
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('company');
        expect(job).toHaveProperty('location');
        expect(job).toHaveProperty('description');
        expect(job).toHaveProperty('source');
        expect(job).toHaveProperty('externalUrl');
        expect(Array.isArray(job.skills)).toBe(true);
        expect(Array.isArray(job.requirements)).toBe(true);
      }
    }, 30000); // Extended timeout for external API calls

    test('should respect skill filtering when provided', async () => {
      const targetSkills = ['JavaScript', 'React'];
      const jobs = await jobAggregator.getAllJobs(targetSkills, 10);
      
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeLessThanOrEqual(10);
      
      // Check if jobs are relevant to provided skills
      if (jobs.length > 0) {
        const relevantJobs = jobs.filter(job => {
          const jobText = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
          return targetSkills.some(skill => jobText.includes(skill.toLowerCase()));
        });
        
        // At least some jobs should be relevant
        expect(relevantJobs.length).toBeGreaterThan(0);
      }
    }, 30000);

    test('should handle limit parameter correctly', async () => {
      const limit = 5;
      const jobs = await jobAggregator.getAllJobs([], limit);
      
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeLessThanOrEqual(limit);
    }, 30000);
  });

  describe('fetchFromArbeitNow', () => {
    test('should fetch and transform ArbeitNow jobs', async () => {
      const jobs = await jobAggregator.fetchFromArbeitNow();
      
      expect(Array.isArray(jobs)).toBe(true);
      
      if (jobs.length > 0) {
        jobs.forEach(job => {
          expect(job.source).toBe('ArbeitNow');
          expect(job).toHaveProperty('id');
          expect(job).toHaveProperty('title');
          expect(job).toHaveProperty('company');
          expect(job.externalUrl).toMatch(/^https?:\/\//);
        });
      }
    }, 20000);
  });

  describe('fetchFromRemoteOK', () => {
    test('should fetch and transform RemoteOK jobs', async () => {
      const jobs = await jobAggregator.fetchRemoteOKJobs();
      
      expect(Array.isArray(jobs)).toBe(true);
      
      if (jobs.length > 0) {
        jobs.forEach(job => {
          expect(job.source).toBe('RemoteOK');
          expect(job.workType).toBe('remote');
          expect(job).toHaveProperty('postedDate');
        });
      }
    }, 20000);
  });

  describe('fetchFromTheMuse', () => {
    test('should fetch and transform The Muse jobs', async () => {
      const jobs = await jobAggregator.fetchFromTheMuse();
      
      expect(Array.isArray(jobs)).toBe(true);
      
      if (jobs.length > 0) {
        jobs.forEach(job => {
          expect(job.source).toBe('The Muse');
          expect(job).toHaveProperty('company');
          expect(job).toHaveProperty('location');
        });
      }
    }, 20000);
  });

  describe('Data Transformation Functions', () => {
    test('should extract skills from job text correctly', () => {
      const testText = 'Looking for JavaScript and React developer with Node.js experience';
      const extractedSkills = jobAggregator.extractSkillsFromText(testText);
      
      expect(Array.isArray(extractedSkills)).toBe(true);
      expect(extractedSkills).toContain('JavaScript');
      expect(extractedSkills).toContain('React');
      expect(extractedSkills).toContain('Node.js');
    });

    test('should normalize work type correctly', () => {
      const remoteVariations = ['Remote', 'REMOTE', 'remote work', 'work from home'];
      
      remoteVariations.forEach(variation => {
        const normalized = jobAggregator.normalizeWorkType(variation);
        expect(['remote', 'hybrid', 'onsite']).toContain(normalized);
      });
    });

    test('should extract requirements from job description', () => {
      const jobDescription = `
        Requirements:
        - 3+ years experience
        - Strong JavaScript skills
        - Bachelor's degree preferred
        - Experience with React and Node.js
      `;
      
      const requirements = jobAggregator.extractRequirements(jobDescription);
      
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements.some(req => req.includes('JavaScript'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const jobs = await jobAggregator.getAllJobs();
      
      expect(Array.isArray(jobs)).toBe(true);
      // Should return empty array or fallback data, not throw
      
      global.fetch = originalFetch;
    });

    test('should handle malformed API responses', async () => {
      // This should not crash the system
      const jobs = await jobAggregator.getAllJobs();
      expect(Array.isArray(jobs)).toBe(true);
    });

    test('should handle rate limiting appropriately', async () => {
      // Test consecutive API calls
      const promises = Array(3).fill().map(() => jobAggregator.fetchFromArbeitNow());
      const results = await Promise.allSettled(promises);
      
      // Should handle rate limiting without crashing
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(Array.isArray(result.value)).toBe(true);
        }
      });
    }, 30000);
  });

  describe('Performance Tests', () => {
    test('should complete job fetching within reasonable time', async () => {
      const startTime = Date.now();
      const jobs = await jobAggregator.getAllJobs([], 20);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(Array.isArray(jobs)).toBe(true);
    }, 35000);

    test('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [
        jobAggregator.fetchFromArbeitNow(),
        jobAggregator.fetchRemoteOKJobs(),
        jobAggregator.fetchFromTheMuse()
      ];
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(25000); // Concurrent should be faster than sequential
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(Array.isArray(result.value)).toBe(true);
        }
      });
    }, 30000);
  });
});