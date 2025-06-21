// Simple AI matching algorithm (mock implementation)
// In a real application, this would be more sophisticated with ML models

export interface CandidateProfile {
  skills: string[];
  experience: string;
  industry?: string;
  workType?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
}

export interface JobPosting {
  title: string;
  skills: string[];
  requirements: string[];
  industry?: string;
  workType?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  description: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

export function calculateJobMatch(candidate: CandidateProfile, job: JobPosting): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const maxScore = 100;
  
  // Skills matching (40% weight)
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());
  const jobSkills = job.skills.map(s => s.toLowerCase());
  const skillMatches = jobSkills.filter(skill => 
    candidateSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
  );
  
  if (skillMatches.length > 0) {
    const skillScore = (skillMatches.length / jobSkills.length) * 40;
    score += skillScore;
    reasons.push(`${skillMatches.length}+ matching skills: ${skillMatches.slice(0, 3).join(', ')}`);
  }

  // Industry matching (20% weight)
  if (candidate.industry && job.industry && 
      candidate.industry.toLowerCase() === job.industry.toLowerCase()) {
    score += 20;
    reasons.push(`${candidate.industry} industry experience`);
  }

  // Work type preference (15% weight)
  if (candidate.workType && job.workType && 
      candidate.workType.toLowerCase() === job.workType.toLowerCase()) {
    score += 15;
    reasons.push(`${candidate.workType} work preference`);
  }

  // Salary compatibility (15% weight)
  if (candidate.salaryMin && candidate.salaryMax && job.salaryMin && job.salaryMax) {
    const candidateRange = [candidate.salaryMin, candidate.salaryMax];
    const jobRange = [job.salaryMin, job.salaryMax];
    
    // Check for overlap
    if (candidateRange[0] <= jobRange[1] && jobRange[0] <= candidateRange[1]) {
      score += 15;
      reasons.push('salary expectations match');
    }
  }

  // Location matching (10% weight)
  if (candidate.location && job.location) {
    if (candidate.location.toLowerCase() === job.location.toLowerCase() ||
        job.workType?.toLowerCase() === 'remote' ||
        candidate.workType?.toLowerCase() === 'remote') {
      score += 10;
      reasons.push('location compatibility');
    }
  }

  // Experience level matching (based on years mentioned in experience)
  const experienceYears = extractYearsFromText(candidate.experience || '');
  const requiredYears = extractYearsFromText(job.requirements.join(' ') + ' ' + job.description);
  
  if (experienceYears >= requiredYears && requiredYears > 0) {
    reasons.push(`${experienceYears}+ years experience`);
  }

  return {
    score: Math.min(Math.round(score), maxScore),
    reasons: reasons.slice(0, 3), // Limit to top 3 reasons
  };
}

function extractYearsFromText(text: string): number {
  const yearMatches = text.match(/(\d+)\+?\s*years?/gi);
  if (yearMatches) {
    const years = yearMatches.map(match => parseInt(match.match(/\d+/)?.[0] || '0'));
    return Math.max(...years);
  }
  return 0;
}

export function generateMatchExplanation(candidate: CandidateProfile, job: JobPosting): string {
  const match = calculateJobMatch(candidate, job);
  return match.reasons.join(' + ');
}
