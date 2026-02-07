/**
 * ATS API Integration
 *
 * Fetches job data directly from Applicant Tracking System APIs.
 * This is the fastest and most reliable method when available.
 */

import { ScrapedJob, CompanyConfig, ATSType, JobLocation, SalaryInfo } from '../types.js';
import { logger } from '../utils/logger.js';

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB

// ATS API Endpoints (only APIs with known working formats)
const ATS_ENDPOINTS: Record<string, (boardId: string) => string> = {
  greenhouse: (id) => `https://boards-api.greenhouse.io/v1/boards/${id}/jobs`,
  lever: (id) => `https://api.lever.co/v0/postings/${id}`,
  ashby: (id) => `https://api.ashbyhq.com/posting-api/job-board/${id}`,
  smartrecruiters: (id) => `https://api.smartrecruiters.com/v1/companies/${id}/postings`,
};

/**
 * Fetch jobs from ATS API
 */
export async function fetchFromATS(company: CompanyConfig, fetchOptions?: RequestInit): Promise<ScrapedJob[]> {
  if (!company.ats?.type || !company.ats.boardId) {
    throw new Error('ATS configuration missing');
  }

  const atsType = company.ats.type;
  const boardId = company.ats.boardId;
  const endpointFn = ATS_ENDPOINTS[atsType];

  if (!endpointFn) {
    throw new Error(`Unsupported ATS type: ${atsType}`);
  }

  const endpoint = endpointFn(boardId);

  logger.info(`Fetching jobs from ${atsType} API for ${company.name}`, {
    company: company.name,
    ats: atsType,
    endpoint
  });

  try {
    const response = await fetch(endpoint, {
      ...fetchOptions,
      headers: {
        ...((fetchOptions?.headers as Record<string, string>) || {}),
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`ATS API returned ${response.status}: ${response.statusText}`);
    }

    // Check Content-Length before reading body
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error(`Response too large: ${contentLength} bytes`);
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_SIZE) {
      throw new Error(`Response body too large: ${text.length} chars`);
    }

    const data = JSON.parse(text);

    const jobs = parseATSResponse(atsType, data, company);

    logger.info(`Successfully fetched ${jobs.length} jobs from ${atsType} for ${company.name}`);
    return jobs;

  } catch (error) {
    logger.error(`ATS API fetch failed for ${company.name}`, {
      ats: atsType,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Parse ATS-specific response formats
 */
function parseATSResponse(atsType: string, data: any, company: CompanyConfig): ScrapedJob[] {
  switch (atsType) {
    case 'greenhouse':
      return parseGreenhouseResponse(data, company);
    case 'lever':
      return parseLeverResponse(data, company);
    case 'ashby':
      return parseAshbyResponse(data, company);
    case 'smartrecruiters':
      return parseSmartRecruitersResponse(data, company);
    default:
      logger.warn(`Unknown ATS type: ${atsType}`);
      return [];
  }
}

/**
 * Parse Greenhouse API response
 */
function parseGreenhouseResponse(data: any, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const jobListings = data.jobs || [];

  for (const job of jobListings) {
    try {
      const locationRaw = job.location?.name || 'Remote';
      const location: JobLocation = {
        raw: locationRaw,
        city: job.location?.name?.split(',')[0],
        country: '',
        countryCode: '',
        isRemote: locationRaw.toLowerCase().includes('remote'),
        normalized: locationRaw.toLowerCase()
      };

      jobs.push({
        id: `greenhouse_${company.ats?.boardId}_${job.id}`,
        title: job.title,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location,
        description: stripHtml(job.content || ''),
        descriptionHtml: job.content,
        requirements: extractRequirementsFromHtml(job.content),
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: determineWorkType(locationRaw),
        employmentType: 'full-time',
        experienceLevel: 'mid',
        salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
        benefits: [],
        externalUrl: job.absolute_url,
        source: {
          type: 'ats_api',
          company: company.name,
          url: company.careerPageUrl,
          ats: 'greenhouse',
          scrapeMethod: 'api'
        },
        postedDate: new Date(job.updated_at || job.created_at || Date.now()),
        scrapedAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isRemote: location.isRemote
      });
    } catch (error) {
      logger.warn(`Failed to parse Greenhouse job for ${company.name}`, { error });
    }
  }

  return jobs;
}

/**
 * Parse Lever API response
 */
function parseLeverResponse(data: any, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const jobListings = Array.isArray(data) ? data : [];

  for (const job of jobListings) {
    try {
      const locationRaw = job.categories?.location || 'Remote';
      const location: JobLocation = {
        raw: locationRaw,
        isRemote: locationRaw.toLowerCase().includes('remote'),
        country: '',
        countryCode: '',
        normalized: locationRaw.toLowerCase()
      };

      jobs.push({
        id: `lever_${company.ats?.boardId}_${job.id}`,
        title: job.text,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location,
        description: job.descriptionPlain || stripHtml(job.description || ''),
        descriptionHtml: job.description,
        requirements: extractRequirementsFromHtml(job.descriptionPlain || ''),
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: determineWorkType(locationRaw),
        employmentType: job.categories?.commitment || 'full-time',
        experienceLevel: 'mid',
        salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
        benefits: [],
        externalUrl: job.hostedUrl || job.applyUrl,
        source: {
          type: 'ats_api',
          company: company.name,
          url: company.careerPageUrl,
          ats: 'lever',
          scrapeMethod: 'api'
        },
        postedDate: new Date(job.createdAt || Date.now()),
        scrapedAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isRemote: location.isRemote
      });
    } catch (error) {
      logger.warn(`Failed to parse Lever job for ${company.name}`, { error });
    }
  }

  return jobs;
}

/**
 * Parse Ashby API response
 */
function parseAshbyResponse(data: any, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const jobListings = data.jobs || [];

  for (const job of jobListings) {
    try {
      const locationRaw = job.location || 'Remote';
      jobs.push({
        id: `ashby_${company.ats?.boardId}_${job.id}`,
        title: job.title,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location: {
          raw: locationRaw,
          isRemote: locationRaw.toLowerCase().includes('remote'),
          country: '',
          countryCode: '',
          normalized: locationRaw.toLowerCase()
        },
        description: job.description || '',
        requirements: [],
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: determineWorkType(locationRaw),
        employmentType: job.employmentType || 'full-time',
        experienceLevel: 'mid',
        salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
        benefits: [],
        externalUrl: job.applyUrl || company.careerPageUrl,
        source: {
          type: 'ats_api',
          company: company.name,
          url: company.careerPageUrl,
          ats: 'ashby',
          scrapeMethod: 'api'
        },
        postedDate: new Date(job.createdAt || Date.now()),
        scrapedAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isRemote: job.isRemote || false
      });
    } catch (error) {
      logger.warn(`Failed to parse Ashby job for ${company.name}`, { error });
    }
  }

  return jobs;
}

/**
 * Parse SmartRecruiters API response
 */
function parseSmartRecruitersResponse(data: any, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const jobListings = data.content || [];

  for (const job of jobListings) {
    try {
      const locationRaw = job.location?.city ? `${job.location.city}, ${job.location.country}` : 'Remote';
      jobs.push({
        id: `smartrecruiters_${company.ats?.boardId}_${job.id}`,
        title: job.name,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location: {
          raw: locationRaw,
          isRemote: job.location?.remote || false,
          country: job.location?.country || '',
          countryCode: '',
          normalized: locationRaw.toLowerCase()
        },
        description: job.jobDescription || '',
        requirements: [],
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: determineWorkType(locationRaw),
        employmentType: 'full-time',
        experienceLevel: 'mid',
        salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
        benefits: [],
        externalUrl: job.applyUrl || company.careerPageUrl,
        source: {
          type: 'ats_api',
          company: company.name,
          url: company.careerPageUrl,
          ats: 'smartrecruiters',
          scrapeMethod: 'api'
        },
        postedDate: new Date(job.releasedDate || Date.now()),
        scrapedAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isRemote: job.location?.remote || false
      });
    } catch (error) {
      logger.warn(`Failed to parse SmartRecruiters job for ${company.name}`, { error });
    }
  }

  return jobs;
}

// Helper functions
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRequirementsFromHtml(html: string): any[] {
  const requirements: any[] = [];
  const text = stripHtml(html).toLowerCase();

  const patterns = [
    { type: 'experience', regex: /(\d+\+?\s*years?\s+of\s+experience)/gi },
    { type: 'education', regex: /(bachelor|master|phd|degree)/gi },
    { type: 'skill', regex: /(proficiency|experience)\s+with/gi }
  ];

  for (const { type, regex } of patterns) {
    const matches = text.match(regex);
    if (matches) {
      requirements.push({
        type,
        description: matches[0],
        isRequired: true
      });
    }
  }

  return requirements;
}

function determineWorkType(location: string): 'remote' | 'onsite' | 'hybrid' {
  if (!location) return 'hybrid';
  const lower = location.toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'hybrid';
}
