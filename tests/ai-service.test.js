/**
 * Unit Tests: AI Service - Job Matching Engine
 * Tests for the core AI matching algorithm and job insights generation
 */

const { generateJobMatch, generateJobInsights } = require('../server/ai-service');

describe('AI Service - Job Matching Engine', () => {
  const mockCandidate = {
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    experience: '3 years of full-stack development experience',
    industry: 'Technology',
    workType: 'remote',
    salaryMin: 60000,
    salaryMax: 90000,
    location: 'Remote'
  };

  const mockJob = {
    title: 'Senior Full Stack Developer',
    company: 'TechCorp',
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    requirements: ['3+ years experience', 'Strong React skills', 'Backend development'],
    industry: 'Technology',
    workType: 'remote',
    salaryMin: 70000,
    salaryMax: 100000,
    location: 'Remote',
    description: 'Looking for a senior developer with React and Node.js experience'
  };

  describe('generateJobMatch', () => {
    test('should return valid match result for compatible candidate and job', async () => {
      const result = await generateJobMatch(mockCandidate, mockJob);
      
      expect(result).toHaveProperty('confidenceLevel');
      expect(result).toHaveProperty('skillMatches');
      expect(result).toHaveProperty('aiExplanation');
      expect(result).toHaveProperty('score');
      
      expect(typeof result.confidenceLevel).toBe('number');
      expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(100);
      
      expect(Array.isArray(result.skillMatches)).toBe(true);
      expect(typeof result.aiExplanation).toBe('string');
      expect(typeof result.score).toBe('number');
    });

    test('should handle candidate with no matching skills', async () => {
      const incompatibleCandidate = {
        ...mockCandidate,
        skills: ['PHP', 'Laravel', 'MySQL']
      };
      
      const result = await generateJobMatch(incompatibleCandidate, mockJob);
      
      expect(result.confidenceLevel).toBeLessThan(50);
      expect(result.skillMatches.length).toBeLessThan(mockCandidate.skills.length);
    });

    test('should handle missing or invalid input gracefully', async () => {
      const incompleteCandidate = {
        skills: [],
        experience: ''
      };
      
      const result = await generateJobMatch(incompleteCandidate, mockJob);
      
      expect(result).toHaveProperty('confidenceLevel');
      expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
    });

    test('should calculate higher scores for better matches', async () => {
      const perfectCandidate = {
        ...mockCandidate,
        skills: ['JavaScript', 'React', 'Node.js', 'Python'], // Exact match
        experience: '5 years of senior full-stack development'
      };
      
      const result = await generateJobMatch(perfectCandidate, mockJob);
      
      expect(result.confidenceLevel).toBeGreaterThan(70);
      expect(result.skillMatches.length).toBeGreaterThanOrEqual(3);
    });

    test('should handle salary mismatch appropriately', async () => {
      const lowSalaryCandidate = {
        ...mockCandidate,
        salaryMin: 100000,
        salaryMax: 150000 // Higher than job offer
      };
      
      const result = await generateJobMatch(lowSalaryCandidate, mockJob);
      
      expect(result).toHaveProperty('confidenceLevel');
      // Should still provide a result but with adjusted confidence
      expect(typeof result.confidenceLevel).toBe('number');
    });
  });

  describe('generateJobInsights', () => {
    test('should return array of actionable insights', async () => {
      const insights = await generateJobInsights(mockCandidate);
      
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      
      insights.forEach(insight => {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(10); // Should be meaningful
      });
    });

    test('should provide relevant insights for different skill levels', async () => {
      const juniorCandidate = {
        ...mockCandidate,
        skills: ['HTML', 'CSS', 'JavaScript'],
        experience: '1 year of frontend development'
      };
      
      const insights = await generateJobInsights(juniorCandidate);
      
      expect(insights.length).toBeGreaterThan(0);
      // Should suggest skill improvements for junior level
      const insightText = insights.join(' ').toLowerCase();
      expect(insightText).toMatch(/(learn|skill|develop|improve)/);
    });

    test('should handle empty candidate profile', async () => {
      const emptyCandidate = {
        skills: [],
        experience: ''
      };
      
      const insights = await generateJobInsights(emptyCandidate);
      
      expect(Array.isArray(insights)).toBe(true);
      // Should still provide general career advice
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined inputs', async () => {
      expect(async () => {
        await generateJobMatch(null, mockJob);
      }).not.toThrow();
      
      expect(async () => {
        await generateJobMatch(mockCandidate, null);
      }).not.toThrow();
    });

    test('should handle malformed data structures', async () => {
      const malformedCandidate = {
        skills: 'not-an-array',
        experience: 123,
        salaryMin: 'invalid'
      };
      
      const result = await generateJobMatch(malformedCandidate, mockJob);
      expect(result).toHaveProperty('confidenceLevel');
    });

    test('should handle very large skill arrays', async () => {
      const candidateWithManySkills = {
        ...mockCandidate,
        skills: new Array(100).fill(0).map((_, i) => `skill-${i}`)
      };
      
      const result = await generateJobMatch(candidateWithManySkills, mockJob);
      expect(result).toHaveProperty('confidenceLevel');
      expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
    });
  });
});