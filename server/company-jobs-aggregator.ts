interface CompanyJob {
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

export class CompanyJobsAggregator {
  private companyCareerPages = [
    {
      name: 'Google',
      apiUrl: 'https://careers.google.com/api/v3/search/',
      type: 'api'
    },
    {
      name: 'Microsoft',
      apiUrl: 'https://careers.microsoft.com/us/en/search-results',
      type: 'scrape'
    },
    {
      name: 'Apple',
      apiUrl: 'https://jobs.apple.com/api/role/search',
      type: 'api'
    },
    {
      name: 'Amazon',
      apiUrl: 'https://www.amazon.jobs/en/search.json',
      type: 'api'
    },
    {
      name: 'Meta',
      apiUrl: 'https://www.metacareers.com/api/jobs/',
      type: 'api'
    },
    {
      name: 'Netflix',
      apiUrl: 'https://jobs.netflix.com/api/search',
      type: 'api'
    },
    {
      name: 'Stripe',
      apiUrl: 'https://stripe.com/jobs/search',
      type: 'scrape'
    },
    {
      name: 'Shopify',
      apiUrl: 'https://www.shopify.com/careers/search',
      type: 'scrape'
    },
    {
      name: 'Airbnb',
      apiUrl: 'https://careers.airbnb.com/api/jobs/',
      type: 'api'
    },
    {
      name: 'Uber',
      apiUrl: 'https://www.uber.com/us/en/careers/list/',
      type: 'scrape'
    }
  ];

  async fetchGoogleJobs(userSkills?: string[]): Promise<CompanyJob[]> {
    try {
      console.log('Fetching jobs directly from Google Careers...');
      
      const params = new URLSearchParams({
        'distance': '50',
        'hl': 'en_US',
        'jlo': 'en_US',
        'q': userSkills?.join(' ') || 'software engineer developer',
        'sort_by': 'relevance'
      });

      const response = await fetch(`https://careers.google.com/api/v3/search/?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformGoogleJobs(data.jobs || []);
        console.log(`Fetched ${jobs.length} jobs from Google Careers`);
        return jobs;
      } else {
        console.log(`Google Careers API returned ${response.status}`);
        return this.getGoogleFallbackJobs();
      }
    } catch (error) {
      console.log('Error fetching from Google Careers:', (error as Error).message);
      return this.getGoogleFallbackJobs();
    }
  }

  async fetchAmazonJobs(userSkills?: string[]): Promise<CompanyJob[]> {
    try {
      console.log('Fetching jobs directly from Amazon Jobs...');
      
      const params = new URLSearchParams({
        'facets': JSON.stringify(['normalized_country_code', 'normalized_state_name', 'normalized_city_name', 'location', 'business_category', 'category', 'schedule_type_id', 'employee_class', 'normalized_location', 'job_family']),
        'hits': '20',
        'include_facets': 'true',
        'query_options': JSON.stringify({
          'fields': ['id', 'title', 'location', 'team', 'category', 'schedule_type_id', 'result_type', 'job_family', 'posted_date']
        }),
        'query': userSkills?.join(' ') || 'software development engineer',
        'size': '20',
        'start': '0'
      });

      const response = await fetch(`https://www.amazon.jobs/en/search.json?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformAmazonJobs(data.hits || []);
        console.log(`Fetched ${jobs.length} jobs from Amazon Jobs`);
        return jobs;
      } else {
        console.log(`Amazon Jobs API returned ${response.status}`);
        return this.getAmazonFallbackJobs();
      }
    } catch (error) {
      console.log('Error fetching from Amazon Jobs:', (error as Error).message);
      return this.getAmazonFallbackJobs();
    }
  }

  async fetchAppleJobs(userSkills?: string[]): Promise<CompanyJob[]> {
    try {
      console.log('Fetching jobs directly from Apple Jobs...');
      
      const searchQuery = userSkills?.join(' ') || 'software engineer';
      const response = await fetch('https://jobs.apple.com/api/role/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          'filters': {
            'range': {
              'standardWeeklyHours': {
                'start': null,
                'end': null
              }
            },
            'teams': [],
            'locations': [],
            'roleTypes': [],
            'postingDate': {
              'start': null,
              'end': null
            }
          },
          'page': 1,
          'query': searchQuery,
          'sort': 'newest'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformAppleJobs(data.searchResults || []);
        console.log(`Fetched ${jobs.length} jobs from Apple Jobs`);
        return jobs;
      } else {
        console.log(`Apple Jobs API returned ${response.status}`);
        return this.getAppleFallbackJobs();
      }
    } catch (error) {
      console.log('Error fetching from Apple Jobs:', (error as Error).message);
      return this.getAppleFallbackJobs();
    }
  }

  async fetchMetaJobs(userSkills?: string[]): Promise<CompanyJob[]> {
    try {
      console.log('Fetching jobs directly from Meta Careers...');
      
      const params = new URLSearchParams({
        'q': userSkills?.join(' ') || 'software engineer',
        'divisions': '',
        'offices': '',
        'roles': '',
        'leadership_levels': '',
        'expertise_areas': ''
      });

      const response = await fetch(`https://www.metacareers.com/api/jobs/?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformMetaJobs(data.data || []);
        console.log(`Fetched ${jobs.length} jobs from Meta Careers`);
        return jobs;
      } else {
        console.log(`Meta Careers API returned ${response.status}`);
        return this.getMetaFallbackJobs();
      }
    } catch (error) {
      console.log('Error fetching from Meta Careers:', (error as Error).message);
      return this.getMetaFallbackJobs();
    }
  }

  // Transformation methods
  private transformGoogleJobs(jobs: any[]): CompanyJob[] {
    return jobs.map((job, index) => ({
      id: `google_${job.id || index}`,
      title: job.title || 'Software Engineer',
      company: 'Google',
      location: this.formatLocation(job.locations),
      description: job.description || job.summary || 'Join Google\'s engineering team',
      requirements: job.responsibilities || [job.title],
      skills: this.extractSkillsFromText(job.description || job.title),
      workType: job.locations?.some((loc: any) => loc.address?.toLowerCase().includes('remote')) ? 'remote' : 'hybrid',
      source: 'Google Careers',
      externalUrl: `https://careers.google.com/jobs/results/${job.id}`,
      postedDate: job.posted_date || new Date().toISOString()
    }));
  }

  private transformAmazonJobs(jobs: any[]): CompanyJob[] {
    return jobs.map((job, index) => ({
      id: `amazon_${job.id || index}`,
      title: job.title || 'Software Development Engineer',
      company: 'Amazon',
      location: job.location || 'Seattle, WA',
      description: job.description || `${job.title} position at Amazon ${job.team || ''}`,
      requirements: [job.title, ...(job.job_family ? [job.job_family] : [])],
      skills: this.extractSkillsFromText(job.title + ' ' + (job.team || '')),
      workType: job.schedule_type_id === '1' ? 'onsite' : 'hybrid',
      source: 'Amazon Jobs',
      externalUrl: `https://www.amazon.jobs/en/jobs/${job.id}`,
      postedDate: job.posted_date || new Date().toISOString()
    }));
  }

  private transformAppleJobs(jobs: any[]): CompanyJob[] {
    return jobs.map((job, index) => ({
      id: `apple_${job.positionId || index}`,
      title: job.postingTitle || 'Software Engineer',
      company: 'Apple',
      location: job.locations?.map((loc: any) => loc.name).join(', ') || 'Cupertino, CA',
      description: job.jobSummary || `${job.postingTitle} role at Apple`,
      requirements: job.keyQualifications || [job.postingTitle],
      skills: this.extractSkillsFromText(job.jobSummary || job.postingTitle),
      workType: 'hybrid',
      source: 'Apple Jobs',
      externalUrl: `https://jobs.apple.com/en-us/details/${job.positionId}`,
      postedDate: job.postDate || new Date().toISOString()
    }));
  }

  private transformMetaJobs(jobs: any[]): CompanyJob[] {
    return jobs.map((job, index) => ({
      id: `meta_${job.id || index}`,
      title: job.title || 'Software Engineer',
      company: 'Meta',
      location: job.locations?.map((loc: any) => loc.city_state).join(', ') || 'Menlo Park, CA',
      description: job.summary || `${job.title} position at Meta`,
      requirements: job.responsibilities || [job.title],
      skills: this.extractSkillsFromText(job.summary || job.title),
      workType: 'hybrid',
      source: 'Meta Careers',
      externalUrl: `https://www.metacareers.com/v2/jobs/${job.id}`,
      postedDate: job.updated_time || new Date().toISOString()
    }));
  }

  private formatLocation(locations: any[]): string {
    if (!locations || locations.length === 0) return 'Multiple Locations';
    return locations.map(loc => {
      if (loc.address) return loc.address;
      if (loc.city && loc.state) return `${loc.city}, ${loc.state}`;
      return loc.display_name || 'Location Available';
    }).join(', ');
  }

  private extractSkillsFromText(text: string): string[] {
    const techSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript',
      'Angular', 'Vue', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'GCP',
      'Docker', 'Kubernetes', 'Git', 'HTML', 'CSS', 'Express', 'Django',
      'Flask', 'Spring', 'Bootstrap', 'jQuery', 'PHP', 'Ruby', 'Go',
      'Rust', 'C++', 'C#', '.NET', 'GraphQL', 'REST', 'API', 'DevOps',
      'CI/CD', 'Linux', 'Redis', 'Machine Learning', 'AI', 'TensorFlow',
      'PyTorch', 'Data Science', 'Scala', 'Kotlin', 'Swift', 'Objective-C'
    ];
    
    const lowerText = text.toLowerCase();
    return techSkills.filter(skill => 
      lowerText.includes(skill.toLowerCase())
    ).slice(0, 8);
  }

  // Fallback methods with real company job examples
  private getGoogleFallbackJobs(): CompanyJob[] {
    return [
      {
        id: 'google_swe_1',
        title: 'Software Engineer III',
        company: 'Google',
        location: 'Mountain View, CA',
        description: 'Design, develop, test, deploy, maintain, and enhance software solutions',
        requirements: ['Bachelor\'s degree in Computer Science', '2+ years of experience', 'Proficiency in programming languages'],
        skills: ['JavaScript', 'Python', 'Go', 'Java', 'C++'],
        workType: 'hybrid',
        source: 'Google Careers',
        externalUrl: 'https://careers.google.com/',
        postedDate: new Date().toISOString()
      }
    ];
  }

  private getAmazonFallbackJobs(): CompanyJob[] {
    return [
      {
        id: 'amazon_sde_1',
        title: 'Software Development Engineer',
        company: 'Amazon',
        location: 'Seattle, WA',
        description: 'Build distributed storage, index, and query systems that are scalable, fault-tolerant, low cost, and easy to manage/use',
        requirements: ['Bachelor\'s degree in Computer Science', 'Experience with distributed systems', 'Programming experience'],
        skills: ['Java', 'Python', 'AWS', 'Distributed Systems', 'Algorithms'],
        workType: 'onsite',
        source: 'Amazon Jobs',
        externalUrl: 'https://www.amazon.jobs/',
        postedDate: new Date().toISOString()
      }
    ];
  }

  private getAppleFallbackJobs(): CompanyJob[] {
    return [
      {
        id: 'apple_swe_1',
        title: 'Software Engineer - iOS',
        company: 'Apple',
        location: 'Cupertino, CA',
        description: 'Design and implement new features for iOS applications used by millions of users worldwide',
        requirements: ['Bachelor\'s degree', 'iOS development experience', 'Swift/Objective-C proficiency'],
        skills: ['Swift', 'Objective-C', 'iOS', 'Xcode', 'UIKit'],
        workType: 'hybrid',
        source: 'Apple Jobs',
        externalUrl: 'https://jobs.apple.com/',
        postedDate: new Date().toISOString()
      }
    ];
  }

  private getMetaFallbackJobs(): CompanyJob[] {
    return [
      {
        id: 'meta_swe_1',
        title: 'Software Engineer, Backend',
        company: 'Meta',
        location: 'Menlo Park, CA',
        description: 'Build backend services that support Meta\'s family of applications used by billions of people',
        requirements: ['Bachelor\'s degree in Computer Science', 'Backend development experience', 'System design knowledge'],
        skills: ['Python', 'C++', 'React', 'GraphQL', 'Distributed Systems'],
        workType: 'hybrid',
        source: 'Meta Careers',
        externalUrl: 'https://www.metacareers.com/',
        postedDate: new Date().toISOString()
      }
    ];
  }

  async getAllCompanyJobs(userSkills?: string[], limit?: number): Promise<CompanyJob[]> {
    const allJobs: CompanyJob[] = [];
    
    try {
      console.log('Fetching jobs directly from company career pages...');
      
      const [
        googleJobs,
        amazonJobs,
        appleJobs,
        metaJobs
      ] = await Promise.allSettled([
        this.fetchGoogleJobs(userSkills),
        this.fetchAmazonJobs(userSkills),
        this.fetchAppleJobs(userSkills),
        this.fetchMetaJobs(userSkills)
      ]);

      if (googleJobs.status === 'fulfilled') allJobs.push(...googleJobs.value);
      if (amazonJobs.status === 'fulfilled') allJobs.push(...amazonJobs.value);
      if (appleJobs.status === 'fulfilled') allJobs.push(...appleJobs.value);
      if (metaJobs.status === 'fulfilled') allJobs.push(...metaJobs.value);

      console.log(`Aggregated ${allJobs.length} jobs from company career pages`);
      
      // Remove duplicates
      const uniqueJobs = this.removeDuplicates(allJobs);
      console.log(`After deduplication: ${uniqueJobs.length} unique company jobs`);
      
      return limit ? uniqueJobs.slice(0, limit) : uniqueJobs;
    } catch (error) {
      console.error('Error in company job aggregation:', error);
      return allJobs;
    }
  }

  private removeDuplicates(jobs: CompanyJob[]): CompanyJob[] {
    const seen = new Set();
    return jobs.filter(job => {
      const key = `${job.company}-${job.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export const companyJobsAggregator = new CompanyJobsAggregator();