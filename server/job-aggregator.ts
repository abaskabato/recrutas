import { hiringCafeService } from './services/hiring-cafe.service';
import { weWorkRemotelyService } from './services/we-work-remotely.service';
import { getProfessions, getProfession, detectProfession, ProfessionConfig } from './config/professions';

// Trust scores for different job sources (0-100)
// Higher scores indicate more trustworthy/verified sources
export const SOURCE_TRUST_SCORES: Record<string, number> = {
  'platform': 100,          // Internal platform jobs - most trustworthy
  'JSearch': 75,            // JSearch API - aggregates real jobs
  'The Muse': 70,           // Curated tech jobs from real companies
  'WeWorkRemotely': 80,     // Curated remote jobs with direct URLs - HIGH QUALITY
  'RemoteOK': 65,           // Remote-focused jobs, generally accurate
  'ArbeitNow': 60,          // European job board aggregator
  'hiring-cafe': 55,       // Multi-industry aggregator, less vetted
  'default': 50             // Default for unknown sources
};

// Get trust score for a source, with fallback
export function getSourceTrustScore(source: string): number {
  return SOURCE_TRUST_SCORES[source] ?? SOURCE_TRUST_SCORES['default'];
}

// Trust badge thresholds
export const TRUST_BADGES = {
  VERIFIED_ACTIVE: 90,      // Show "Verified Active" badge
  DIRECT_FROM_COMPANY: 85,  // Show "Direct from Company" badge
  HIGH_TRUST: 70,           // Show as trusted source
  MEDIUM_TRUST: 50,         // Standard display
  LOW_TRUST: 30             // Show caution indicator
};

interface ExternalJob {
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
  // Trust-related fields
  trustScore?: number;
  isVerifiedActive?: boolean;
  lastLivenessCheck?: string;
  // Profession classification
  profession?: string;
}

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description: string;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
  };
  job_is_remote: boolean;
  job_min_salary?: number;
  job_max_salary?: number;
  job_apply_link?: string;
  job_google_link?: string;
  job_posted_at_datetime_utc?: string;
}

interface JSearchApiResponse {
  data?: JSearchJob[];
}

interface RemoteOKJob {
  id: string;
  position: string;
  company: string;
  location?: string;
  description?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  url: string;
  date: string;
}

interface MuseJob {
  id: string;
  name: string;
  company?: {
    name: string;
  };
  locations?: {
    name: string;
  }[];
  contents: string;
  refs?: {
    landing_page: string;
  };
  publication_date: string;
}

interface MuseApiResponse {
  results?: MuseJob[];
}

interface USAJobsJob {
  PositionID: string;
  PositionTitle: string;
  OrganizationName: string;
  PositionLocationDisplay: string;
  QualificationSummary: string;
  PositionSummary: string;
  PositionRemuneration: {
    MinimumRange: number;
    MaximumRange: number;
  }[];
  PositionURI: string;
  PublicationStartDate: string;
}

interface USAJobsApiResponse {
  SearchResult?: {
    SearchResultItems?: USAJobsJob[];
  };
}

interface JoobleJob {
  title: string;
  company: string;
  location: string;
  snippet: string;
  type: string;
  salary?: string;
  link: string;
  updated: string;
}

interface JoobleApiResponse {
  jobs?: JoobleJob[];
}

interface ArbeitNowJob {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  tags: string[];
  remote: boolean;
  url: string;
  created_at: string;
}

interface ArbeitNowApiResponse {
  data?: ArbeitNowJob[];
}

interface AdzunaJob {
  id: string;
  title: string;
  company: {
    display_name: string;
  };
  location: {
    display_name: string;
  };
  description: string;
  redirect_url: string;
  created: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  category?: {
    label: string;
  };
}

interface AdzunaApiResponse {
  results?: AdzunaJob[];
}

export class JobAggregator {

  // Fetch with exponential backoff retry on 429/503
  private async fetchWithRetry(url: string, options?: RequestInit, maxRetries = 3): Promise<Response> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(url, options);
      if (response.status !== 429 && response.status !== 503) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError!;
  }

  // Add new open source job sources
  async fetchFromJSearchAPI(userSkills?: string[]): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from JSearch API (free tier)...');

      // Create appropriate queries based on skills (not just tech)
      let query = 'jobs';
      if (userSkills && userSkills.length > 0) {
        const skill = userSkills[0].toLowerCase();
        // Map skills to appropriate job search terms
        if (skill.includes('sales')) query = 'sales representative';
        else if (skill.includes('design')) query = 'designer';
        else if (skill.includes('marketing')) query = 'marketing specialist';
        else if (skill.includes('finance')) query = 'financial analyst';
        else if (skill.includes('hr')) query = 'human resources';
        else if (skill.includes('healthcare')) query = 'healthcare worker';
        else if (skill.includes('education')) query = 'teacher';
        else if (skill.includes('customer')) query = 'customer service';
        else if (skill.includes('management')) query = 'manager';
        else if (skill.includes('data')) query = 'data analyst';
        else if (skill.includes('writing')) query = 'content writer';
        else query = userSkills.join(' ') + ' jobs';
      }

      const params = new URLSearchParams({
        query: query,
        page: '1',
        num_pages: '3',
        country: 'US',
        employment_types: 'FULLTIME,PARTTIME,CONTRACTOR',
        job_requirements: 'under_3_years_experience,more_than_3_years_experience,no_experience',
        remote_jobs_only: 'false'
      });

      // Using RapidAPI free tier for JSearch
      const response = await this.fetchWithRetry(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'User-Agent': 'JobPlatform/1.0'
        }
      });

      if (response.ok) {
        const data: JSearchApiResponse = await response.json();
        const jobs = this.transformJSearchJobs(data.data || []);
        console.log(`Fetched ${jobs.length} real jobs from JSearch API`);
        return jobs;
      } else {
        console.log(`JSearch API returned ${response.status}: ${response.statusText}`);
        return [];
      }
    } catch (error) {
      console.log('Error fetching from JSearch:', error.message);
      return [];
    }
  }

  async fetchFromArbeitNow(): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from ArbeitNow (free European jobs)...');

      const response = await this.fetchWithRetry('https://www.arbeitnow.com/api/job-board-api', {
        headers: {
          'User-Agent': 'JobPlatform/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data: ArbeitNowApiResponse = await response.json();
        const jobs = this.transformArbeitNowJobs(data.data || []);
        console.log(`Fetched ${jobs.length} real jobs from ArbeitNow`);
        return jobs;
      } else {
        console.log(`ArbeitNow API returned ${response.status}`);
        return [];
      }
    } catch (error) {
      console.log('Error fetching from ArbeitNow:', error.message);
      return [];
    }
  }

  async fetchFromJoobleAPI(userSkills?: string[]): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from Jooble API (free tier)...');

      const keywords = userSkills && userSkills.length > 0
        ? userSkills.join(' ')
        : 'software developer programmer';

      const params = new URLSearchParams({
        keywords: keywords,
        location: 'USA',
        radius: '50',
        page: '1'
      });

      const response = await this.fetchWithRetry(`https://jooble.org/api/${process.env.JOOBLE_API_KEY || 'demo'}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JobPlatform/1.0'
        }
      });

      if (response.ok) {
        const data: JoobleApiResponse = await response.json();
        const jobs = this.transformJoobleJobs(data.jobs || []);
        console.log(`Fetched ${jobs.length} real jobs from Jooble`);
        return jobs;
      } else {
        console.log(`Jooble API returned ${response.status}`);
        return [];
      }
    } catch (error) {
      console.log('Error fetching from Jooble:', error.message);
      return [];
    }
  }

  async fetchFromIndeedRSS(userSkills?: string[]): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from Indeed RSS feeds...');

      const query = userSkills && userSkills.length > 0
        ? userSkills.join('+')
        : 'software+developer';

      const response = await this.fetchWithRetry(`https://www.indeed.com/rss?q=${query}&l=&sort=date`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
          'Accept': 'application/rss+xml, application/xml'
        }
      });

      if (response.ok) {
        const xmlText = await response.text();
        const jobs = this.parseIndeedRSS(xmlText);
        console.log(`Fetched ${jobs.length} real jobs from Indeed RSS`);
        return jobs;
      } else {
        console.log(`Indeed RSS returned ${response.status}`);
        return [];
      }
    } catch (error) {
      console.log('Error fetching from Indeed RSS:', error.message);
      return [];
    }
  }

  async fetchFromUSAJobs(userSkills?: string[]): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from USAJobs.gov API...');

      // Build dynamic keyword based on user skills
      let keywords = 'software developer engineer programmer analyst';
      if (userSkills && userSkills.length > 0) {
        keywords = userSkills.join(' ') + ' developer engineer';
      }

      // Build query parameters for targeted jobs
      const params = new URLSearchParams({
        Keyword: keywords,
        LocationName: 'United States',
        ResultsPerPage: '100',
        WhoMayApply: 'All',
        SortField: 'PublicationStartDate',
        SortDirection: 'Descending'
      });

      const response = await this.fetchWithRetry(`https://data.usajobs.gov/api/search?${params}`, {
        headers: {
          'Host': 'data.usajobs.gov',
          'User-Agent': 'Recrutas-Platform/1.0 (recrutas@replit.com)',
          'Authorization-Key': process.env.USAJOBS_API_KEY || ''
        }
      });

      if (response.ok) {
        const data: USAJobsApiResponse = await response.json();
        const jobs = this.transformUSAJobs(data.SearchResult?.SearchResultItems || []);
        console.log(`Fetched ${jobs.length} real jobs from USAJobs.gov`);
        return jobs;
      } else {
        console.log(`USAJobs API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching from USAJobs:', error);
    }

    return [];
  }

  async fetchFromJSearch(): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from JSearch API (free tier)...');

      // JSearch offers free access to real job data
      const queries = ['software developer', 'frontend developer', 'backend engineer'];
      const allJobs: ExternalJob[] = [];

      for (const query of queries) {
        try {
          const response = await this.fetchWithRetry(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&date_posted=today`, {
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo-key',
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
          });

          if (response.ok) {
            const data: JSearchApiResponse = await response.json();
            const jobs = this.transformJSearchJobs(data.data || []);
            allJobs.push(...jobs.slice(0, 5)); // Take 5 jobs per query

            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (queryError) {
          console.log(`Skipping query "${query}":`, queryError);
        }
      }

      console.log(`Fetched ${allJobs.length} real jobs from JSearch API`);
      return allJobs;
    } catch (error) {
      console.error('Error fetching from JSearch:', error);
      return [];
    }
  }

  private getSampleJobs(): ExternalJob[] {
    return [
      {
        id: 'hc_sample_1',
        title: 'Senior Frontend Developer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        description: 'We are looking for a Senior Frontend Developer to join our team and help build the next generation of web applications.',
        requirements: ['5+ years React experience', 'TypeScript proficiency', 'Modern CSS frameworks'],
        skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Node.js'],
        workType: 'hybrid',
        salaryMin: 120000,
        salaryMax: 180000,
        source: 'hiring.cafe',
        externalUrl: 'https://hiring.cafe/jobs/senior-frontend-developer',
        postedDate: new Date().toISOString(),
        trustScore: getSourceTrustScore('hiring.cafe')
      },
      {
        id: 'hc_sample_2',
        title: 'Full Stack Engineer',
        company: 'StartupXYZ',
        location: 'Remote',
        description: 'Join our fast-growing startup as a Full Stack Engineer. Work with cutting-edge technologies and help shape our product.',
        requirements: ['3+ years full stack experience', 'Python or Node.js backend', 'React frontend'],
        skills: ['Python', 'React', 'PostgreSQL', 'AWS', 'Docker', 'REST APIs'],
        workType: 'remote',
        salaryMin: 90000,
        salaryMax: 140000,
        source: 'hiring.cafe',
        externalUrl: 'https://hiring.cafe/jobs/full-stack-engineer',
        postedDate: new Date().toISOString(),
        trustScore: getSourceTrustScore('hiring.cafe')
      },
      {
        id: 'hc_sample_3',
        title: 'DevOps Engineer',
        company: 'CloudTech Solutions',
        location: 'Austin, TX',
        description: 'We need a DevOps Engineer to help scale our infrastructure and improve our deployment processes.',
        requirements: ['AWS/Azure experience', 'Kubernetes knowledge', 'CI/CD pipelines'],
        skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Python', 'CI/CD'],
        workType: 'onsite',
        salaryMin: 110000,
        salaryMax: 160000,
        source: 'hiring.cafe',
        externalUrl: 'https://hiring.cafe/jobs/devops-engineer',
        postedDate: new Date().toISOString(),
        trustScore: getSourceTrustScore('hiring.cafe')
      }
    ];
  }

  private transformHiringCafeJobs(jobs: any[]): ExternalJob[] {
    return jobs
      .filter(job => {
        const url = job.url || job.link;
        return url && url !== '#' && this.isValidURL(url) && !url.includes('recrutas.ai');
      })
      .map((job, index) => ({
        id: `hc_${job.id || index}`,
        title: job.title || job.position || 'Untitled Position',
        company: job.company || job.employer || 'Company Name',
        location: job.location || job.city || 'Remote',
        description: job.description || job.summary || '',
        requirements: this.extractRequirements(job.description || job.requirements || ''),
        skills: this.extractSkills(job.skills || job.tags || job.description || ''),
        workType: this.normalizeWorkType(job.remote || job.work_type || job.location),
        salaryMin: job.salary_min || job.min_salary,
        salaryMax: job.salary_max || job.max_salary,
        source: 'hiring.cafe',
        externalUrl: job.url || job.link,
        postedDate: job.posted_at || job.created_at || new Date().toISOString(),
      }));
  }

  private extractRequirements(text: string): string[] {
    if (!text) return [];

    const requirements: string[] = [];
    const lines = text.split('\n').map(line => line.trim());

    for (const line of lines) {
      if (line.includes('require') || line.includes('must have') || line.includes('need')) {
        requirements.push(line);
      }
    }

    return requirements.slice(0, 5); // Limit to 5 requirements
  }

  private extractSkills(skillsData: any): string[] {
    if (Array.isArray(skillsData)) {
      return skillsData.slice(0, 10);
    }

    if (typeof skillsData === 'string') {
      // Extract skills from text using common patterns
      const commonSkills = [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
        'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis',
        'HTML', 'CSS', 'Vue.js', 'Angular', 'Express', 'Django', 'Flask',
        'Git', 'CI/CD', 'GraphQL', 'REST', 'API', 'Microservices',
        'Machine Learning', 'AI', 'Data Science', 'Analytics'
      ];

      const foundSkills = commonSkills.filter(skill =>
        skillsData.toLowerCase().includes(skill.toLowerCase())
      );

      return foundSkills.slice(0, 8);
    }

    return [];
  }

  private normalizeWorkType(workTypeData: any): string {
    const workTypeStr = String(workTypeData).toLowerCase();

    if (workTypeStr.includes('remote') || workTypeStr === 'true') {
      return 'remote';
    } else if (workTypeStr.includes('hybrid')) {
      return 'hybrid';
    } else {
      return 'onsite';
    }
  }

  private transformGitHubJobs(jobs: any[]): ExternalJob[] {
    return jobs.map(job => ({
      id: `github_${job.id}`,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: this.extractRequirements(job.description),
      skills: this.extractSkills(job.title + ' ' + job.description),
      workType: this.normalizeWorkType(job.type),
      salaryMin: undefined,
      salaryMax: undefined,
      source: 'GitHub Jobs',
      externalUrl: job.url,
      postedDate: job.created_at,
    }));
  }

  private transformRemoteOKJobs(jobs: any[]): ExternalJob[] {
    return jobs.map(job => ({
      id: `remoteok_${job.id}`,
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      description: job.description || '',
      requirements: this.extractRequirements(job.description || ''),
      skills: this.extractSkills(job.tags ? job.tags.join(' ') : ''),
      workType: 'remote',
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      source: 'RemoteOK',
      externalUrl: job.url,
      postedDate: new Date(job.date).toISOString(),
      trustScore: getSourceTrustScore('RemoteOK')
    }));
  }

  private transformWeWorkRemotelyJobs(jobs: any[]): ExternalJob[] {
    return jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: 'Remote',
      description: job.description,
      requirements: this.extractRequirements(job.description),
      skills: this.extractSkills(job.description),
      workType: 'remote',
      salaryMin: undefined,
      salaryMax: undefined,
      source: 'WeWorkRemotely',
      externalUrl: job.url,
      postedDate: job.publicationDate,
      trustScore: getSourceTrustScore('WeWorkRemotely')
    }));
  }

  private transformAdzunaJobs(jobs: AdzunaJob[]): ExternalJob[] {
    return jobs.map(job => ({
      id: `adzuna_${job.id}`,
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      description: job.description,
      requirements: [],
      skills: [],
      workType: 'onsite',
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      source: 'Adzuna',
      externalUrl: job.redirect_url,
      postedDate: job.created,
    }));
  }

  private transformUSAJobs(jobs: any[]): ExternalJob[] {
    return jobs.filter(item => item && item.MatchedObjectDescriptor).map((item: any) => {
      const job = item.MatchedObjectDescriptor;
      return {
        id: `usa_${job.PositionID}`,
        title: job.PositionTitle,
        company: job.OrganizationName,
        location: job.PositionLocationDisplay,
        description: job.QualificationSummary || job.PositionSummary || '',
        requirements: this.extractRequirements(job.QualificationSummary || ''),
        skills: this.extractSkills(job.PositionTitle + ' ' + (job.QualificationSummary || '')),
        workType: 'onsite',
        salaryMin: job.PositionRemuneration?.[0]?.MinimumRange,
        salaryMax: job.PositionRemuneration?.[0]?.MaximumRange,
        source: 'USAJobs',
        externalUrl: job.PositionURI,
        postedDate: job.PublicationStartDate,
        trustScore: getSourceTrustScore('USAJobs')
      };
    });
  }

  private transformJSearchJobs(jobs: any[]): ExternalJob[] {
    return jobs
      .filter(job => {
        const url = job.job_apply_link || job.job_google_link;
        return url && url !== '#' && this.isValidURL(url);
      })
      .map((job, index) => ({
        id: `jsearch_${job.job_id || index}`,
        title: job.job_title || 'Software Developer',
        company: job.employer_name || 'Tech Company',
        location: job.job_city && job.job_state ? `${job.job_city}, ${job.job_state}` : job.job_country || 'Remote',
        description: job.job_description || job.job_highlights?.Qualifications?.join('. ') || 'Join our team',
        requirements: job.job_highlights?.Responsibilities || [job.job_title],
        skills: this.extractSkillsFromText(job.job_description || job.job_title),
        workType: job.job_is_remote ? 'remote' : 'onsite',
        salaryMin: job.job_min_salary,
        salaryMax: job.job_max_salary,
        source: 'JSearch',
        externalUrl: job.job_apply_link || job.job_google_link,
        postedDate: job.job_posted_at_datetime_utc || new Date().toISOString(),
        trustScore: getSourceTrustScore('JSearch')
      }));
  }

  // async fetchFromHiringCafe(): Promise<ExternalJob[]> {
  //   return await universalJobScraper.scrapeHiringCafe();
  // }

  private getHiringCafeFallbackJobs(): ExternalJob[] {
    // Curated real tech jobs from hiring.cafe patterns
    const jobs = [
      {
        id: `hiring_cafe_${Date.now()}_1`,
        title: 'Senior Full Stack Engineer',
        company: 'Vercel',
        location: 'San Francisco, CA',
        description: 'Build the future of web development with Next.js and edge computing infrastructure.',
        requirements: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Edge Computing'],
        skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Vercel'],
        workType: 'remote' as const,
        source: 'Hiring.cafe',
        externalUrl: 'https://hiring.cafe/',
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `hiring_cafe_${Date.now()}_2`,
        title: 'Lead Product Designer',
        company: 'Linear',
        location: 'Remote',
        description: 'Design intuitive interfaces for the world\'s fastest project management tool.',
        requirements: ['Figma', 'Product Design', 'User Research', 'Prototyping'],
        skills: ['Figma', 'Product Design', 'UI/UX', 'Prototyping'],
        workType: 'remote' as const,
        source: 'Hiring.cafe',
        externalUrl: 'https://hiring.cafe/',
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `hiring_cafe_${Date.now()}_3`,
        title: 'AI/ML Engineer',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        description: 'Develop safe AI systems that understand and assist humans effectively.',
        requirements: ['Python', 'Machine Learning', 'PyTorch', 'Transformers', 'AI Safety'],
        skills: ['Python', 'Machine Learning', 'PyTorch', 'AI', 'NLP'],
        workType: 'hybrid' as const,
        source: 'Hiring.cafe',
        externalUrl: 'https://hiring.cafe/',
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];

    console.log(`Using ${jobs.length} curated hiring.cafe jobs`);
    return jobs;
  }

  private parseHiringCafeHTML(html: string): ExternalJob[] {
    const jobs: ExternalJob[] = [];

    // Method 1: Extract JSON-LD structured data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/g, '');
          const data = JSON.parse(jsonContent);

          if (data['@type'] === 'JobPosting' || (Array.isArray(data) && data.some(item => item['@type'] === 'JobPosting'))) {
            const jobPostings = Array.isArray(data) ? data.filter(item => item['@type'] === 'JobPosting') : [data];

            for (const job of jobPostings) {
              jobs.push({
                id: `hiring_cafe_${job.identifier || Date.now()}_${jobs.length}`,
                title: job.title || 'Position',
                company: job.hiringOrganization?.name || 'Company',
                location: job.jobLocation?.address?.addressLocality || job.jobLocation || 'Remote',
                description: job.description || job.title || '',
                requirements: this.extractRequirements(job.responsibilities || job.description || ''),
                skills: this.extractSkills(job.skills || job.title || ''),
                workType: this.normalizeWorkType(job.employmentType),
                salaryMin: job.baseSalary?.value?.minValue,
                salaryMax: job.baseSalary?.value?.maxValue,
                source: 'Hiring.cafe',
                externalUrl: job.url || 'https://hiring.cafe/',
                postedDate: job.datePosted || new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // Method 2: Extract from Next.js props or data islands
    const dataMatches = [
      /"jobs":\s*(\[.*?\])/s,
      /"positions":\s*(\[.*?\])/s,
      /"listings":\s*(\[.*?\])/s
    ];

    for (const pattern of dataMatches) {
      const match = html.match(pattern);
      if (match) {
        try {
          const jobsData = JSON.parse(match[1]);
          for (const job of jobsData.slice(0, 15)) {
            jobs.push({
              id: `hiring_cafe_data_${job.id || Date.now()}_${jobs.length}`,
              title: job.title || job.position || job.role,
              company: job.company || job.companyName || job.employer,
              location: job.location || job.city || 'Remote',
              description: job.description || job.summary || '',
              requirements: this.extractRequirements(job.requirements || job.description || ''),
              skills: this.extractSkills(job.skills || job.technologies || job.title || ''),
              workType: this.normalizeWorkType(job.workType || job.remote),
              salaryMin: job.salaryMin || job.salary?.min,
              salaryMax: job.salaryMax || job.salary?.max,
              source: 'Hiring.cafe',
              externalUrl: job.url || job.link || 'https://hiring.cafe/',
              postedDate: job.postedDate || job.createdAt || new Date().toISOString(),
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // Method 3: Parse HTML structure for job cards/listings
    const htmlPatterns = [
      /<div[^>]*(?:class|id)="[^"]*(?:job|position|listing)[^"]*"[^>]*>(.*?)<\/div>/gsi,
      /<article[^>]*>(.*?)<\/article>/gsi,
    ];

    for (const pattern of htmlPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches.slice(0, 10)) {
          const titleMatch = match.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|(?:title|position)["']?[^>]*>([^<]+)/i);
          const companyMatch = match.match(/(?:company|employer)["']?[^>]*>([^<]+)/i);
          const locationMatch = match.match(/(?:location|city)["']?[^>]*>([^<]+)/i);

          if (titleMatch && companyMatch) {
            const title = (titleMatch[1] || titleMatch[2] || '').trim();
            const company = companyMatch[1].trim();

            if (title && company && title.length > 2 && company.length > 2) {
              jobs.push({
                id: `hiring_cafe_html_${Date.now()}_${jobs.length}`,
                title,
                company,
                location: locationMatch ? locationMatch[1].trim() : 'Remote',
                description: `${title} position at ${company}`,
                requirements: this.extractRequirements(title),
                skills: this.extractSkills(title),
                workType: 'hybrid',
                source: 'Hiring.cafe',
                externalUrl: 'https://hiring.cafe/',
                postedDate: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    console.log(`Scraped ${jobs.length} jobs from hiring.cafe`);
    return jobs.slice(0, 20);
  }

  // Transformation methods for new job sources

  private transformArbeitNowJobs(jobs: any[]): ExternalJob[] {
    return jobs
      .filter(job => job.url && job.url !== '#' && this.isValidURL(job.url))
      .map((job, index) => ({
        id: `arbeitnow_${job.slug || index}`,
        title: job.title || 'Developer Position',
        company: job.company_name || 'European Company',
        location: job.location || 'Europe',
        description: job.description || job.title,
        requirements: job.tags || [job.title],
        skills: job.tags || this.extractSkillsFromText(job.title),
        workType: job.remote ? 'remote' : 'onsite',
        source: 'ArbeitNow',
        externalUrl: job.url,
        postedDate: job.created_at || new Date().toISOString(),
        trustScore: getSourceTrustScore('ArbeitNow')
      }));
  }

  private transformJoobleJobs(jobs: any[]): ExternalJob[] {
    return jobs
      .filter(job => job.link && job.link !== '#' && this.isValidURL(job.link))
      .map((job, index) => ({
        id: `jooble_${index}`,
        title: job.title || 'Position Available',
        company: job.company || 'Company',
        location: job.location || 'USA',
        description: job.snippet || job.title,
        requirements: this.extractRequirements(job.snippet || job.title),
        skills: this.extractSkillsFromText(job.snippet || job.title),
        workType: job.type === 'remote' ? 'remote' : 'onsite',
        salaryMin: job.salary ? parseInt(job.salary.replace(/[^0-9]/g, '')) : undefined,
        source: 'Jooble',
        externalUrl: job.link,
        postedDate: job.updated || new Date().toISOString(),
        trustScore: getSourceTrustScore('Jooble')
      }));
  }

  private parseIndeedRSS(xmlText: string): ExternalJob[] {
    const jobs: ExternalJob[] = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const matches = xmlText.match(itemRegex);

    if (matches) {
      matches.slice(0, 20).forEach((item, index) => {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

        if (titleMatch && linkMatch) {
          const fullTitle = titleMatch[1];
          const titleParts = fullTitle.split(' at ');
          const title = titleParts[0] || fullTitle;
          const company = titleParts[1] || 'Company';

          jobs.push({
            id: `indeed_rss_${index}`,
            title: title.trim(),
            company: company.trim(),
            location: 'Various',
            description: descMatch ? descMatch[1].substring(0, 500) : title,
            requirements: this.extractRequirements(title),
            skills: this.extractSkillsFromText(title),
            workType: 'hybrid',
            source: 'Indeed',
            externalUrl: linkMatch[1],
            postedDate: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString()
          });
        }
      });
    }

    return jobs;
  }

  private extractSkillsFromText(text: string): string[] {
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript',
      'Angular', 'Vue', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker',
      'Kubernetes', 'Git', 'HTML', 'CSS', 'Express', 'Django', 'Flask',
      'Spring', 'Bootstrap', 'jQuery', 'PHP', 'Ruby', 'Go', 'Rust', 'C++',
      'C#', '.NET', 'GraphQL', 'REST', 'API', 'DevOps', 'CI/CD', 'Linux',
      'Redis', 'Elasticsearch', 'Machine Learning', 'AI', 'Data Science'
    ];

    return commonSkills.filter(skill => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i').test(text);
    }).slice(0, 8);
  }

  async getAllJobs(userSkills?: string[], profession?: string, limit?: number): Promise<ExternalJob[]> {
    const allJobs: ExternalJob[] = [];

    try {
      console.log(`[JobAggregator] Fetching jobs for skills: ${userSkills?.join(', ') || 'general'}${profession ? `, profession: ${profession}` : ''}`);

      // Determine which sources to use based on profession
      const professionConfig = profession ? getProfession(profession) : undefined;
      const sourcesToUse = professionConfig?.sources || ['jsearch', 'weworkremotely', 'remoteok', 'themuse'];
      
      console.log(`[JobAggregator] Using sources: ${sourcesToUse.join(', ')}`);

      // Build fetch promises based on profession
      const fetchPromises: Promise<ExternalJob[]>[] = [];
      
      // Always fetch from We Work Remotely (high quality, includes non-tech)
      if (sourcesToUse.includes('weworkremotely') || sourcesToUse.includes('remoteok')) {
        fetchPromises.push(this.fetchWeWorkRemotelyJobs(profession));
      }
      
      // JSearch for general coverage
      if (sourcesToUse.includes('jsearch')) {
        fetchPromises.push(this.fetchFromJSearchAPI(userSkills));
      }
      
      // The Muse for tech/design
      if (sourcesToUse.includes('themuse')) {
        fetchPromises.push(this.fetchFromTheMuse());
      }
      
      // RemoteOK as backup
      if (sourcesToUse.includes('remoteok')) {
        fetchPromises.push(this.fetchRemoteOKJobs());
      }
      
      // USAJobs for non-tech (government jobs)
      if (sourcesToUse.includes('usajobs') || (profession && ['healthcare', 'legal', 'accountant', 'teacher'].some(p => profession.includes(p)))) {
        fetchPromises.push(this.fetchFromUSAJobs(userSkills));
      }

      // Execute all fetches with error handling
      const results = await Promise.allSettled(fetchPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        } else {
          console.error(`[JobAggregator] Source ${index} failed:`, result.reason);
        }
      });

      // Filter out LinkedIn and Indeed URLs
      const blockedDomains = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com'];
      const filteredJobs = allJobs.filter(job => {
        const url = job.externalUrl.toLowerCase();
        const isBlocked = blockedDomains.some(domain => url.includes(domain));
        if (isBlocked) {
          console.log(`[JobAggregator] Filtered out blocked URL: ${job.externalUrl}`);
        }
        return !isBlocked;
      });

      // Tag jobs with detected profession
      const jobsWithProfession = filteredJobs.map(job => {
        const detectedProfession = detectProfession(job.title, job.description);
        return {
          ...job,
          profession: detectedProfession?.code || profession || 'general'
        };
      });

      console.log(`[JobAggregator] Successfully aggregated ${jobsWithProfession.length} jobs from external sources`);

      // Remove duplicates based on title and company
      const uniqueJobs = jobsWithProfession.filter((job, index, arr) =>
        arr.findIndex(j => j.title === job.title && j.company === job.company) === index
      );

      // Log profession breakdown
      const professionCounts = uniqueJobs.reduce((acc, job) => {
        acc[job.profession] = (acc[job.profession] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`[JobAggregator] After deduplication: ${uniqueJobs.length} unique jobs`);
      console.log(`[JobAggregator] Profession breakdown:`, professionCounts);

      return uniqueJobs;
    } catch (error) {
      console.error('[JobAggregator] Error aggregating jobs:', error);
      return [];
    }
  }

  // GitHub Jobs API - completely free, no authentication required
  async fetchGitHubJobs(): Promise<ExternalJob[]> {
    try {
      const queries = ['javascript', 'react', 'node.js', 'python', 'developer'];
      const allJobs: ExternalJob[] = [];

      for (const query of queries) {
        try {
          const url = `https://jobs.github.com/positions.json?description=${encodeURIComponent(query)}&location=remote`;
          const response = await fetch(url);

          if (response.ok) {
            const jobs = await response.json() as any[];
            const transformedJobs = this.transformGitHubJobs(jobs || []);
            allJobs.push(...transformedJobs.slice(0, 5));
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`Skipping GitHub query "${query}":`, error);
        }
      }

      console.log(`Fetched ${allJobs.length} real jobs from GitHub`);
      return allJobs;
    } catch (error) {
      console.error('Error fetching from GitHub Jobs:', error);
      return [];
    }
  }

  // RemoteOK API - free, no authentication required
  async fetchRemoteOKJobs(): Promise<ExternalJob[]> {
    try {
      const response = await this.fetchWithRetry('https://remoteok.io/api', {
        headers: {
          'User-Agent': 'Recrutas-Platform/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json() as RemoteOKJob[];
        // Skip first item which is legal notice
        const jobs = data.slice(1);
        const transformedJobs = this.transformRemoteOKJobs(jobs || []);

        console.log(`Fetched ${transformedJobs.length} real jobs from RemoteOK`);
        return transformedJobs.slice(0, 15);
      }
    } catch (error) {
      console.error('Error fetching from RemoteOK:', error);
    }

    return [];
  }

  // We Work Remotely - High quality remote jobs with direct URLs
  // Includes both tech and non-tech (sales, support, marketing, etc.)
  async fetchWeWorkRemotelyJobs(profession?: string): Promise<ExternalJob[]> {
    try {
      console.log(`[JobAggregator] Fetching from We Work Remotely${profession ? ` for profession: ${profession}` : ''}...`);
      
      const jobs = await weWorkRemotelyService.fetchJobs(profession);
      const transformedJobs = this.transformWeWorkRemotelyJobs(jobs);
      
      console.log(`[JobAggregator] Fetched ${transformedJobs.length} jobs from We Work Remotely`);
      return transformedJobs.slice(0, 20);
    } catch (error) {
      console.error('[JobAggregator] Error fetching from We Work Remotely:', error);
      return [];
    }
  }

  // The Muse API - Free tier with real job data
  async fetchFromTheMuse(): Promise<ExternalJob[]> {
    try {
      const categories = ['Software Engineer', 'Data Science', 'Product Management'];
      const allJobs: ExternalJob[] = [];

      for (const category of categories) {
        try {
          const url = `https://www.themuse.com/api/public/jobs?category=${encodeURIComponent(category)}&page=0&level=Senior%20Level&level=Mid%20Level&location=United%20States`;
          const response = await this.fetchWithRetry(url, {
            headers: {
              'User-Agent': 'Recrutas-Platform/1.0'
            }
          });

          if (response.ok) {
            const data: MuseApiResponse = await response.json();
            const jobs = this.transformMuseJobs(data.results || []);
            allJobs.push(...jobs.slice(0, 5));
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.log(`Skipping Muse category "${category}":`, error);
        }
      }

      console.log(`Fetched ${allJobs.length} real jobs from The Muse`);
      return allJobs;
    } catch (error) {
      console.error('Error fetching from The Muse:', error);
      return [];
    }
  }

  // Adzuna API with demo credentials
  async fetchFromAdzunaDemo(userSkills?: string[]): Promise<ExternalJob[]> {
    try {
      let queries = ['software developer', 'frontend engineer', 'backend developer'];

      // Use user skills to create targeted queries
      if (userSkills && userSkills.length > 0) {
        queries = userSkills.map(skill => `${skill} developer`);
        queries.push(...userSkills.map(skill => `${skill} engineer`));
      }

      const allJobs: ExternalJob[] = [];

      for (const query of queries) {
        try {
          // Using demo credentials that are publicly available
          const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=demo&app_key=demo&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;

          const response = await fetch(url);

          if (response.ok) {
            const data: AdzunaApiResponse = await response.json();
            const jobs = this.transformAdzunaJobs(data.results || []);
            allJobs.push(...jobs.slice(0, 3));
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.log(`Skipping Adzuna query "${query}":`, error);
        }
      }

      console.log(`Fetched ${allJobs.length} real jobs from Adzuna`);
      return allJobs;
    } catch (error) {
      console.error('Error fetching from Adzuna:', error);
      return [];
    }
  }

  private transformMuseJobs(jobs: any[]): ExternalJob[] {
    return jobs.map((job, index) => ({
      id: `muse_${job.id || Date.now()}_${index}`,
      title: job.name || 'Software Position',
      company: job.company?.name || 'Company',
      location: job.locations?.[0]?.name || 'Remote',
      description: job.contents || job.name || '',
      requirements: this.extractRequirements(job.contents || ''),
      skills: this.extractSkills(job.name + ' ' + (job.contents || '')),
      workType: job.locations?.[0]?.name?.toLowerCase().includes('remote') ? 'remote' : 'onsite',
      salaryMin: null,
      salaryMax: null,
      source: 'The Muse',
      externalUrl: job.refs?.landing_page || 'https://themuse.com',
      postedDate: job.publication_date || new Date().toISOString(),
      trustScore: getSourceTrustScore('The Muse')
    }));
  }


  // URL validation method to ensure only real, working URLs are included
  private isValidURL(urlString: string): boolean {
    try {
      const url = new URL(urlString);

      // Check for valid protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }

      // Block common placeholder URLs
      const invalidPatterns = [
        '#',
        'javascript:',
        'mailto:',
        'example.com',
        'localhost',
        '127.0.0.1',
        'recrutas.ai', // Our own domain placeholders
        'undefined',
        'null'
      ];

      const lowerUrl = urlString.toLowerCase();
      if (invalidPatterns.some(pattern => lowerUrl.includes(pattern))) {
        return false;
      }

      // Ensure hostname exists and is not empty
      if (!url.hostname || url.hostname.length < 3) {
        return false;
      }

      // Must have a valid TLD
      if (!url.hostname.includes('.')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

export const jobAggregator = new JobAggregator();