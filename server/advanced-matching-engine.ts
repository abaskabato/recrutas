import { generateJobMatch } from './ai-service';
import { storage } from './storage';

interface AdvancedMatchCriteria {
  candidateId: string;
  skills: string[];
  experience: string;
  location?: string;
  salaryExpectation?: number;
  workType?: 'remote' | 'hybrid' | 'onsite';
  industry?: string;
}

interface EnhancedJobMatch {
  jobId: number;
  matchScore: number;
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  urgencyScore: number;
  compatibilityFactors: {
    skillAlignment: number;
    experienceMatch: number;
    locationFit: number;
    salaryMatch: number;
    industryRelevance: number;
  };
}

export class AdvancedMatchingEngine {
  private matchCache: Map<string, EnhancedJobMatch[]> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  async generateAdvancedMatches(criteria: AdvancedMatchCriteria): Promise<EnhancedJobMatch[]> {
    const cacheKey = this.generateCacheKey(criteria);
    const cached = this.matchCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Fetch available jobs from multiple sources
      const [internalJobs, externalJobs] = await Promise.all([
        storage.getJobPostings(''),
        this.fetchExternalJobs(criteria)
      ]);

      const allJobs = [...internalJobs, ...externalJobs];
      const matches: EnhancedJobMatch[] = [];

      // Process each job for advanced matching
      for (const job of allJobs) {
        const match = await this.calculateAdvancedMatch(criteria, job);
        if (match.matchScore >= 0.6) { // Only include good matches
          matches.push(match);
        }
      }

      // Sort by match score and urgency
      matches.sort((a, b) => {
        const scoreA = a.matchScore * 0.7 + a.urgencyScore * 0.3;
        const scoreB = b.matchScore * 0.7 + b.urgencyScore * 0.3;
        return scoreB - scoreA;
      });

      // Cache results
      this.matchCache.set(cacheKey, matches.slice(0, 50)); // Top 50 matches
      setTimeout(() => this.matchCache.delete(cacheKey), this.CACHE_DURATION);

      return matches;
    } catch (error) {
      console.error('Advanced matching error:', error);
      return [];
    }
  }

  private async calculateAdvancedMatch(criteria: AdvancedMatchCriteria, job: any): Promise<EnhancedJobMatch> {
    // Use AI service for basic matching
    const aiMatch = await generateJobMatch({
      skills: criteria.skills,
      experience: criteria.experience,
      location: criteria.location,
      workType: criteria.workType,
      industry: criteria.industry
    }, {
      title: job.title,
      company: job.company,
      skills: job.skills || [],
      requirements: job.requirements || [],
      description: job.description,
      location: job.location,
      workType: job.workType,
      industry: job.industry
    });

    // Calculate detailed compatibility factors
    const compatibilityFactors = this.calculateCompatibilityFactors(criteria, job);
    
    // Calculate urgency score based on job characteristics
    const urgencyScore = this.calculateUrgencyScore(job);

    return {
      jobId: job.id,
      matchScore: aiMatch.score,
      confidenceLevel: aiMatch.confidenceLevel,
      skillMatches: aiMatch.skillMatches,
      aiExplanation: aiMatch.aiExplanation,
      urgencyScore,
      compatibilityFactors
    };
  }

  private calculateCompatibilityFactors(criteria: AdvancedMatchCriteria, job: any) {
    const factors = {
      skillAlignment: 0,
      experienceMatch: 0,
      locationFit: 1,
      salaryMatch: 1,
      industryRelevance: 0.5
    };

    // Skill alignment calculation
    const jobSkills = job.skills || [];
    const matchingSkills = criteria.skills.filter(skill => 
      jobSkills.some((jobSkill: string) => 
        jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(jobSkill.toLowerCase())
      )
    );
    factors.skillAlignment = jobSkills.length > 0 ? matchingSkills.length / jobSkills.length : 0;

    // Experience matching
    if (job.experienceLevel && criteria.experience) {
      const experienceMap: Record<string, number> = {
        'entry': 1, 'junior': 1, 'mid': 2, 'senior': 3, 'lead': 4, 'principal': 5
      };
      const candidateLevel = experienceMap[criteria.experience.toLowerCase()] || 2;
      const jobLevel = experienceMap[job.experienceLevel.toLowerCase()] || 2;
      factors.experienceMatch = Math.max(0, 1 - Math.abs(candidateLevel - jobLevel) * 0.2);
    }

    // Location compatibility
    if (criteria.location && job.location) {
      if (job.workType === 'remote' || criteria.workType === 'remote') {
        factors.locationFit = 1;
      } else {
        const distance = this.calculateLocationDistance(criteria.location, job.location);
        factors.locationFit = Math.max(0, 1 - distance / 100); // Normalize by 100 miles
      }
    }

    // Salary matching
    if (criteria.salaryExpectation && job.salaryMin && job.salaryMax) {
      const jobSalaryMid = (job.salaryMin + job.salaryMax) / 2;
      const salaryDiff = Math.abs(criteria.salaryExpectation - jobSalaryMid);
      factors.salaryMatch = Math.max(0, 1 - salaryDiff / criteria.salaryExpectation);
    }

    // Industry relevance
    if (criteria.industry && job.industry) {
      factors.industryRelevance = criteria.industry.toLowerCase() === job.industry.toLowerCase() ? 1 : 0.3;
    }

    return factors;
  }

  private calculateUrgencyScore(job: any): number {
    let urgency = 0.5; // Base urgency

    // Time-based urgency
    if (job.postedDate) {
      const daysSincePosted = (Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 1) urgency += 0.3; // Very fresh
      else if (daysSincePosted < 3) urgency += 0.2; // Fresh
      else if (daysSincePosted > 30) urgency -= 0.2; // Old
    }

    // Company priority (Fortune 500, unicorns, etc.)
    const priorityCompanies = ['google', 'apple', 'microsoft', 'amazon', 'meta', 'tesla', 'netflix'];
    if (priorityCompanies.some(company => job.company.toLowerCase().includes(company))) {
      urgency += 0.2;
    }

    // Application count (fewer applications = higher urgency)
    if (job.applicationCount !== undefined) {
      if (job.applicationCount < 10) urgency += 0.2;
      else if (job.applicationCount > 100) urgency -= 0.1;
    }

    // Remote work bonus
    if (job.workType === 'remote') {
      urgency += 0.1;
    }

    return Math.min(1, Math.max(0, urgency));
  }

  private calculateLocationDistance(loc1: string, loc2: string): number {
    // Simplified distance calculation (in practice, would use geolocation API)
    const majorCities: Record<string, {lat: number, lng: number}> = {
      'san francisco': {lat: 37.7749, lng: -122.4194},
      'new york': {lat: 40.7128, lng: -74.0060},
      'seattle': {lat: 47.6062, lng: -122.3321},
      'austin': {lat: 30.2672, lng: -97.7431},
      'denver': {lat: 39.7392, lng: -104.9903},
      'chicago': {lat: 41.8781, lng: -87.6298},
      'boston': {lat: 42.3601, lng: -71.0589},
      'los angeles': {lat: 34.0522, lng: -118.2437}
    };

    const city1 = majorCities[loc1.toLowerCase()];
    const city2 = majorCities[loc2.toLowerCase()];

    if (!city1 || !city2) return 50; // Default distance for unknown cities

    // Haversine formula for distance calculation
    const R = 3959; // Earth's radius in miles
    const dLat = (city2.lat - city1.lat) * Math.PI / 180;
    const dLng = (city2.lng - city1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(city1.lat * Math.PI / 180) * Math.cos(city2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private async fetchExternalJobs(criteria: AdvancedMatchCriteria): Promise<any[]> {
    // In production, this would fetch from multiple job APIs
    // For now, return sample jobs that match criteria
    return [
      {
        id: 'ext_1',
        title: 'Senior Software Engineer',
        company: 'TechCorp',
        skills: criteria.skills.slice(0, 3),
        requirements: ['5+ years experience', 'Full-stack development'],
        description: 'Join our innovative team building next-generation software solutions',
        location: criteria.location || 'San Francisco',
        workType: criteria.workType || 'hybrid',
        industry: criteria.industry || 'Technology',
        salaryMin: 120000,
        salaryMax: 180000,
        postedDate: new Date().toISOString(),
        applicationCount: 15,
        source: 'external'
      }
    ];
  }

  private generateCacheKey(criteria: AdvancedMatchCriteria): string {
    return `${criteria.candidateId}_${criteria.skills.join(',')}_${criteria.location || ''}_${criteria.workType || ''}`;
  }

  async getPersonalizedJobFeed(candidateId: string, limit: number = 20): Promise<EnhancedJobMatch[]> {
    try {
      // Get candidate profile
      const profile = await storage.getCandidateProfile(candidateId);
      if (!profile) return [];

      const criteria: AdvancedMatchCriteria = {
        candidateId,
        skills: profile.skills || [],
        experience: profile.experience || 'mid',
        location: profile.location || undefined,
        workType: profile.workType as any,
        industry: profile.industry || undefined
      };

      const matches = await this.generateAdvancedMatches(criteria);
      return matches.slice(0, limit);
    } catch (error) {
      console.error('Personalized feed error:', error);
      return [];
    }
  }

  async updateMatchPreferences(candidateId: string, preferences: Partial<AdvancedMatchCriteria>): Promise<void> {
    // Store updated preferences for future matching
    await storage.upsertCandidateProfile({
      userId: candidateId,
      workType: preferences.workType,
      industry: preferences.industry,
      location: preferences.location
    });

    // Clear cache to force refresh
    const keys = Array.from(this.matchCache.keys()).filter(key => key.startsWith(candidateId));
    keys.forEach(key => this.matchCache.delete(key));
  }
}

export const advancedMatchingEngine = new AdvancedMatchingEngine();