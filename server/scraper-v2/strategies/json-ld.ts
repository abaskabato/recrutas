/**
 * JSON-LD Structured Data Extraction
 * 
 * Extracts job postings from schema.org JSON-LD structured data.
 * This is the most reliable method as it's machine-readable.
 */

import { ScrapedJob, CompanyConfig, JobLocation, SalaryInfo } from '../types.js';
import { logger } from '../utils/logger.js';

interface JsonLdJobPosting {
  '@type': 'JobPosting';
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization?: {
    name: string;
    sameAs?: string;
    logo?: string;
  };
  jobLocation?: {
    '@type': 'Place';
    address?: {
      '@type': 'PostalAddress';
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
    name?: string;
  };
  baseSalary?: {
    '@type': 'MonetaryAmount';
    currency: string;
    value: {
      '@type': 'QuantitativeValue';
      minValue?: number;
      maxValue?: number;
      value?: number;
      unitText: string;
    };
  };
  url?: string;
  directApply?: boolean;
  qualifications?: string;
  responsibilities?: string;
  skills?: string;
  experienceRequirements?: string;
  educationRequirements?: string;
}

/**
 * Extract jobs from JSON-LD structured data in HTML
 */
export async function extractJsonLdJobs(
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
    
    // Find all JSON-LD script tags
    const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const matches = Array.from(html.matchAll(jsonLdPattern));
    
    logger.info(`Found ${matches.length} JSON-LD blocks for ${company.name}`);
    
    for (const match of matches) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);
        
        // Handle both single job posting and arrays
        const postings = Array.isArray(data) ? data : [data];
        
        for (const posting of postings) {
          if (posting['@type'] === 'JobPosting' || posting['@type']?.includes('JobPosting')) {
            const job = parseJobPosting(posting, company);
            if (job) {
              jobs.push(job);
            }
          }
        }
      } catch (parseError) {
        logger.warn(`Failed to parse JSON-LD block for ${company.name}`, { 
          error: parseError instanceof Error ? parseError.message : String(parseError) 
        });
      }
    }
    
    logger.info(`Extracted ${jobs.length} jobs from JSON-LD for ${company.name}`);
    return jobs;
    
  } catch (error) {
    logger.error(`JSON-LD extraction failed for ${company.name}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Parse a single JSON-LD job posting
 */
function parseJobPosting(posting: JsonLdJobPosting, company: CompanyConfig): ScrapedJob | null {
  try {
    const location = parseLocation(posting.jobLocation);
    const salary = parseSalary(posting.baseSalary);
    
    return {
      id: '', // Will be set by normalizer
      title: posting.title || 'Unknown Position',
      normalizedTitle: '', // Will be set by normalizer
      company: company.name,
      companyId: company.id,
      location,
      description: posting.description || '',
      descriptionHtml: posting.description,
      requirements: parseRequirements(posting),
      responsibilities: parseResponsibilities(posting.responsibilities),
      skills: parseSkills(posting.skills),
      skillCategories: [], // Will be set by normalizer
      workType: 'hybrid', // Will be detected by normalizer
      employmentType: 'full-time', // Will be detected by normalizer
      experienceLevel: 'mid', // Will be detected by normalizer
      salary,
      benefits: [],
      externalUrl: posting.url || company.careerPageUrl,
      applicationUrl: posting.directApply ? posting.url : undefined,
      source: {
        type: 'career_page',
        company: company.name,
        url: company.careerPageUrl,
        scrapeMethod: 'json_ld'
      },
      postedDate: new Date(posting.datePosted || Date.now()),
      expiresAt: posting.validThrough ? new Date(posting.validThrough) : undefined,
      scrapedAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      isRemote: location.isRemote,
      department: undefined,
      team: undefined,
      visaSponsorship: undefined
    };
  } catch (error) {
    logger.warn(`Failed to parse job posting`, { 
      company: company.name,
      title: posting.title,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Parse location from JSON-LD
 */
function parseLocation(jobLocation?: JsonLdJobPosting['jobLocation']): JobLocation {
  if (!jobLocation) {
    return {
      raw: 'Remote',
      isRemote: true,
      country: 'Global',
      countryCode: 'GL',
      normalized: 'remote'
    };
  }

  const address = jobLocation.address;
  const raw = jobLocation.name || 
    (address ? `${address.addressLocality || ''}, ${address.addressRegion || ''}, ${address.addressCountry || ''}` : 'Remote');

  return {
    raw,
    city: address?.addressLocality,
    state: address?.addressRegion,
    country: address?.addressCountry || 'Unknown',
    countryCode: 'US', // TODO: Map country names to codes
    postalCode: address?.postalCode,
    isRemote: raw.toLowerCase().includes('remote'),
    normalized: raw.toLowerCase()
  };
}

/**
 * Parse salary from JSON-LD
 */
function parseSalary(baseSalary?: JsonLdJobPosting['baseSalary']): SalaryInfo {
  if (!baseSalary) {
    return {
      currency: 'USD',
      period: 'yearly',
      isDisclosed: false
    };
  }

  const value = baseSalary.value;
  const period = parsePeriod(value.unitText);

  return {
    min: value.minValue || value.value,
    max: value.maxValue || value.value,
    currency: baseSalary.currency || 'USD',
    period,
    isDisclosed: true
  };
}

/**
 * Parse time period from unit text
 */
function parsePeriod(unitText: string): 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' {
  const lower = unitText.toLowerCase();
  if (lower.includes('hour')) return 'hourly';
  if (lower.includes('day')) return 'daily';
  if (lower.includes('week')) return 'weekly';
  if (lower.includes('month')) return 'monthly';
  return 'yearly';
}

/**
 * Parse requirements from various fields
 */
function parseRequirements(posting: JsonLdJobPosting): any[] {
  const requirements: any[] = [];
  
  if (posting.qualifications) {
    requirements.push({
      type: 'other',
      description: posting.qualifications,
      isRequired: true
    });
  }
  
  if (posting.educationRequirements) {
    requirements.push({
      type: 'education',
      description: posting.educationRequirements,
      isRequired: true
    });
  }
  
  if (posting.experienceRequirements) {
    requirements.push({
      type: 'experience',
      description: posting.experienceRequirements,
      isRequired: true
    });
  }
  
  return requirements;
}

/**
 * Parse responsibilities
 */
function parseResponsibilities(responsibilities?: string): string[] {
  if (!responsibilities) return [];
  
  // Split by common delimiters
  return responsibilities
    .split(/[.\n•\-]+/)
    .map(r => r.trim())
    .filter(r => r.length > 10);
}

/**
 * Parse skills from comma-separated string
 */
function parseSkills(skills?: string): string[] {
  if (!skills) return [];
  
  return skills
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
