import { jobAggregator } from './job-aggregator';
import { companyJobsAggregator } from './company-jobs-aggregator';
import { jobCache } from './job-cache';
export class InstantJobDelivery {
    deliveryQueue = new Map();
    DELIVERY_INTERVAL = 5000; // 5 seconds
    MAX_JOBS_PER_DELIVERY = 3;
    constructor() {
        this.startInstantDelivery();
    }
    async getInstantJobs(request) {
        const cacheKey = this.generateCacheKey(request);
        // Check cache first for instant response
        const cachedJobs = jobCache.get(request.skills, 20);
        if (cachedJobs && cachedJobs.length > 0) {
            return this.processAndRankJobs(cachedJobs, request);
        }
        // Fetch from multiple sources simultaneously
        const [externalJobs, companyJobs] = await Promise.all([
            this.fetchExternalJobs(request),
            this.fetchCompanyJobs(request)
        ]);
        const allJobs = [...externalJobs, ...companyJobs];
        const rankedJobs = this.processAndRankJobs(allJobs, request);
        // Cache results for faster subsequent requests
        jobCache.set(rankedJobs, request.skills, 20);
        return rankedJobs.slice(0, 15); // Return top 15 instant matches
    }
    async fetchExternalJobs(request) {
        try {
            // Use public job sources that don't require API keys
            const [indeedJobs, usaJobs, githubJobs] = await Promise.all([
                jobAggregator.fetchFromIndeedRSS(request.skills),
                jobAggregator.fetchFromUSAJobs(request.skills),
                jobAggregator.fetchGitHubJobs()
            ]);
            return [...indeedJobs, ...usaJobs, ...githubJobs];
        }
        catch (error) {
            console.error('Error fetching external jobs:', error);
            return [];
        }
    }
    async fetchCompanyJobs(request) {
        try {
            // Fetch from major tech companies
            return await companyJobsAggregator.getAllCompanyJobs(request.skills, 10);
        }
        catch (error) {
            console.error('Error fetching company jobs:', error);
            return [];
        }
    }
    processAndRankJobs(jobs, request) {
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
    calculateMatchScore(job, request) {
        let score = 0;
        // Skill matching (40% weight)
        if (request.skills && request.skills.length > 0) {
            const jobSkills = job.skills?.map((s) => s.toLowerCase()) || [];
            const jobText = `${job.title} ${job.description}`.toLowerCase();
            const matchedSkills = request.skills.filter(skill => jobSkills.some(js => js.includes(skill.toLowerCase())) ||
                jobText.includes(skill.toLowerCase()));
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
    calculateUrgency(job, request) {
        const matchScore = this.calculateMatchScore(job, request);
        if (matchScore >= 80)
            return 'high';
        if (matchScore >= 60)
            return 'medium';
        return 'low';
    }
    formatSalaryRange(min, max) {
        if (!min && !max)
            return undefined;
        if (min && max)
            return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
        if (min)
            return `$${min.toLocaleString()}+`;
        if (max)
            return `Up to $${max.toLocaleString()}`;
        return undefined;
    }
    generateCacheKey(request) {
        return `instant_${request.skills.join('_')}_${request.jobTitle || 'any'}_${request.location || 'any'}`;
    }
    startInstantDelivery() {
        setInterval(() => {
            this.processDeliveryQueue();
        }, this.DELIVERY_INTERVAL);
    }
    async processDeliveryQueue() {
        // Process pending job deliveries
        for (const [userId, jobs] of this.deliveryQueue.entries()) {
            if (jobs.length > 0) {
                const jobsToDeliver = jobs.splice(0, this.MAX_JOBS_PER_DELIVERY);
                // In a real implementation, you would send these via WebSocket
                console.log(`Delivering ${jobsToDeliver.length} instant jobs to user ${userId}`);
            }
        }
    }
    async scheduleInstantDelivery(userId, jobs) {
        if (!this.deliveryQueue.has(userId)) {
            this.deliveryQueue.set(userId, []);
        }
        const userQueue = this.deliveryQueue.get(userId);
        userQueue.push(...jobs);
    }
    // Public RSS and API sources that work without authentication
    async fetchFromPublicSources() {
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
                    }
                    else {
                        jobs.push(...this.parseJSONAPI(data, source));
                    }
                }
            }
            catch (error) {
                console.log(`Could not fetch from ${source}:`, error.message);
            }
        }
        return jobs;
    }
    parseRSSFeed(xml, source) {
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
        }
        catch (error) {
            console.error('Error parsing RSS feed:', error);
        }
        return jobs;
    }
    parseJSONAPI(json, source) {
        try {
            const data = JSON.parse(json);
            // Handle different API response formats
            return data.jobs || data.data || [];
        }
        catch (error) {
            return [];
        }
    }
    extractCompanyFromTitle(title) {
        // Extract company name from job title
        const parts = title.split(' at ');
        return parts.length > 1 ? parts[parts.length - 1] : 'Company';
    }
    extractLocationFromDescription(description) {
        // Extract location from job description
        const locationPatterns = [
            /Location:?\s*([^,\n]+)/i,
            /Based in\s*([^,\n]+)/i,
            /([A-Z][a-z]+,?\s*[A-Z]{2})/,
            /(Remote|Worldwide|Global)/i
        ];
        for (const pattern of locationPatterns) {
            const match = description.match(pattern);
            if (match)
                return match[1].trim();
        }
        return 'Not specified';
    }
    extractSkillsFromText(text) {
        const commonSkills = [
            'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript',
            'PHP', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
            'Vue.js', 'Angular', 'Django', 'Flask', 'Express', 'Spring',
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
            'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'DevOps', 'Machine Learning',
            'AI', 'Data Science', 'Frontend', 'Backend', 'Full Stack'
        ];
        const textLower = text.toLowerCase();
        return commonSkills.filter(skill => textLower.includes(skill.toLowerCase()));
    }
    extractWorkTypeFromText(text) {
        const textLower = text.toLowerCase();
        if (textLower.includes('remote') || textLower.includes('work from home'))
            return 'remote';
        if (textLower.includes('hybrid'))
            return 'hybrid';
        return 'onsite';
    }
}
export const instantJobDelivery = new InstantJobDelivery();
