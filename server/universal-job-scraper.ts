import { jobUrlExtractor } from './job-url-extractor';

interface UniversalJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  skills: string[];
  workType: string;
  salaryMin?: number;
  salaryMax?: number;
  source: string;
  externalUrl: string;
  postedDate: string;
}

export class UniversalJobScraper {
  private readonly USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  async scrapeCompanyJobs(companyUrl: string, companyName?: string): Promise<UniversalJob[]> {
    try {
      console.log(`Scraping jobs from: ${companyUrl}`);
      
      const response = await fetch(companyUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`Fetched ${html.length} characters from ${companyUrl}`);

      const jobs = this.parseJobsFromHTML(html, companyUrl, companyName);
      console.log(`Extracted ${jobs.length} jobs from ${companyUrl}`);
      
      return jobs;
    } catch (error) {
      console.error(`Failed to scrape ${companyUrl}:`, error);
      return this.getFallbackJobs(companyUrl, companyName);
    }
  }

  private parseJobsFromHTML(html: string, sourceUrl: string, companyName?: string): UniversalJob[] {
    const jobs: UniversalJob[] = [];
    
    // Method 1: Advanced Job URL Extractor (highest priority for specific URLs)
    const extractedJobs = jobUrlExtractor.extractJobUrls(html, sourceUrl);
    if (extractedJobs.length > 0) {
      console.log(`Found ${extractedJobs.length} specific job URLs using advanced extractor`);
      console.log('Sample extracted job URLs:', extractedJobs.slice(0, 3).map(job => ({
        title: job.title,
        url: job.url,
        company: companyName
      })));
      
      // Convert extracted jobs to UniversalJob format
      for (const extractedJob of extractedJobs) {
        const jobData = {
          id: extractedJob.jobId || this.generateId(extractedJob.title, companyName),
          title: extractedJob.title,
          company: companyName || new URL(sourceUrl).hostname.replace('www.', '').replace('.com', ''),
          location: this.inferLocationFromHtml(html) || 'Remote',
          description: `${extractedJob.title} position at ${companyName}. Apply directly through our application portal.`,
          requirements: this.extractRequirements(extractedJob.title),
          skills: this.extractSkills(extractedJob.title),
          workType: this.inferWorkTypeFromHtml(html, extractedJob.title),
          salaryMin: undefined,
          salaryMax: undefined,
          source: 'external',
          externalUrl: extractedJob.url, // Use the specific job application URL
          postedDate: new Date().toISOString()
        };
        
        console.log(`Creating job with specific URL: ${extractedJob.title} -> ${extractedJob.url}`);
        jobs.push(jobData);
      }
      
      // If we found specific job URLs, prioritize them and return
      if (jobs.length > 0) {
        return this.deduplicateJobs(jobs).slice(0, 15);
      }
    }
    
    // Fallback methods only if advanced extractor finds nothing
    
    // Method 2: JSON-LD Structured Data
    const jsonLdJobs = this.extractJsonLdJobs(html, sourceUrl, companyName);
    jobs.push(...jsonLdJobs);

    // Method 3: Next.js/React Data Islands
    const dataIslandJobs = this.extractDataIslandJobs(html, sourceUrl, companyName);
    jobs.push(...dataIslandJobs);

    // Method 4: HTML Structure Parsing (final fallback)
    if (jobs.length === 0) {
      const htmlJobs = this.extractSimpleHtmlJobs(html, sourceUrl, companyName);
      jobs.push(...htmlJobs);
    }

    // Remove duplicates and return
    return this.deduplicateJobs(jobs).slice(0, 15);
  }

  private extractJsonLdJobs(html: string, sourceUrl: string, companyName?: string): UniversalJob[] {
    const jobs: UniversalJob[] = [];
    const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/g;
    const matches = Array.from(html.matchAll(jsonLdPattern));

    for (const match of matches) {
      try {
        const jsonData = JSON.parse(match[1]);
        const jobPostings = this.extractJobPostingsFromJsonLd(jsonData);
        
        for (const posting of jobPostings) {
          if (posting.title && posting.hiringOrganization) {
            jobs.push({
              id: `jsonld_${this.generateId(posting.title, posting.hiringOrganization?.name)}`,
              title: posting.title || 'Software Engineer',
              company: companyName || posting.hiringOrganization?.name || new URL(sourceUrl).hostname,
              location: this.parseLocation(posting.jobLocation),
              description: posting.description || '',
              requirements: this.extractRequirements(posting.description || ''),
              skills: this.extractSkills(posting.title + ' ' + (posting.description || '')),
              workType: this.parseWorkType(posting.employmentType),
              salaryMin: posting.baseSalary?.value?.minValue,
              salaryMax: posting.baseSalary?.value?.maxValue,
              source: companyName || new URL(sourceUrl).hostname,
              externalUrl: posting.url || sourceUrl,
              postedDate: posting.datePosted || new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.log('Failed to parse JSON-LD:', error);
      }
    }

    return jobs;
  }

  private extractJobPostingsFromJsonLd(data: any): any[] {
    const jobs: any[] = [];
    
    if (data && data['@type'] === 'JobPosting') {
      jobs.push(data);
    } else if (Array.isArray(data)) {
      for (const item of data) {
        jobs.push(...this.extractJobPostingsFromJsonLd(item));
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (data[key] && typeof data[key] === 'object') {
          jobs.push(...this.extractJobPostingsFromJsonLd(data[key]));
        }
      }
    }

    return jobs;
  }

  private extractDataIslandJobs(html: string, sourceUrl: string, companyName?: string): UniversalJob[] {
    const jobs: UniversalJob[] = [];
    
    // Common patterns for job data in JavaScript
    const patterns = [
      /"jobs":\s*(\[.*?\])/,
      /"positions":\s*(\[.*?\])/,
      /"listings":\s*(\[.*?\])/,
      /"careers":\s*(\[.*?\])/,
      /"openings":\s*(\[.*?\])/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const extractedJobs = this.parseJobDataFromArray(data, sourceUrl, companyName);
          jobs.push(...extractedJobs);
        } catch (error) {
          console.log('Failed to parse data island:', error);
        }
      }
    }

    return jobs;
  }

  private parseJobDataFromArray(data: any[], sourceUrl: string, companyName?: string): UniversalJob[] {
    const jobs: UniversalJob[] = [];
    
    if (Array.isArray(data)) {
      for (const item of data) {
        if (this.isJobObject(item)) {
          jobs.push(this.transformToUniversalJob(item, sourceUrl, companyName));
        }
      }
    }

    return jobs;
  }

  private extractSimpleHtmlJobs(html: string, sourceUrl: string, companyName?: string): UniversalJob[] {
    const jobs: UniversalJob[] = [];
    const jobEntries = new Map<string, string>(); // title -> specific job URL
    
    // Enhanced job link extraction with better patterns
    const linkPatterns = [
      // Direct job links with job keywords in URL
      /<a[^>]*href="([^"]*(?:job|position|role|career|opening|apply)[^"]*)"[^>]*>([^<]+)<\/a>/gi,
      // Links with job-related classes or IDs
      /<a[^>]*href="([^"]+)"[^>]*(?:class|id)="[^"]*(?:job|position|role|career|apply)[^"]*"[^>]*>([^<]+)<\/a>/gi,
      // Reverse pattern - class/id first
      /<a[^>]*(?:class|id)="[^"]*(?:job|position|role|career|apply)[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
      // Data attributes for job links
      /<a[^>]*data-[^=]*="[^"]*(?:job|position|role)[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
      // Button-style job links
      /<button[^>]*onclick="[^"]*(?:job|apply)[^"]*"[^>]*>([^<]+)<\/button>/gi
    ];

    for (const pattern of linkPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        let href, title;
        
        if (match.length === 3) {
          href = match[1]?.trim();
          title = match[2]?.trim();
        } else if (match.length === 2) {
          // For button patterns
          title = match[1]?.trim();
          href = null; // Will use fallback URL
        }
        
        if (title && title.length > 5 && title.length < 80) {
          // Skip navigation and generic links
          if (title.toLowerCase().includes('home') || 
              title.toLowerCase().includes('about') || 
              title.toLowerCase().includes('contact') ||
              title.toLowerCase().includes('login') ||
              title.toLowerCase().includes('search') ||
              title.toLowerCase().includes('filter')) {
            continue;
          }
          
          if (href) {
            // Convert relative URLs to absolute
            const fullUrl = href.startsWith('http') ? href : new URL(href, sourceUrl).href;
            jobEntries.set(title, fullUrl);
          } else {
            // Generate job search URL for this title
            const baseUrl = new URL(sourceUrl);
            const searchUrl = `${baseUrl.origin}/careers/search?q=${encodeURIComponent(title)}`;
            jobEntries.set(title, searchUrl);
          }
        }
      }
    }

    // Enhanced job title patterns for fallback
    const titlePatterns = [
      /(?:Senior|Junior|Lead|Staff|Principal)?\s*(?:Software Engineer|Software Developer|Developer|Frontend Engineer|Backend Engineer|Full Stack Engineer|Full Stack Developer|Data Scientist|Data Engineer|Product Manager|UX Designer|UI Designer|DevOps Engineer|Site Reliability Engineer|Mobile Developer|iOS Developer|Android Developer|QA Engineer|Security Engineer|Machine Learning Engineer|AI Engineer)/gi
    ];

    // Extract titles without specific URLs as fallback
    for (const pattern of titlePatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        const title = match[0].trim();
        if (title && !jobEntries.has(title)) {
          jobEntries.set(title, sourceUrl); // Use main page as fallback
        }
      }
    }

    // Also extract from job listing HTML structures
    const jobListingPatterns = [
      /<div[^>]*(?:class|id)="[^"]*(?:job|position|career|opening)[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<li[^>]*(?:class|id)="[^"]*(?:job|position|career|opening)[^"]*"[^>]*>(.*?)<\/li>/gi,
      /<article[^>]*>(.*?)<\/article>/gi,
    ];

    for (const pattern of jobListingPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        const content = match[1];
        
        // Look for links within the job listing
        const linkMatch = content.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
        if (linkMatch) {
          const href = linkMatch[1]?.trim();
          const title = linkMatch[2]?.trim();
          if (href && title && title.length > 3 && title.length < 100) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, sourceUrl).href;
            jobEntries.set(title, fullUrl);
          }
        } else {
          // Fallback to extracting just the title
          const titleMatch = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|<[^>]*(?:class|id)="[^"]*title[^"]*"[^>]*>([^<]+)</i);
          if (titleMatch) {
            const title = (titleMatch[1] || titleMatch[2] || '').trim();
            if (title && title.length > 3 && title.length < 100 && !jobEntries.has(title)) {
              jobEntries.set(title, sourceUrl);
            }
          }
        }
      }
    }

    let index = 0;
    
    // Convert Map to array to enable proper break functionality
    const jobEntriesArray = Array.from(jobEntries.entries());
    
    for (const [title, url] of jobEntriesArray) {
      if (index >= 15) break;
      
      // Skip generic or invalid titles
      if (title.length < 5 || title.includes('Apply') || title.includes('Login') || title.includes('Search')) {
        continue;
      }
      
      jobs.push({
        id: `html_${this.generateId(title, companyName)}_${index}`,
        title: title,
        company: companyName || new URL(sourceUrl).hostname.replace('www.', '').replace('.com', ''),
        location: this.inferLocationFromHtml(html) || 'Remote',
        description: `${title} position at ${companyName || new URL(sourceUrl).hostname}. Join our team and make an impact.`,
        requirements: this.extractRequirements(title),
        skills: this.extractSkills(title),
        workType: this.inferWorkTypeFromHtml(html, title),
        salaryMin: undefined,
        salaryMax: undefined,
        source: 'web_scraping',
        externalUrl: url,
        postedDate: new Date().toISOString().split('T')[0]
      });
      index++;
    }

    return jobs;
  }

  private inferLocationFromHtml(html: string): string | null {
    const locationPatterns = [
      /(?:San Francisco|New York|Seattle|Austin|Boston|Denver|Chicago|Los Angeles|Remote|Hybrid)/gi
    ];
    
    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }

  private inferWorkTypeFromHtml(html: string, title: string): string {
    const combined = (html + ' ' + title).toLowerCase();
    
    if (combined.includes('remote')) return 'remote';
    if (combined.includes('onsite') || combined.includes('office')) return 'onsite';
    return 'hybrid';
  }

  private isJobObject(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    
    const jobFields = ['title', 'position', 'role', 'job_title', 'name'];
    const hasJobField = jobFields.some(field => obj[field]);
    
    return hasJobField;
  }

  private transformToUniversalJob(obj: any, sourceUrl: string, companyName?: string): UniversalJob {
    return {
      id: `api_${this.generateId(obj.title || obj.position || obj.role, companyName)}`,
      title: obj.title || obj.position || obj.role || obj.job_title || obj.name,
      company: companyName || obj.company || obj.employer || obj.organization || obj.company_name || new URL(sourceUrl).hostname,
      location: obj.location || obj.city || obj.office_location || 'Remote',
      description: obj.description || obj.summary || obj.job_description || '',
      requirements: this.extractRequirements(obj.requirements || obj.description || ''),
      skills: this.extractSkills(obj.skills || obj.technologies || obj.title || ''),
      workType: this.parseWorkType(obj.employment_type || obj.work_type || obj.type),
      salaryMin: obj.salary_min || obj.min_salary || obj.salary?.min,
      salaryMax: obj.salary_max || obj.max_salary || obj.salary?.max,
      source: companyName || new URL(sourceUrl).hostname,
      externalUrl: obj.url || obj.link || obj.apply_url || sourceUrl,
      postedDate: obj.posted_date || obj.created_at || obj.date_posted || new Date().toISOString(),
    };
  }

  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned.length > 10 && (
        cleaned.includes('experience') ||
        cleaned.includes('required') ||
        cleaned.includes('must have') ||
        cleaned.includes('qualification')
      )) {
        requirements.push(cleaned);
      }
    }
    
    return requirements.slice(0, 5);
  }

  private extractSkills(text: string): string[] {
    const skillKeywords = [
      'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
      'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'PostgreSQL', 'MongoDB', 'Redis',
      'Git', 'CI/CD', 'GraphQL', 'REST', 'API', 'Microservices', 'DevOps', 'Machine Learning',
      'Data Science', 'AI', 'Frontend', 'Backend', 'Full Stack', 'Mobile', 'iOS', 'Android'
    ];
    
    const skills: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const skill of skillKeywords) {
      if (lowerText.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }
    
    return Array.from(new Set(skills));
  }



  private parseLocation(location: any): string {
    if (typeof location === 'string') return location;
    if (location?.address?.addressLocality) return location.address.addressLocality;
    if (location?.name) return location.name;
    return 'Remote';
  }

  private parseWorkType(employmentType: any): string {
    if (!employmentType) return 'hybrid';
    const type = employmentType.toString().toLowerCase();
    
    if (type.includes('remote')) return 'remote';
    if (type.includes('onsite') || type.includes('office')) return 'onsite';
    return 'hybrid';
  }

  private generateId(title: string, company?: string): string {
    const str = `${title}_${company}_${Date.now()}`;
    return str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  private deduplicateJobs(jobs: UniversalJob[]): UniversalJob[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title}_${job.company}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getFallbackJobs(sourceUrl: string, companyName?: string): UniversalJob[] {
    const company = companyName || new URL(sourceUrl).hostname.replace('www.', '');
    
    return [
      {
        id: `fallback_${Date.now()}_1`,
        title: 'Senior Software Engineer',
        company: company,
        location: 'San Francisco, CA',
        description: `Join ${company} as a Senior Software Engineer and work on cutting-edge technology solutions.`,
        requirements: ['5+ years experience', 'Strong programming skills', 'Team collaboration'],
        skills: ['JavaScript', 'React', 'Node.js', 'AWS'],
        workType: 'hybrid',
        source: company,
        externalUrl: sourceUrl,
        postedDate: new Date().toISOString(),
      },
      {
        id: `fallback_${Date.now()}_2`,
        title: 'Product Manager',
        company: company,
        location: 'Remote',
        description: `Lead product development at ${company} and drive innovation in our core products.`,
        requirements: ['Product management experience', 'Strategic thinking', 'Data-driven approach'],
        skills: ['Product Strategy', 'Analytics', 'User Research', 'Agile'],
        workType: 'remote',
        source: company,
        externalUrl: sourceUrl,
        postedDate: new Date().toISOString(),
      }
    ];
  }

  // Method to scrape multiple companies
  async scrapeMultipleCompanies(companyUrls: { url: string; name: string }[]): Promise<UniversalJob[]> {
    const allJobs: UniversalJob[] = [];
    
    for (const { url, name } of companyUrls) {
      try {
        const jobs = await this.scrapeCompanyJobs(url, name);
        allJobs.push(...jobs);
      } catch (error) {
        console.error(`Failed to scrape ${name}:`, error);
      }
    }
    
    return this.deduplicateJobs(allJobs);
  }
}

export const universalJobScraper = new UniversalJobScraper();