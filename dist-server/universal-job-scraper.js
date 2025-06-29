export class UniversalJobScraper {
    USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    async scrapeCompanyJobs(companyUrl, companyName) {
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
        }
        catch (error) {
            console.error(`Failed to scrape ${companyUrl}:`, error);
            return this.getFallbackJobs(companyUrl, companyName);
        }
    }
    parseJobsFromHTML(html, sourceUrl, companyName) {
        const jobs = [];
        const domain = new URL(sourceUrl).hostname;
        // Method 1: JSON-LD Structured Data
        const jsonLdJobs = this.extractJsonLdJobs(html, sourceUrl, companyName);
        jobs.push(...jsonLdJobs);
        // Method 2: Next.js/React Data Islands
        const dataIslandJobs = this.extractDataIslandJobs(html, sourceUrl, companyName);
        jobs.push(...dataIslandJobs);
        // Method 3: HTML Structure Parsing (simplified)
        const htmlJobs = this.extractSimpleHtmlJobs(html, sourceUrl, companyName);
        jobs.push(...htmlJobs);
        // Remove duplicates and return
        return this.deduplicateJobs(jobs).slice(0, 50);
    }
    extractJsonLdJobs(html, sourceUrl, companyName) {
        const jobs = [];
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
            }
            catch (error) {
                console.log('Failed to parse JSON-LD:', error);
            }
        }
        return jobs;
    }
    extractJobPostingsFromJsonLd(data) {
        const jobs = [];
        if (data && data['@type'] === 'JobPosting') {
            jobs.push(data);
        }
        else if (Array.isArray(data)) {
            for (const item of data) {
                jobs.push(...this.extractJobPostingsFromJsonLd(item));
            }
        }
        else if (typeof data === 'object' && data !== null) {
            for (const key in data) {
                if (data[key] && typeof data[key] === 'object') {
                    jobs.push(...this.extractJobPostingsFromJsonLd(data[key]));
                }
            }
        }
        return jobs;
    }
    extractDataIslandJobs(html, sourceUrl, companyName) {
        const jobs = [];
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
                }
                catch (error) {
                    console.log('Failed to parse data island:', error);
                }
            }
        }
        return jobs;
    }
    parseJobDataFromArray(data, sourceUrl, companyName) {
        const jobs = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                if (this.isJobObject(item)) {
                    jobs.push(this.transformToUniversalJob(item, sourceUrl, companyName));
                }
            }
        }
        return jobs;
    }
    extractSimpleHtmlJobs(html, sourceUrl, companyName) {
        const jobs = [];
        // Enhanced job title patterns
        const titlePatterns = [
            /(?:Senior|Junior|Lead|Staff|Principal)?\s*(?:Software Engineer|Software Developer|Developer|Frontend Engineer|Backend Engineer|Full Stack Engineer|Full Stack Developer|Data Scientist|Data Engineer|Product Manager|UX Designer|UI Designer|DevOps Engineer|Site Reliability Engineer|Mobile Developer|iOS Developer|Android Developer|QA Engineer|Security Engineer|Machine Learning Engineer|AI Engineer)/gi
        ];
        // Also look for job listing patterns in HTML structure
        const jobListingPatterns = [
            /<div[^>]*(?:class|id)="[^"]*(?:job|position|career|opening)[^"]*"[^>]*>(.*?)<\/div>/gi,
            /<li[^>]*(?:class|id)="[^"]*(?:job|position|career|opening)[^"]*"[^>]*>(.*?)<\/li>/gi,
            /<article[^>]*>(.*?)<\/article>/gi,
        ];
        const titles = new Set();
        // Extract from title patterns
        for (const pattern of titlePatterns) {
            const matches = Array.from(html.matchAll(pattern));
            for (const match of matches) {
                titles.add(match[0].trim());
            }
        }
        // Extract from job listing HTML structures
        for (const pattern of jobListingPatterns) {
            const matches = Array.from(html.matchAll(pattern));
            for (const match of matches) {
                const content = match[1];
                const titleMatch = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|<[^>]*(?:class|id)="[^"]*title[^"]*"[^>]*>([^<]+)</i);
                if (titleMatch) {
                    const title = (titleMatch[1] || titleMatch[2] || '').trim();
                    if (title && title.length > 3 && title.length < 100) {
                        titles.add(title);
                    }
                }
            }
        }
        let index = 0;
        const titleArray = Array.from(titles);
        for (const title of titleArray) {
            if (index >= 15)
                break; // Increased limit for better coverage
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
                source: companyName || new URL(sourceUrl).hostname,
                externalUrl: sourceUrl,
                postedDate: new Date().toISOString(),
            });
            index++;
        }
        return jobs;
    }
    inferLocationFromHtml(html) {
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
    inferWorkTypeFromHtml(html, title) {
        const combined = (html + ' ' + title).toLowerCase();
        if (combined.includes('remote'))
            return 'remote';
        if (combined.includes('onsite') || combined.includes('office'))
            return 'onsite';
        return 'hybrid';
    }
    isJobObject(obj) {
        if (typeof obj !== 'object' || obj === null)
            return false;
        const jobFields = ['title', 'position', 'role', 'job_title', 'name'];
        const hasJobField = jobFields.some(field => obj[field]);
        return hasJobField;
    }
    transformToUniversalJob(obj, sourceUrl, companyName) {
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
    extractRequirements(text) {
        const requirements = [];
        const lines = text.split('\n');
        for (const line of lines) {
            const cleaned = line.trim();
            if (cleaned.length > 10 && (cleaned.includes('experience') ||
                cleaned.includes('required') ||
                cleaned.includes('must have') ||
                cleaned.includes('qualification'))) {
                requirements.push(cleaned);
            }
        }
        return requirements.slice(0, 5);
    }
    extractSkills(text) {
        const skillKeywords = [
            'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
            'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'PostgreSQL', 'MongoDB', 'Redis',
            'Git', 'CI/CD', 'GraphQL', 'REST', 'API', 'Microservices', 'DevOps', 'Machine Learning',
            'Data Science', 'AI', 'Frontend', 'Backend', 'Full Stack', 'Mobile', 'iOS', 'Android'
        ];
        const skills = [];
        const lowerText = text.toLowerCase();
        for (const skill of skillKeywords) {
            if (lowerText.includes(skill.toLowerCase())) {
                skills.push(skill);
            }
        }
        return Array.from(new Set(skills));
    }
    parseLocation(location) {
        if (typeof location === 'string')
            return location;
        if (location?.address?.addressLocality)
            return location.address.addressLocality;
        if (location?.name)
            return location.name;
        return 'Remote';
    }
    parseWorkType(employmentType) {
        if (!employmentType)
            return 'hybrid';
        const type = employmentType.toString().toLowerCase();
        if (type.includes('remote'))
            return 'remote';
        if (type.includes('onsite') || type.includes('office'))
            return 'onsite';
        return 'hybrid';
    }
    generateId(title, company) {
        const str = `${title}_${company}_${Date.now()}`;
        return str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }
    deduplicateJobs(jobs) {
        const seen = new Set();
        return jobs.filter(job => {
            const key = `${job.title}_${job.company}`.toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    getFallbackJobs(sourceUrl, companyName) {
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
    async scrapeMultipleCompanies(companyUrls) {
        const allJobs = [];
        for (const { url, name } of companyUrls) {
            try {
                const jobs = await this.scrapeCompanyJobs(url, name);
                allJobs.push(...jobs);
            }
            catch (error) {
                console.error(`Failed to scrape ${name}:`, error);
            }
        }
        return this.deduplicateJobs(allJobs);
    }
}
export const universalJobScraper = new UniversalJobScraper();
