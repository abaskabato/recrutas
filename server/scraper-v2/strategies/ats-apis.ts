/**
 * ATS API Integration
 * 
 * Fetches job data directly from Applicant Tracking System APIs.
 * This is the fastest and most reliable method when available.
 */

import { ScrapedJob, CompanyConfig, ATSType, JobLocation, SalaryInfo } from '../types.js';
import { logger } from '../utils/logger.js';

// ATS API Endpoints
const ATS_ENDPOINTS: Record<ATSType, (boardId: string) => string> = {
  greenhouse: (id) => `https://boards-api.greenhouse.io/v1/boards/${id}/jobs`,
  lever: (id) => `https://api.lever.co/v0/postings/${id}`,
  workday: (id) => `https://${id}.myworkdayjobs.com/wday/cbsi/${id}/jobs`,
  ashby: (id) => `https://api.ashbyhq.com/posting-api/job-board/${id}`,
  bamboohr: (id) => `https://${id}.bamboohr.com/careers`,
  smartrecruiters: (id) => `https://api.smartrecruiters.com/v1/companies/${id}/postings`,
  icims: (id) => `https://${id}.icims.com/jobs`,
  taleo: (id) => `https://${id}.taleo.net/careersection/rest/jobboard/searchjobs`,
  custom: (id) => id
};

/**
 * Fetch jobs from ATS API
 */
export async function fetchFromATS(company: CompanyConfig): Promise<ScrapedJob[]> {
  if (!company.ats?.type || !company.ats.boardId) {
    throw new Error('ATS configuration missing');
  }

  const atsType = company.ats.type;
  const boardId = company.ats.boardId;
  const endpoint = ATS_ENDPOINTS[atsType](boardId);

  logger.info(`Fetching jobs from ${atsType} API for ${company.name}`, {
    company: company.name,
    ats: atsType,
    endpoint
  });

  try {
    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'RecrutasJobBot/1.0 (https://recrutas.io)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ATS API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse based on ATS type
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
function parseATSResponse(atsType: ATSType, data: any, company: CompanyConfig): ScrapedJob[] {
  switch (atsType) {
    case 'greenhouse':
      return parseGreenhouseResponse(data, company);
    case 'lever':
      return parseLeverResponse(data, company);
    case 'workday':
      return parseWorkdayResponse(data, company);
    case 'ashby':
      return parseAshbyResponse(data, company);
    case 'smartrecruiters':
      return parseSmartRecruitersResponse(data, company);
    default:
      logger.warn(`Unknown ATS type: ${atsType}, attempting generic parsing`);
      return parseGenericResponse(data, company);
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
      const location: JobLocation = {
        raw: job.location?.name || 'Remote',
        city: job.location?.name?.split(',')[0],
        country: 'Unknown',
        countryCode: 'US',
        isRemote: job.location?.name?.toLowerCase().includes('remote') || false,
        normalized: (job.location?.name || 'remote').toLowerCase()
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
        workType: 'hybrid',
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
      const location: JobLocation = {
        raw: job.categories?.location || 'Remote',
        isRemote: job.categories?.location?.toLowerCase().includes('remote') || false,
        country: 'Unknown',
        countryCode: 'US',
        normalized: (job.categories?.location || 'remote').toLowerCase()
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
        workType: determineWorkType(job.categories?.location),
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
 * Parse Workday API response
 */
function parseWorkdayResponse(data: any, company: CompanyConfig): ScrapedJob[] {
  // Workday APIs vary, this is a generic parser
  const jobs: ScrapedJob[] = [];
  const jobListings = data.jobPostings || data.jobs || data.data?.jobs || [];

  for (const job of jobListings) {
    try {
      jobs.push({
        id: `workday_${company.ats?.boardId}_${job.id || job.bulletinId}`,
        title: job.title || job.jobTitle,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location: {
          raw: job.location?.city || job.primaryLocation || 'Remote',
          isRemote: false,
          country: 'Unknown',
          countryCode: 'US',
          normalized: 'unknown'
        },
        description: stripHtml(job.description || job.jobDescription || ''),
        requirements: [],
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: 'hybrid',
        employmentType: 'full-time',
        experienceLevel: 'mid',
        salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
        benefits: [],
        externalUrl: job.externalApplyUrl || job.applyUrl || company.careerPageUrl,
        source: {
          type: 'ats_api',
          company: company.name,
          url: company.careerPageUrl,
          ats: 'workday',
          scrapeMethod: 'api'
        },
        postedDate: new Date(job.postedDate || Date.now()),
        scrapedAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isRemote: false
      });
    } catch (error) {
      logger.warn(`Failed to parse Workday job for ${company.name}`, { error });
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
      jobs.push({
        id: `ashby_${company.ats?.boardId}_${job.id}`,
        title: job.title,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location: {
          raw: job.location || 'Remote',
          isRemote: job.location?.toLowerCase().includes('remote') || false,
          country: 'Unknown',
          countryCode: 'US',
          normalized: (job.location || 'remote').toLowerCase()
        },
        description: job.description || '',
        requirements: [],
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: 'hybrid',
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
      jobs.push({
        id: `smartrecruiters_${company.ats?.boardId}_${job.id}`,
        title: job.name,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location: {
          raw: job.location?.city ? `${job.location.city}, ${job.location.country}` : 'Remote',
          isRemote: job.location?.remote || false,
          country: job.location?.country || 'Unknown',
          countryCode: 'US',
          normalized: (job.location?.city || 'remote').toLowerCase()
        },
        description: job.jobDescription || '',
        requirements: [],
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: job.typeOfEmployment?.label?.toLowerCase().includes('remote') ? 'remote' : 'hybrid',
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

/**
 * Generic parser for unknown ATS formats
 */
function parseGenericResponse(data: any, company: CompanyConfig): ScrapedJob[] {
  logger.warn(`Using generic parser for ${company.name}`, { dataKeys: Object.keys(data) });
  
  // Try to find job arrays in common locations
  const jobsArray = data.jobs || data.postings || data.data || data.results || [];
  
  if (!Array.isArray(jobsArray)) {
    logger.error(`Could not find jobs array in response for ${company.name}`);
    return [];
  }

  return jobsArray.map((job: any, index: number) => ({
    id: `generic_${company.id}_${index}`,
    title: job.title || job.name || job.position || 'Unknown',
    normalizedTitle: '',
    company: company.name,
    companyId: company.id,
    location: {
      raw: job.location || 'Remote',
      isRemote: false,
      country: 'Unknown',
      countryCode: 'US',
      normalized: 'unknown'
    },
    description: job.description || '',
    requirements: [],
    responsibilities: [],
    skills: [],
    skillCategories: [],
    workType: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'mid',
    salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
    benefits: [],
    externalUrl: job.url || job.applyUrl || company.careerPageUrl,
    source: {
      type: 'ats_api',
      company: company.name,
      url: company.careerPageUrl,
      ats: company.ats?.type || 'custom',
      scrapeMethod: 'api'
    },
    postedDate: new Date(),
    scrapedAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    isRemote: false
  }));
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
  
  // Look for common requirement patterns
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
  const lower = location.toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'hybrid';
}
