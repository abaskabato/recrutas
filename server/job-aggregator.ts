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

  async getAllJobs(): Promise<ExternalJob[]> {
    const allJobs: ExternalJob[] = [];
    
    try {
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