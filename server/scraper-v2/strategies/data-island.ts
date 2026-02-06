/**
 * Data Island Extraction
 * 
 * Extracts job data from React/Vue/Angular data islands embedded in HTML.
 * Modern SPAs often serialize data as JSON in the page.
 */

import { ScrapedJob, CompanyConfig, JobLocation } from '../types.js';
import { logger } from '../utils/logger.js';

// Common patterns for job data in JavaScript
const DATA_ISLAND_PATTERNS = [
  // React/Vue data attributes
  /"jobs":\s*(\[.*?\])(?=\s*[,}])/s,
  /"positions":\s*(\[.*?\])(?=\s*[,}])/s,
  /"openings":\s*(\[.*?\])(?=\s*[,}])/s,
  /"listings":\s*(\[.*?\])(?=\s*[,}])/s,
  /"careers":\s*(\[.*?\])(?=\s*[,}])/s,
  /"vacancies":\s*(\[.*?\])(?=\s*[,}])/s,
  /"opportunities":\s*(\[.*?\])(?=\s*[,}])/s,
  
  // Window object assignments
  /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
  /window\.__DATA__\s*=\s*({.*?});/s,
  /window\.__JOBS__\s*=\s*({.*?});/s,
  /window\.__APP_STATE__\s*=\s*({.*?});/s,
  
  // ID assignments
  /var\s+jobs\s*=\s*(\[.*?\]);/s,
  /const\s+jobs\s*=\s*(\[.*?\]);/s,
  /let\s+jobs\s*=\s*(\[.*?\]);/s,
];

/**
 * Extract jobs from data islands in HTML
 */
export async function extractDataIslandJobs(
  company: CompanyConfig,
  fetchOptions: RequestInit
): Promise<ScrapedJob[]> {
  try {
    const response = await fetch(company.careerPageUrl, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const jobs: ScrapedJob[] = [];
    
    logger.info(`Searching for data islands in ${company.name}`);
    
    // Try each pattern
    for (const pattern of DATA_ISLAND_PATTERNS) {
      const matches = Array.from(html.matchAll(pattern));
      
      for (const match of matches) {
        try {
          const jsonContent = match[1];
          const data = JSON.parse(jsonContent);
          
          // Extract jobs from the parsed data
          const extractedJobs = extractJobsFromData(data, company);
          
          if (extractedJobs.length > 0) {
            logger.info(`Found ${extractedJobs.length} jobs via data island pattern`);
            jobs.push(...extractedJobs);
          }
        } catch (parseError) {
          // Silent fail - try next pattern
          continue;
        }
      }
      
      // If we found jobs, stop searching
      if (jobs.length > 0) break;
    }
    
    logger.info(`Extracted ${jobs.length} jobs from data islands for ${company.name}`);
    return jobs;
    
  } catch (error) {
    logger.error(`Data island extraction failed for ${company.name}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Recursively extract job objects from data structure
 */
function extractJobsFromData(data: any, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  
  if (!data) return jobs;
  
  // If it's an array, check each item
  if (Array.isArray(data)) {
    for (const item of data) {
      if (isJobObject(item)) {
        const job = convertToScrapedJob(item, company);
        if (job) jobs.push(job);
      } else {
        // Recursively search nested objects
        jobs.push(...extractJobsFromData(item, company));
      }
    }
  }
  // If it's an object, search its values
  else if (typeof data === 'object') {
    // Check if this object itself is a job
    if (isJobObject(data)) {
      const job = convertToScrapedJob(data, company);
      if (job) jobs.push(job);
    }
    
    // Search common job container keys
    const jobKeys = ['jobs', 'positions', 'openings', 'listings', 'careers', 'results', 'data', 'items'];
    for (const key of jobKeys) {
      if (data[key] && Array.isArray(data[key])) {
        for (const item of data[key]) {
          if (isJobObject(item)) {
            const job = convertToScrapedJob(item, company);
            if (job) jobs.push(job);
          }
        }
      }
    }
    
    // Recursively search all values
    for (const value of Object.values(data)) {
      if (Array.isArray(value) || typeof value === 'object') {
        jobs.push(...extractJobsFromData(value, company));
      }
    }
  }
  
  return jobs;
}

/**
 * Check if an object looks like a job posting
 */
function isJobObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  // Must have a title-like field
  const titleFields = ['title', 'name', 'position', 'role', 'jobTitle', 'job_title', 'displayName'];
  const hasTitle = titleFields.some(field => obj[field] && typeof obj[field] === 'string');
  
  if (!hasTitle) return false;
  
  // Should have some job-related fields
  const jobFields = [
    'description', 'location', 'department', 'team', 
    'requirements', 'responsibilities', 'url', 'applyUrl',
    'externalUrl', 'postedDate', 'createdAt', 'id'
  ];
  
  const hasJobField = jobFields.some(field => obj[field] !== undefined);
  
  return hasJobField;
}

/**
 * Convert a data object to ScrapedJob format
 */
function convertToScrapedJob(data: any, company: CompanyConfig): ScrapedJob | null {
  try {
    // Extract title
    const title = data.title || data.name || data.position || data.role || data.jobTitle || 'Unknown';
    
    // Extract location
    let location: JobLocation;
    const rawLocation = data.location || data.city || data.office || data.workplace || 'Remote';
    
    if (typeof rawLocation === 'string') {
      location = {
        raw: rawLocation,
        isRemote: rawLocation.toLowerCase().includes('remote'),
        country: 'Unknown',
        countryCode: 'US',
        normalized: rawLocation.toLowerCase()
      };
    } else if (typeof rawLocation === 'object') {
      location = {
        raw: rawLocation.name || rawLocation.city || 'Remote',
        city: rawLocation.city,
        state: rawLocation.state || rawLocation.region,
        country: rawLocation.country || 'Unknown',
        countryCode: 'US',
        isRemote: (rawLocation.name || rawLocation.city || '').toLowerCase().includes('remote'),
        normalized: (rawLocation.name || rawLocation.city || 'remote').toLowerCase()
      };
    } else {
      location = {
        raw: 'Remote',
        isRemote: true,
        country: 'Unknown',
        countryCode: 'US',
        normalized: 'remote'
      };
    }
    
    // Extract description
    const description = data.description || data.summary || data.overview || data.about || '';
    
    // Extract URL
    const externalUrl = data.url || data.applyUrl || data.externalUrl || data.link || data.absolute_url || company.careerPageUrl;
    
    // Extract requirements
    const requirements: any[] = [];
    if (data.requirements) {
      if (Array.isArray(data.requirements)) {
        requirements.push(...data.requirements.map((r: string) => ({
          type: 'other',
          description: r,
          isRequired: true
        })));
      } else if (typeof data.requirements === 'string') {
        requirements.push({
          type: 'other',
          description: data.requirements,
          isRequired: true
        });
      }
    }
    
    // Extract skills
    const skills: string[] = [];
    if (data.skills) {
      if (Array.isArray(data.skills)) {
        skills.push(...data.skills);
      } else if (typeof data.skills === 'string') {
        skills.push(...data.skills.split(/[,;]+/).map((s: string) => s.trim()));
      }
    }
    
    // Extract posted date
    const postedDate = data.postedDate || data.createdAt || data.datePosted || data.published || Date.now();
    
    return {
      id: `island_${company.id}_${data.id || Date.now()}`,
      title,
      normalizedTitle: '',
      company: company.name,
      companyId: company.id,
      location,
      description,
      descriptionHtml: data.descriptionHtml || data.htmlDescription,
      requirements,
      responsibilities: data.responsibilities || [],
      skills,
      skillCategories: [],
      workType: data.workType || data.workplaceType || 'hybrid',
      employmentType: data.employmentType || data.type || 'full-time',
      experienceLevel: data.experienceLevel || 'mid',
      salary: data.salary ? {
        min: data.salary.min || data.salary.minimum,
        max: data.salary.max || data.salary.maximum,
        currency: data.salary.currency || 'USD',
        period: data.salary.period || 'yearly',
        isDisclosed: !!(data.salary.min || data.salary.max)
      } : {
        currency: 'USD',
        period: 'yearly',
        isDisclosed: false
      },
      benefits: data.benefits || [],
      externalUrl,
      source: {
        type: 'career_page',
        company: company.name,
        url: company.careerPageUrl,
        scrapeMethod: 'data_island'
      },
      postedDate: new Date(postedDate),
      scrapedAt: new Date(),
      updatedAt: new Date(),
      status: data.status || 'active',
      isRemote: location.isRemote,
      department: data.department || data.team,
      team: data.team
    };
    
  } catch (error) {
    logger.warn(`Failed to convert data island to job`, { error });
    return null;
  }
}
