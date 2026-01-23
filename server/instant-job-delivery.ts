import { jobAggregator } from './job-aggregator';
import { companyJobsAggregator } from './company-jobs-aggregator';
import { jobCache } from './job-cache';

interface InstantJobRequest {
  skills: string[];
  jobTitle?: string;
  location?: string;
  workType?: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  experience?: 'entry' | 'mid' | 'senior';
}

interface InstantJobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  workType: string;
  salaryRange?: string;
  matchScore: number;
  source: string;
  externalUrl: string;
  postedDate: string;
  urgency: 'low' | 'medium' | 'high';
}

export class InstantJobDelivery {
  private deliveryQueue: Map<string, InstantJobResult[]> = new Map();
  private readonly DELIVERY_INTERVAL = 5000; // 5 seconds
  private readonly MAX_JOBS_PER_DELIVERY = 3;

  constructor() {
    this.startInstantDelivery();
  }

  async getInstantJobs(request: InstantJobRequest): Promise<InstantJobResult[]> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first for instant response
    const cachedJobs = jobCache.get(request.skills, 20);
    if (cachedJobs && cachedJobs.length > 0) {
      return this.processAndRankJobs(cachedJobs, request);
    }

    // Fetch from multiple sources simultaneously with fault tolerance
    const results = await Promise.allSettled([
      this.fetchExternalJobs(request),
      this.fetchCompanyJobs(request)
    ]);

    // Collect successful results, ignore failures
    const allJobs: any[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
      } else {
        console.warn('Job source failed:', result.reason);
      }
    }
    const rankedJobs = this.processAndRankJobs(allJobs, request);
    
    // Cache results for faster subsequent requests
    jobCache.set(rankedJobs, request.skills, 20);
    
    return rankedJobs.slice(0, 15); // Return top 15 instant matches
  }

  private async fetchExternalJobs(request: InstantJobRequest): Promise<any[]> {
    try {
      // Use public job sources that don't require API keys with fault tolerance
      const results = await Promise.allSettled([
        jobAggregator.fetchFromIndeedRSS(request.skills),
        jobAggregator.fetchFromUSAJobs(request.skills),
        jobAggregator.fetchGitHubJobs()
      ]);

      // Collect successful results, log failures but continue
      const jobs: any[] = [];
      const sourceNames = ['Indeed RSS', 'USAJobs', 'GitHub Jobs'];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          jobs.push(...result.value);
        } else {
          console.warn(`${sourceNames[i]} failed:`, result.reason?.message || result.reason);
        }
      }

      return jobs;
    } catch (error) {
      console.error('Error fetching external jobs:', error);
      return [];
    }
  }

  private async fetchCompanyJobs(request: InstantJobRequest): Promise<any[]> {
    try {
      // Fetch from major tech companies
      return await companyJobsAggregator.getAllCompanyJobs(request.skills, 10);
    } catch (error) {
      console.error('Error fetching company jobs:', error);
      return [];
    }
  }

  private processAndRankJobs(jobs: any[], request: InstantJobRequest): InstantJobResult[] {
    return jobs.map(job => ({
      id: job.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      skills: job.skills || [],
      workType: job.workType || 'onsite',
      salaryRange: this.formatSalaryRange(job.salaryMin, job.salaryMax),
      matchScore: this.calculateMatchScore(job, request),
      source: job.source || 'external',
      externalUrl: job.externalUrl || job.url || '#',
      postedDate: job.postedDate || new Date().toISOString(),
      urgency: this.calculateUrgency(job, request)
    }))
    .filter(job => job.matchScore > 30) // Only show relevant jobs
    .sort((a, b) => b.matchScore - a.matchScore); // Sort by relevance
  }

  private calculateMatchScore(job: any, request: InstantJobRequest): number {
    let score = 0;
    
    // Skill matching (40% weight)
    if (request.skills && request.skills.length > 0) {
      const jobSkills = job.skills?.map((s: string) => s.toLowerCase()) || [];
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      
      const matchedSkills = request.skills.filter(skill => 
        jobSkills.some(js => js.includes(skill.toLowerCase())) ||
        jobText.includes(skill.toLowerCase())
      );
      
      score += (matchedSkills.length / request.skills.length) * 40;
    }

    // Title matching (30% weight)
    if (request.jobTitle) {
      const titleWords = request.jobTitle.toLowerCase().split(' ');
      const jobTitle = job.title.toLowerCase();
      const titleMatches = titleWords.filter(word => jobTitle.includes(word));
      score += (titleMatches.length / titleWords.length) * 30;
    }

    // Location matching (20% weight)
    if (request.location && request.location !== 'any') {
      if (job.workType === 'remote' || job.location.toLowerCase().includes(request.location.toLowerCase())) {
        score += 20;
      }
    }

    // Work type matching (10% weight)
    if (request.workType && job.workType === request.workType) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateUrgency(job: any, request: InstantJobRequest): 'low' | 'medium' | 'high' {
    const matchScore = this.calculateMatchScore(job, request);
    
    if (matchScore >= 80) return 'high';
    if (matchScore >= 60) return 'medium';
    return 'low';
  }

  private formatSalaryRange(min?: number, max?: number): string | undefined {
    if (!min && !max) return undefined;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return undefined;
  }

  private generateCacheKey(request: InstantJobRequest): string {
    return `instant_${request.skills.join('_')}_${request.jobTitle || 'any'}_${request.location || 'any'}`;
  }

  private startInstantDelivery() {
    setInterval(() => {
      this.processDeliveryQueue();
    }, this.DELIVERY_INTERVAL);
  }

  private async processDeliveryQueue() {
    // Process pending job deliveries
    for (const [userId, jobs] of this.deliveryQueue.entries()) {
      if (jobs.length > 0) {
        const jobsToDeliver = jobs.splice(0, this.MAX_JOBS_PER_DELIVERY);
        // In a real implementation, you would send these via WebSocket
        console.log(`Delivering ${jobsToDeliver.length} instant jobs to user ${userId}`);
      }
    }
  }

  async scheduleInstantDelivery(userId: string, jobs: InstantJobResult[]) {
    if (!this.deliveryQueue.has(userId)) {
      this.deliveryQueue.set(userId, []);
    }
    
    const userQueue = this.deliveryQueue.get(userId)!;
    userQueue.push(...jobs);
  }

  // Public RSS and API sources that work without authentication
  async fetchFromPublicSources(): Promise<any[]> {
    const sources = [
      // Stack Overflow Jobs RSS (if available)
      'https://stackoverflow.com/jobs/feed',
      // AngelList/Wellfound public API
      'https://angel.co/api/1/jobs',
      // Remote OK RSS
      'https://remoteok.io/remote-jobs.rss',
      // We Work Remotely RSS
      'https://weworkremotely.com/remote-jobs.rss'
    ];

    const jobs = [];
    for (const source of sources) {
      try {
        const response = await fetch(source);
        if (response.ok) {
          const data = await response.text();
          // Parse RSS or JSON depending on source
          if (source.includes('.rss')) {
            jobs.push(...this.parseRSSFeed(data, source));
          } else {
            jobs.push(...this.parseJSONAPI(data, source));
          }
        }
      } catch (error) {
        console.log(`Could not fetch from ${source}:`, error.message);
      }
    }

    return jobs;
  }

  private parseRSSFeed(xml: string, source: string): any[] {
    // Basic RSS parsing for job feeds
    const jobs = [];
    try {
      const titleMatches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
      const linkMatches = xml.match(/<link>(.*?)<\/link>/g);
      const descMatches = xml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/g);

      if (titleMatches && linkMatches) {
        for (let i = 0; i < Math.min(titleMatches.length, 10); i++) {
          const title = titleMatches[i]?.match(/\[CDATA\[(.*?)\]\]/)?.[1] || '';
          const link = linkMatches[i]?.match(/<link>(.*?)<\/link>/)?.[1] || '';
          const description = descMatches?.[i]?.match(/\[CDATA\[(.*?)\]\]/)?.[1] || '';

          if (title && link) {
            jobs.push({
              id: `${source}_${i}`,
              title,
              company: this.extractCompanyFromTitle(title),
              location: this.extractLocationFromDescription(description),
              description,
              skills: this.extractSkillsFromText(description),
              workType: this.extractWorkTypeFromText(description),
              source: source.includes('remoteok') ? 'RemoteOK' : 'RSS Feed',
              externalUrl: link,
              postedDate: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
    }

    return jobs;
  }

  private parseJSONAPI(json: string, source: string): any[] {
    try {
      const data = JSON.parse(json);
      // Handle different API response formats
      return data.jobs || data.data || [];
    } catch (error) {
      return [];
    }
  }

  private extractCompanyFromTitle(title: string): string {
    // Extract company name from job title
    const parts = title.split(' at ');
    return parts.length > 1 ? parts[parts.length - 1] : 'Company';
  }

  private extractLocationFromDescription(description: string): string {
    // Extract location from job description
    const locationPatterns = [
      /Location:?\s*([^,\n]+)/i,
      /Based in\s*([^,\n]+)/i,
      /([A-Z][a-z]+,?\s*[A-Z]{2})/,
      /(Remote|Worldwide|Global)/i
    ];

    for (const pattern of locationPatterns) {
      const match = description.match(pattern);
      if (match) return match[1].trim();
    }

    return 'Not specified';
  }

  private extractSkillsFromText(text: string): string[] {
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript',
      'PHP', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      'Vue.js', 'Angular', 'Django', 'Flask', 'Express', 'Spring',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
      'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'DevOps', 'Machine Learning',
      'AI', 'Data Science', 'Frontend', 'Backend', 'Full Stack'
    ];

    const textLower = text.toLowerCase();
    return commonSkills.filter(skill => 
      textLower.includes(skill.toLowerCase())
    );
  }

  private extractWorkTypeFromText(text: string): string {
    const textLower = text.toLowerCase();
    if (textLower.includes('remote') || textLower.includes('work from home')) return 'remote';
    if (textLower.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }
}

export const instantJobDelivery = new InstantJobDelivery();