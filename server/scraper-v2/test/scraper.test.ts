/**
 * SOTA Scraper Tests
 * 
 * Unit and integration tests for the SOTA scraper components
 */

import { describe, it, expect, vi } from 'vitest';
import { SOTAScraperService, convertToIngestionFormat } from '../../services/sota-scraper.service.js';
import { ScraperOrchestrator } from '../index.js';
import { ScrapedJob } from '../types.js';

describe('SOTA Scraper Integration', () => {
  
  describe('Service Initialization', () => {
    it('should initialize with all configured companies', () => {
      const service = new SOTAScraperService();
      const companies = service.getCompanies();
      expect(companies.length).toBeGreaterThan(0);
      expect(companies[0]).toHaveProperty('id');
      expect(companies[0]).toHaveProperty('name');
      expect(companies[0]).toHaveProperty('priority');
    });

    it('should have companies with valid priorities', () => {
      const service = new SOTAScraperService();
      const companies = service.getCompanies();
      const validPriorities = ['high', 'medium', 'low'];

      companies.forEach(company => {
        expect(validPriorities).toContain(company.priority);
      });
    });
  });

  describe('Job Conversion', () => {
    const mockScrapedJob: ScrapedJob = {
      id: 'test-123',
      title: 'Senior Software Engineer',
      normalizedTitle: 'senior software engineer',
      company: 'Test Corp',
      companyId: 'test-corp',
      location: {
        raw: 'San Francisco, CA',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
        countryCode: 'US',
        isRemote: false,
        normalized: 'san francisco, ca, united states'
      },
      description: 'Build amazing software',
      requirements: [
        { type: 'experience', description: '5+ years', isRequired: true },
        { type: 'skill', description: 'React proficiency', isRequired: true }
      ],
      responsibilities: ['Write code', 'Review PRs'],
      skills: ['React', 'TypeScript', 'Node.js'],
      skillCategories: [
        { category: 'frontend', skills: ['React', 'TypeScript'] }
      ],
      workType: 'hybrid',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      salary: {
        min: 150000,
        max: 200000,
        currency: 'USD',
        period: 'yearly',
        isDisclosed: true
      },
      benefits: ['Health insurance', '401k'],
      externalUrl: 'https://testcorp.com/jobs/123',
      source: {
        type: 'career_page',
        company: 'Test Corp',
        url: 'https://testcorp.com/careers',
        scrapeMethod: 'api'
      },
      postedDate: new Date('2024-01-15'),
      scrapedAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      isRemote: false
    };

    it('should convert ScrapedJob to ExternalJobInput format', () => {
      const ingestionJob = convertToIngestionFormat(mockScrapedJob);
      
      expect(ingestionJob).toHaveProperty('title', 'Senior Software Engineer');
      expect(ingestionJob).toHaveProperty('company', 'Test Corp');
      expect(ingestionJob).toHaveProperty('location', 'San Francisco, CA');
      expect(ingestionJob).toHaveProperty('description', 'Build amazing software');
      expect(ingestionJob).toHaveProperty('externalId', 'test-123');
      expect(ingestionJob).toHaveProperty('externalUrl', 'https://testcorp.com/jobs/123');
      expect(ingestionJob).toHaveProperty('workType', 'hybrid');
      expect(ingestionJob).toHaveProperty('source');
      expect(ingestionJob).toHaveProperty('postedDate');
    });

    it('should extract requirements as strings', () => {
      const ingestionJob = convertToIngestionFormat(mockScrapedJob);
      
      expect(ingestionJob.requirements).toContain('5+ years');
      expect(ingestionJob.requirements).toContain('React proficiency');
      expect(ingestionJob.requirements).toHaveLength(2);
    });

    it('should handle missing optional fields', () => {
      const incompleteJob: ScrapedJob = {
        ...mockScrapedJob,
        requirements: [],
        skills: [],
        salary: undefined
      };
      
      const ingestionJob = convertToIngestionFormat(incompleteJob);
      
      expect(ingestionJob.requirements).toEqual([]);
      expect(ingestionJob.skills).toEqual([]);
      expect(ingestionJob.salaryMin).toBeUndefined();
      expect(ingestionJob.salaryMax).toBeUndefined();
    });
  });

  describe('Company Scraping (Integration)', () => {
    it('should scrape Stripe (Greenhouse API)', async () => {
      const service = new SOTAScraperService();
      const result = await service.scrapeCompany('stripe');

      expect(result.success).toBe(true);
      expect(result.companiesScraped).toBe(1);
      expect(result.errors).toHaveLength(0);

      expect(result.totalJobsFound).toBeGreaterThan(0);
    }, 30000);

    it('should handle non-existent company', async () => {
      const service = new SOTAScraperService();
      await expect(
        service.scrapeCompany('non-existent-company')
      ).rejects.toThrow('Company non-existent-company not found');
    });
  });

  describe('Error Handling', () => {
    it('should return error details in result', async () => {
      const mockError = new Error('Network error');
      vi.spyOn(ScraperOrchestrator.prototype, 'scrapeCompanies').mockRejectedValueOnce(mockError);

      const service = new SOTAScraperService();
      const result = await service.scrapeCompany('stripe');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Network error');

      vi.restoreAllMocks();
    });
  });

  describe('Cron Job Handler', () => {
    it('should verify cron secret when configured', async () => {
      process.env.CRON_SECRET = 'test-secret';
      
      const { default: handler } = await import('../api/cron/scrape-external-jobs.js');
      
      const mockReq = {
        headers: {},
        method: 'GET'
      };
      
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      
      await handler(mockReq as any, mockRes as any);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized'
      }));
      
      delete process.env.CRON_SECRET;
    });
  });
});

// Run with: npm test -- server/scraper-v2/test/scraper.test.ts
