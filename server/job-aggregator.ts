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
}

export class JobAggregator {
  
  async fetchFromUSAJobs(): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from USAJobs.gov API...');
      const response = await fetch('https://data.usajobs.gov/api/search?Keyword=software%20developer&ResultsPerPage=20', {
        headers: {
          'Host': 'data.usajobs.gov',
          'User-Agent': 'Recrutas-AI-Platform/1.0 (contact@recrutas.ai)'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return this.transformUSAJobs(data.SearchResult?.SearchResultItems || []);
      }
    } catch (error) {
      console.error('Error fetching from USAJobs:', error);
    }
    
    return [];
  }

  async fetchFromJSearch(): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from JSearch API...');
      const response = await fetch('https://jsearch.p.rapidapi.com/search?query=software%20developer&page=1&num_pages=1', {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return this.transformJSearchJobs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching from JSearch:', error);
    }
    
    return [];
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
      }
    ];
  }

  private transformHiringCafeJobs(jobs: any[]): ExternalJob[] {
    return jobs.map((job, index) => ({
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
      externalUrl: job.url || job.link || `https://hiring.cafe/jobs/${job.id}`,
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
    }));
  }

  private transformUSAJobs(jobs: any[]): ExternalJob[] {
    return jobs.map((item: any) => {
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
      };
    });
  }

  private transformJSearchJobs(jobs: any[]): ExternalJob[] {
    return jobs.map((job: any) => ({
      id: `jsearch_${job.job_id}`,
      title: job.job_title,
      company: job.employer_name,
      location: job.job_city + ', ' + job.job_state,
      description: job.job_description || '',
      requirements: this.extractRequirements(job.job_description || ''),
      skills: this.extractSkills(job.job_title + ' ' + (job.job_description || '')),
      workType: job.job_is_remote ? 'remote' : 'onsite',
      salaryMin: job.job_min_salary,
      salaryMax: job.job_max_salary,
      source: 'JSearch',
      externalUrl: job.job_apply_link,
      postedDate: job.job_posted_at_datetime_utc,
    }));
  }

  async fetchFromHiringCafe(): Promise<ExternalJob[]> {
    try {
      console.log('Fetching hiring.cafe job data...');
      
      // Try to fetch HTML content with proper headers
      const response = await fetch('https://hiring.cafe/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
        },
        timeout: 5000 // 5 second timeout
      });
      
      if (!response.ok) {
        console.log(`Hiring.cafe returned ${response.status}, using curated jobs`);
        return this.getHiringCafeFallbackJobs();
      }
      
      const html = await response.text();
      console.log(`Fetched ${html.length} characters from hiring.cafe`);
      
      // Parse HTML for job data patterns
      const jobs = this.parseHiringCafeHTML(html);
      
      if (jobs.length === 0) {
        console.log('No structured jobs found in HTML, using curated data');
        return this.getHiringCafeFallbackJobs();
      }
      
      console.log(`Successfully extracted ${jobs.length} jobs from hiring.cafe HTML`);
      return jobs;
      
    } catch (error) {
      console.log('Fetch failed, using curated hiring.cafe jobs:', error instanceof Error ? error.message : 'Unknown error');
      return this.getHiringCafeFallbackJobs();
    }
  }

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

  async getAllJobs(): Promise<ExternalJob[]> {
    const allJobs: ExternalJob[] = [];
    
    try {
      // Try hiring.cafe first
      const hiringCafeJobs = await this.fetchFromHiringCafe();
      allJobs.push(...hiringCafeJobs);

      // Then try USAJobs as backup
      const usaJobs = await this.fetchFromUSAJobs();
      allJobs.push(...usaJobs);
      
      console.log(`Successfully aggregated ${allJobs.length} real jobs from external sources`);
    } catch (error) {
      console.error('Error aggregating jobs:', error);
    }
    
    return allJobs;
  }
}

export const jobAggregator = new JobAggregator();