/**
 * HTML Parsing Strategy
 * 
 * Traditional regex/pattern-based extraction as a fallback.
 * This is the least reliable method but works when others fail.
 */

import * as cheerio from 'cheerio';
import { ScrapedJob, CompanyConfig, JobLocation } from '../types.js';
import { logger } from '../utils/logger.js';

// Common CSS selectors for job listings
const JOB_SELECTORS = [
  // Generic job containers
  '[data-testid*="job"]',
  '[class*="job-"]',
  '[class*="Job-"]',
  '[class*="position-"]',
  '[class*="opening-"]',
  '[class*="vacancy-"]',
  
  // Common patterns
  '.job-listing',
  '.job-card',
  '.position-item',
  '.career-item',
  '.opening-item',
  '[role="listitem"]',
  
  // Specific ATS patterns
  '.jobs-list-item',
  '.position-title',
  '.job-posting',
];

// Job title patterns
const JOB_TITLE_PATTERNS = [
  /(?:Senior|Junior|Lead|Staff|Principal)?\s*(?:Software Engineer|Software Developer|Engineer|Developer)/i,
  /(?:Frontend|Backend|Full Stack|DevOps|Data|ML|AI|Security|Mobile|iOS|Android)\s*(?:Engineer|Developer)/i,
  /(?:Product|Project|Engineering|Technical)\s*(?:Manager|Lead)/i,
  /(?:Data|Machine Learning)\s*(?:Scientist|Engineer)/i,
  /(?:UX|UI|Product)\s*(?:Designer|Researcher)/i,
  /(?:QA|Test)\s*(?:Engineer|Analyst)/i,
];

/**
 * Extract jobs using HTML parsing
 */
export async function extractHtmlJobs(
  company: CompanyConfig,
  fetchOptions: RequestInit
): Promise<ScrapedJob[]> {
  try {
    const response = await fetch(company.careerPageUrl, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];
    
    logger.info(`Parsing HTML for ${company.name}`);
    
    // Try custom selectors if provided
    if (company.scrapeConfig.selectors) {
      const customJobs = extractWithCustomSelectors($, company);
      jobs.push(...customJobs);
    }
    
    // If no jobs found with custom selectors, try generic patterns
    if (jobs.length === 0) {
      const genericJobs = extractWithGenericSelectors($, company);
      jobs.push(...genericJobs);
    }
    
    // If still no jobs, try pattern matching
    if (jobs.length === 0) {
      const patternJobs = extractWithPatterns(html, company);
      jobs.push(...patternJobs);
    }
    
    logger.info(`Extracted ${jobs.length} jobs via HTML parsing for ${company.name}`);
    return jobs;
    
  } catch (error) {
    logger.error(`HTML parsing failed for ${company.name}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Extract using company-specific selectors
 */
function extractWithCustomSelectors($: ReturnType<typeof cheerio.load>, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const selectors = company.scrapeConfig.selectors;
  
  if (!selectors?.jobContainer) return jobs;
  
  $(selectors.jobContainer).each((_, element) => {
    try {
      const $el = $(element);
      
      const title = selectors.title 
        ? $el.find(selectors.title).text().trim()
        : $el.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
        
      const location = selectors.location
        ? $el.find(selectors.location).text().trim()
        : $el.find('[class*="location"], [class*="place"]').first().text().trim();
        
      const description = selectors.description
        ? $el.find(selectors.description).text().trim()
        : $el.find('[class*="description"], [class*="summary"], p').first().text().trim();
        
      const externalUrl = selectors.externalUrl
        ? $el.find(selectors.externalUrl).attr('href')
        : $el.find('a').first().attr('href');
      
      if (title && title.length > 3) {
        const jobLocation: JobLocation = {
          raw: location || 'Remote',
          isRemote: location?.toLowerCase().includes('remote') || false,
          country: 'Unknown',
          countryCode: 'US',
          normalized: (location || 'remote').toLowerCase()
        };
        
        jobs.push({
          id: `html_${company.id}_${jobs.length}`,
          title,
          normalizedTitle: '',
          company: company.name,
          companyId: company.id,
          location: jobLocation,
          description: description || `${title} position at ${company.name}`,
          requirements: [],
          responsibilities: [],
          skills: [],
          skillCategories: [],
          workType: 'hybrid',
          employmentType: 'full-time',
          experienceLevel: 'mid',
          salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
          benefits: [],
          externalUrl: externalUrl ? new URL(externalUrl, company.careerPageUrl).href : company.careerPageUrl,
          source: {
            type: 'career_page',
            company: company.name,
            url: company.careerPageUrl,
            scrapeMethod: 'html_parsing'
          },
          postedDate: new Date(),
          scrapedAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
          isRemote: jobLocation.isRemote
        });
      }
    } catch (error) {
      logger.warn(`Failed to extract job with custom selectors`, { error });
    }
  });
  
  return jobs;
}

/**
 * Extract using generic CSS selectors
 */
function extractWithGenericSelectors($: ReturnType<typeof cheerio.load>, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  
  for (const selector of JOB_SELECTORS) {
    const elements = $(selector);
    
    if (elements.length > 0) {
      logger.info(`Found ${elements.length} elements with selector: ${selector}`);
      
      elements.each((index, element) => {
        try {
          const $el = $(element);
          
          // Try to find title
          const title = $el.find('h1, h2, h3, h4, .title, [class*="title"], [class*="Title"]').first().text().trim()
            || $el.find('a').first().text().trim();
          
          // Validate title looks like a job
          if (!title || title.length < 5) return;
          if (!JOB_TITLE_PATTERNS.some(pattern => pattern.test(title))) return;
          
          // Extract location
          const location = $el.find('[class*="location"], [class*="place"], [class*="city"]').first().text().trim()
            || $el.find('span, div').filter((_, el) => /remote|onsite|hybrid/i.test($(el).text())).first().text().trim();
          
          // Extract description
          const description = $el.find('[class*="description"], [class*="summary"], [class*="content"]').first().text().trim()
            || $el.find('p').first().text().trim();
          
          // Extract URL
          let externalUrl = $el.find('a').first().attr('href');
          if (externalUrl && !externalUrl.startsWith('http')) {
            externalUrl = new URL(externalUrl, company.careerPageUrl).href;
          }
          
          const jobLocation: JobLocation = {
            raw: location || 'Remote',
            isRemote: location?.toLowerCase().includes('remote') || false,
            country: 'Unknown',
            countryCode: 'US',
            normalized: (location || 'remote').toLowerCase()
          };
          
          jobs.push({
            id: `html_${company.id}_${index}`,
            title,
            normalizedTitle: '',
            company: company.name,
            companyId: company.id,
            location: jobLocation,
            description: description || `${title} position at ${company.name}`,
            requirements: [],
            responsibilities: [],
            skills: [],
            skillCategories: [],
            workType: jobLocation.isRemote ? 'remote' : 'hybrid',
            employmentType: 'full-time',
            experienceLevel: 'mid',
            salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
            benefits: [],
            externalUrl: externalUrl || company.careerPageUrl,
            source: {
              type: 'career_page',
              company: company.name,
              url: company.careerPageUrl,
              scrapeMethod: 'html_parsing'
            },
            postedDate: new Date(),
            scrapedAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            isRemote: jobLocation.isRemote
          });
        } catch (error) {
          // Continue to next element
        }
      });
      
      // If we found jobs with this selector, stop
      if (jobs.length > 0) break;
    }
  }
  
  return jobs;
}

/**
 * Extract using regex patterns on raw HTML
 */
function extractWithPatterns(html: string, company: CompanyConfig): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const titles = new Set<string>();
  
  // Find all job titles using patterns
  for (const pattern of JOB_TITLE_PATTERNS) {
    const matches = Array.from(html.matchAll(new RegExp(pattern, 'gi')));
    for (const match of matches) {
      const title = match[0].trim();
      if (title.length > 5 && title.length < 100) {
        titles.add(title);
      }
    }
  }
  
  // Create job objects from titles
  let index = 0;
  for (const title of titles) {
    if (index >= 20) break; // Limit to avoid false positives
    
    // Skip common non-job titles
    if (/apply|login|search|menu|home|about/i.test(title)) continue;
    
    jobs.push({
      id: `pattern_${company.id}_${index}`,
      title,
      normalizedTitle: '',
      company: company.name,
      companyId: company.id,
      location: {
        raw: 'Remote',
        isRemote: true,
        country: 'Unknown',
        countryCode: 'US',
        normalized: 'remote'
      },
      description: `${title} position at ${company.name}`,
      requirements: [],
      responsibilities: [],
      skills: [],
      skillCategories: [],
      workType: 'hybrid',
      employmentType: 'full-time',
      experienceLevel: 'mid',
      salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
      benefits: [],
      externalUrl: company.careerPageUrl,
      source: {
        type: 'career_page',
        company: company.name,
        url: company.careerPageUrl,
        scrapeMethod: 'html_parsing'
      },
      postedDate: new Date(),
      scrapedAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      isRemote: false
    });
    
    index++;
  }
  
  return jobs;
}
