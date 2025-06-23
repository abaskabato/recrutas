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

  // Add new open source job sources
  async fetchFromJSearchAPI(userSkills?: string[]): Promise<ExternalJob[]> {
    try {
      console.log('Fetching from JSearch API (free tier)...');
      
      const query = userSkills && userSkills.length > 0 
        ? userSkills.join(' ') + ' developer'
        : 'software developer';
      
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
      const response = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo-key',
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'User-Agent': 'JobPlatform/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
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
      
      const response = await fetch('https://www.arbeitnow.com/api/job-board-api', {
        headers: {
          'User-Agent': 'JobPlatform/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
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

      const response = await fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY || 'demo'}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JobPlatform/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
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

      const response = await fetch(`https://www.indeed.com/rss?q=${query}&l=&sort=date`, {
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

      const response = await fetch(`https://data.usajobs.gov/api/search?${params}`, {
        headers: {
          'Host': 'data.usajobs.gov',
          'User-Agent': 'Recrutas-Platform/1.0 (recrutas@replit.com)',
          'Authorization-Key': process.env.USAJOBS_API_KEY || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
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
          const response = await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&date_posted=today`, {
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo-key',
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
          });

          if (response.ok) {
            const data = await response.json();
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
        return [];
      }
      
      const html = await response.text();
      console.log(`Fetched ${html.length} characters from hiring.cafe`);
      
      // Parse HTML for job data patterns
      const jobs = this.parseHiringCafeHTML(html);
      
      if (jobs.length === 0) {
        console.log('No structured jobs found in HTML');
        return [];
      }
      
      console.log(`Successfully extracted ${jobs.length} jobs from hiring.cafe HTML`);
      return jobs;
      
    } catch (error) {
      console.log('Error fetching from hiring.cafe:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
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
  private transformJSearchJobs(jobs: any[]): ExternalJob[] {
    return jobs.map((job, index) => ({
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
      externalUrl: job.job_apply_link || job.job_google_link || '#',
      postedDate: job.job_posted_at_datetime_utc || new Date().toISOString()
    }));
  }

  private transformArbeitNowJobs(jobs: any[]): ExternalJob[] {
    return jobs.map((job, index) => ({
      id: `arbeitnow_${job.slug || index}`,
      title: job.title || 'Developer Position',
      company: job.company_name || 'European Company',
      location: job.location || 'Europe',
      description: job.description || job.title,
      requirements: job.tags || [job.title],
      skills: job.tags || this.extractSkillsFromText(job.title),
      workType: job.remote ? 'remote' : 'onsite',
      source: 'ArbeitNow',
      externalUrl: job.url || '#',
      postedDate: job.created_at || new Date().toISOString()
    }));
  }

  private transformJoobleJobs(jobs: any[]): ExternalJob[] {
    return jobs.map((job, index) => ({
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
      externalUrl: job.link || '#',
      postedDate: job.updated || new Date().toISOString()
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
    
    const lowerText = text.toLowerCase();
    return commonSkills.filter(skill => 
      lowerText.includes(skill.toLowerCase())
    ).slice(0, 8);
  }

  async getAllJobs(userSkills?: string[], limit?: number): Promise<ExternalJob[]> {
    const allJobs: ExternalJob[] = [];
    
    try {
      console.log(`Fetching job data from multiple external sources for skills: ${userSkills?.join(', ') || 'general tech'}`);
      
      // Fetch from all sources including new ones
      const [
        jsearchJobs,
        arbeitNowJobs,
        joobleJobs,
        indeedJobs,
        usaJobs,
        museJobs,
        adzunaJobs,
        githubJobs,
        remoteOKJobs
      ] = await Promise.allSettled([
        this.fetchFromJSearchAPI(userSkills),
        this.fetchFromArbeitNow(),
        this.fetchFromJoobleAPI(userSkills),
        this.fetchFromIndeedRSS(userSkills),
        this.fetchFromUSAJobs(userSkills),
        this.fetchFromTheMuse(),
        this.fetchFromAdzunaDemo(userSkills),
        this.fetchGitHubJobs(),
        this.fetchRemoteOKJobs()
      ]);

      // Add jobs from successful fetches including new sources
      if (jsearchJobs.status === 'fulfilled') allJobs.push(...jsearchJobs.value);
      if (arbeitNowJobs.status === 'fulfilled') allJobs.push(...arbeitNowJobs.value);
      if (joobleJobs.status === 'fulfilled') allJobs.push(...joobleJobs.value);
      if (indeedJobs.status === 'fulfilled') allJobs.push(...indeedJobs.value);
      if (usaJobs.status === 'fulfilled') allJobs.push(...usaJobs.value);
      if (museJobs.status === 'fulfilled') allJobs.push(...museJobs.value);
      if (adzunaJobs.status === 'fulfilled') allJobs.push(...adzunaJobs.value);
      if (githubJobs.status === 'fulfilled') allJobs.push(...githubJobs.value);
      if (remoteOKJobs.status === 'fulfilled') allJobs.push(...remoteOKJobs.value);

      
      console.log(`Successfully aggregated ${allJobs.length} jobs from external sources`);
      
      // Remove duplicates based on title and company
      const uniqueJobs = allJobs.filter((job, index, arr) => 
        arr.findIndex(j => j.title === job.title && j.company === job.company) === index
      );
      
      console.log(`After deduplication: ${uniqueJobs.length} unique jobs`);
      return uniqueJobs;
    } catch (error) {
      console.error('Error aggregating jobs:', error);
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
            const jobs = await response.json();
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
      const response = await fetch('https://remoteok.io/api', {
        headers: {
          'User-Agent': 'Recrutas-Platform/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
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

  // The Muse API - Free tier with real job data
  async fetchFromTheMuse(): Promise<ExternalJob[]> {
    try {
      const categories = ['Software Engineer', 'Data Science', 'Product Management'];
      const allJobs: ExternalJob[] = [];
      
      for (const category of categories) {
        try {
          const url = `https://www.themuse.com/api/public/jobs?category=${encodeURIComponent(category)}&page=0&level=Senior%20Level&level=Mid%20Level`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Recrutas-Platform/1.0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
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
            const data = await response.json();
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
    }));
  }


}

export const jobAggregator = new JobAggregator();