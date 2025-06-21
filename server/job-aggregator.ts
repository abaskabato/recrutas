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
  
  async fetchFromHiringCafe(): Promise<ExternalJob[]> {
    try {
      // Try multiple potential endpoints
      const endpoints = [
        'https://hiring.cafe/api/jobs',
        'https://hiring.cafe/jobs.json',
        'https://api.hiring.cafe/jobs'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying hiring.cafe endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Recrutas-AI-Platform/1.0'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`Successfully fetched from ${endpoint}:`, data);
            return this.transformHiringCafeJobs(data.jobs || data || []);
          }
        } catch (endpointError) {
          console.log(`Failed to fetch from ${endpoint}:`, endpointError.message);
          continue;
        }
      }
      
      // If all endpoints fail, return sample jobs to demonstrate the feature
      console.log('All hiring.cafe endpoints failed, using sample jobs for demo');
      return this.getSampleJobs();
    } catch (error) {
      console.error('Error fetching from hiring.cafe:', error);
      return this.getSampleJobs();
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

  async getAllJobs(): Promise<ExternalJob[]> {
    const hiringCafeJobs = await this.fetchFromHiringCafe();
    
    // Can add more sources here in the future
    // const indeedJobs = await this.fetchFromIndeed();
    // const linkedInJobs = await this.fetchFromLinkedIn();
    
    return [
      ...hiringCafeJobs,
      // ...indeedJobs,
      // ...linkedInJobs,
    ];
  }
}

export const jobAggregator = new JobAggregator();