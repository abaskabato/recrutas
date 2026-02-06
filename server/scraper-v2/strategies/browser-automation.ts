/**
 * Browser Automation Strategy
 * 
 * Uses Playwright for JavaScript-heavy career pages that require
 * browser rendering. This is the most expensive method but handles
 * SPAs and dynamically loaded content.
 */

import { chromium, Browser, Page } from 'playwright';
import { ScrapedJob, CompanyConfig, JobLocation } from '../types.js';
import { logger } from '../utils/logger.js';

let browser: Browser | null = null;

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    });
  }
  return browser;
}

/**
 * Scrape jobs using browser automation
 */
export async function scrapeWithBrowser(company: CompanyConfig): Promise<ScrapedJob[]> {
  const page = await (await getBrowser()).newPage();
  
  try {
    logger.info(`Starting browser scrape for ${company.name}`);
    
    // Set viewport and user agent
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    });
    
    // Navigate to page
    await page.goto(company.careerPageUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for content to load
    if (company.scrapeConfig.browserConfig?.waitForSelector) {
      await page.waitForSelector(company.scrapeConfig.browserConfig.waitForSelector, {
        timeout: 10000
      });
    } else {
      // Generic wait for job listings
      await page.waitForTimeout(company.scrapeConfig.browserConfig?.waitTime || 2000);
    }
    
    // Scroll to bottom if needed
    if (company.scrapeConfig.browserConfig?.scrollToBottom) {
      await scrollToBottom(page);
    }
    
    // Extract job data from page
    const jobs = await extractJobsFromPage(page, company);
    
    logger.info(`Browser scrape completed for ${company.name}`, {
      jobCount: jobs.length
    });
    
    return jobs;
    
  } catch (error) {
    logger.error(`Browser scrape failed for ${company.name}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Scroll to bottom of page to load lazy content
 */
async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Extract jobs from the rendered page
 */
async function extractJobsFromPage(page: Page, company: CompanyConfig): Promise<ScrapedJob[]> {
  // Try to find job data in window object
  const windowData = await page.evaluate(() => {
    return {
      jobs: ((globalThis as any).window as any).__INITIAL_STATE__ || ((globalThis as any).window as any).__DATA__ || ((globalThis as any).window as any).__JOBS__,
      jobElements: Array.from((globalThis as any).document.querySelectorAll('[data-testid*="job"], [class*="job-"], [class*="Job-"], .job-listing, .position-item')).map((el: any) => ({
        title: el.querySelector('h1, h2, h3, h4, .title')?.textContent?.trim(),
        location: el.querySelector('[class*="location"], [class*="place"]')?.textContent?.trim(),
        description: el.querySelector('[class*="description"], p')?.textContent?.trim(),
        url: el.querySelector('a')?.getAttribute('href')
      }))
    };
  });
  
  const jobs: ScrapedJob[] = [];
  
  // If we found job elements, use those
  if (windowData.jobElements && windowData.jobElements.length > 0) {
    for (const [index, element] of windowData.jobElements.entries()) {
      if (!element.title || element.title.length < 3) continue;
      
      const location: JobLocation = {
        raw: element.location || 'Remote',
        isRemote: element.location?.toLowerCase().includes('remote') || false,
        country: 'Unknown',
        countryCode: 'US',
        normalized: (element.location || 'remote').toLowerCase()
      };
      
      let externalUrl = element.url;
      if (externalUrl && !externalUrl.startsWith('http')) {
        externalUrl = new URL(externalUrl, company.careerPageUrl).href;
      }
      
      jobs.push({
        id: `browser_${company.id}_${index}`,
        title: element.title,
        normalizedTitle: '',
        company: company.name,
        companyId: company.id,
        location,
        description: element.description || `${element.title} position at ${company.name}`,
        requirements: [],
        responsibilities: [],
        skills: [],
        skillCategories: [],
        workType: location.isRemote ? 'remote' : 'hybrid',
        employmentType: 'full-time',
        experienceLevel: 'mid',
        salary: { currency: 'USD', period: 'yearly', isDisclosed: false },
        benefits: [],
        externalUrl: externalUrl || company.careerPageUrl,
        source: {
          type: 'career_page',
          company: company.name,
          url: company.careerPageUrl,
          scrapeMethod: 'browser_automation'
        },
        postedDate: new Date(),
        scrapedAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isRemote: location.isRemote
      });
    }
  }
  
  return jobs;
}

/**
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
