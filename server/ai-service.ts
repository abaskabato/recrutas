import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

interface CandidateProfile {
  skills: string[];
  experience: string;
  industry?: string;
  workType?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
}

interface JobPosting {
  title: string;
  company: string;
  skills: string[];
  requirements: string[];
  industry?: string;
  workType?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  description: string;
}

interface AIMatchResult {
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  score: number;
}

export async function generateJobMatch(candidate: CandidateProfile, job: JobPosting): Promise<AIMatchResult> {
  if (!openai) {
    // Fallback to algorithmic matching when OpenAI is not available
    return generateAlgorithmicMatch(candidate, job);
  }

  try {
    const prompt = `
      As an AI hiring expert, analyze the match between this candidate and job posting.
      
      Candidate Profile:
      - Skills: ${candidate.skills.join(', ')}
      - Experience: ${candidate.experience}
      - Industry: ${candidate.industry || 'Not specified'}
      - Work Type: ${candidate.workType || 'Not specified'}
      - Salary Range: $${candidate.salaryMin || 0} - $${candidate.salaryMax || 'Not specified'}
      - Location: ${candidate.location || 'Not specified'}
      
      Job Posting:
      - Title: ${job.title}
      - Company: ${job.company}
      - Required Skills: ${job.skills.join(', ')}
      - Requirements: ${job.requirements.join(', ')}
      - Industry: ${job.industry || 'Not specified'}
      - Work Type: ${job.workType || 'Not specified'}
      - Salary Range: $${job.salaryMin || 0} - $${job.salaryMax || 'Not specified'}
      - Location: ${job.location || 'Not specified'}
      - Description: ${job.description}
      
      Provide a detailed analysis in JSON format with:
      {
        "confidenceLevel": number between 0-1,
        "skillMatches": array of matching skills,
        "aiExplanation": string explaining why this is a good match,
        "score": number between 0-100
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert AI recruiter that analyzes job matches. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      confidenceLevel: Math.max(0, Math.min(1, result.confidenceLevel || 0)),
      skillMatches: result.skillMatches || [],
      aiExplanation: result.aiExplanation || 'AI analysis generated this match based on profile compatibility.',
      score: Math.max(0, Math.min(100, result.score || 0))
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return generateAlgorithmicMatch(candidate, job);
  }
}

function generateAlgorithmicMatch(candidate: CandidateProfile, job: JobPosting): AIMatchResult {
  const matchResult = calculateAdvancedJobMatch(candidate, job);
  
  return {
    confidenceLevel: matchResult.overallScore / 100,
    skillMatches: matchResult.matchedSkills,
    aiExplanation: matchResult.explanation,
    score: Math.round(matchResult.overallScore)
  };
}

function calculateAdvancedJobMatch(candidate: CandidateProfile, job: JobPosting) {
  // Skill matching with semantic analysis
  const skillAnalysis = analyzeSkillCompatibility(candidate.skills, job.skills, job.requirements);
  
  // Experience level matching
  const experienceScore = analyzeExperienceMatch(candidate.experience, job.description);
  
  // Location compatibility
  const locationScore = calculateLocationMatch(candidate.location, job.location, job.workType);
  
  // Salary alignment
  const salaryScore = calculateSalaryCompatibility(candidate.salaryMin, candidate.salaryMax, job.salaryMin, job.salaryMax);
  
  // Work type preference
  const workTypeScore = calculateWorkTypeMatch(candidate.workType, job.workType);
  
  // Industry alignment
  const industryScore = calculateIndustryMatch(candidate.industry, job.industry);
  
  // Title relevance
  const titleRelevanceScore = analyzeTitleRelevance(candidate.skills, candidate.experience, job.title);
  
  // Weighted scoring system
  const weights = {
    skills: 0.35,
    experience: 0.25,
    location: 0.15,
    salary: 0.10,
    workType: 0.08,
    industry: 0.04,
    titleRelevance: 0.03
  };
  
  const overallScore = (
    skillAnalysis.score * weights.skills +
    experienceScore * weights.experience +
    locationScore * weights.location +
    salaryScore * weights.salary +
    workTypeScore * weights.workType +
    industryScore * weights.industry +
    titleRelevanceScore * weights.titleRelevance
  );
  
  const explanation = generateMatchExplanation({
    skillAnalysis,
    experienceScore,
    locationScore,
    salaryScore,
    workTypeScore,
    industryScore,
    titleRelevanceScore,
    overallScore
  });
  
  return {
    overallScore,
    matchedSkills: skillAnalysis.matchedSkills,
    explanation,
    breakdown: {
      skills: skillAnalysis.score,
      experience: experienceScore,
      location: locationScore,
      salary: salaryScore,
      workType: workTypeScore,
      industry: industryScore,
      titleRelevance: titleRelevanceScore
    }
  };
}

function analyzeSkillCompatibility(candidateSkills: string[], jobSkills: string[], requirements: string[]) {
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase().trim());
  const jobSkillsLower = jobSkills.map(s => s.toLowerCase().trim());
  const requirementsText = requirements.join(' ').toLowerCase();
  
  // Define skill categories and synonyms
  const skillSynonyms = {
    'javascript': ['js', 'javascript', 'ecmascript', 'node.js', 'nodejs'],
    'typescript': ['ts', 'typescript'],
    'python': ['python', 'python3', 'py'],
    'react': ['react', 'reactjs', 'react.js'],
    'vue': ['vue', 'vuejs', 'vue.js'],
    'angular': ['angular', 'angularjs'],
    'sql': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite'],
    'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
    'docker': ['docker', 'containerization', 'containers'],
    'kubernetes': ['kubernetes', 'k8s', 'container orchestration']
  };
  
  const matchedSkills: string[] = [];
  const partialMatches: string[] = [];
  let coreSkillsMatched = 0;
  let totalCoreSkills = 0;
  
  // Analyze each job skill
  jobSkillsLower.forEach(jobSkill => {
    let found = false;
    
    // Direct match
    if (candidateSkillsLower.includes(jobSkill)) {
      matchedSkills.push(jobSkill);
      found = true;
    }
    
    // Synonym matching
    if (!found) {
      for (const [category, synonyms] of Object.entries(skillSynonyms)) {
        if (synonyms.includes(jobSkill)) {
          const candidateHasSynonym = candidateSkillsLower.some(candidateSkill =>
            synonyms.includes(candidateSkill)
          );
          if (candidateHasSynonym) {
            matchedSkills.push(jobSkill);
            found = true;
            break;
          }
        }
      }
    }
    
    // Partial string matching
    if (!found) {
      candidateSkillsLower.forEach(candidateSkill => {
        if (candidateSkill.includes(jobSkill) || jobSkill.includes(candidateSkill)) {
          if (candidateSkill.length >= 3 && jobSkill.length >= 3) {
            partialMatches.push(jobSkill);
            found = true;
          }
        }
      });
    }
    
    // Check if this is a core skill (appears in requirements)
    if (requirementsText.includes(jobSkill) || 
        requirementsText.includes('required') && jobSkillsLower.indexOf(jobSkill) < 3) {
      totalCoreSkills++;
      if (found) coreSkillsMatched++;
    }
  });
  
  // Calculate skill match score
  const exactMatchRatio = jobSkillsLower.length > 0 ? matchedSkills.length / jobSkillsLower.length : 0;
  const partialMatchRatio = jobSkillsLower.length > 0 ? partialMatches.length / jobSkillsLower.length : 0;
  const coreSkillRatio = totalCoreSkills > 0 ? coreSkillsMatched / totalCoreSkills : 1;
  
  // Weighted skill score
  const skillScore = (
    exactMatchRatio * 0.7 +
    partialMatchRatio * 0.2 +
    coreSkillRatio * 0.1
  ) * 100;
  
  return {
    score: Math.min(100, skillScore),
    matchedSkills: [...matchedSkills, ...partialMatches],
    exactMatches: matchedSkills.length,
    partialMatches: partialMatches.length,
    coreSkillsMatched,
    totalCoreSkills
  };
}

function analyzeExperienceMatch(candidateExperience: string, jobDescription: string): number {
  const candidateExp = candidateExperience.toLowerCase();
  const jobDesc = jobDescription.toLowerCase();
  
  // Extract years from candidate experience
  const candidateYearsMatch = candidateExp.match(/(\d+)\s*years?/);
  const candidateYears = candidateYearsMatch ? parseInt(candidateYearsMatch[1]) : 0;
  
  // Extract required years from job description
  const jobYearsMatch = jobDesc.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/);
  const requiredYears = jobYearsMatch ? parseInt(jobYearsMatch[1]) : 0;
  
  // Experience level keywords
  const experienceLevels = {
    entry: ['entry', 'junior', 'associate', 'graduate', 'intern'],
    mid: ['mid', 'intermediate', 'experienced', 'professional'],
    senior: ['senior', 'lead', 'principal', 'staff', 'expert'],
    executive: ['director', 'vp', 'executive', 'head of', 'chief']
  };
  
  let candidateLevel = 'mid';
  let jobLevel = 'mid';
  
  // Determine candidate level
  if (candidateYears <= 2) candidateLevel = 'entry';
  else if (candidateYears <= 5) candidateLevel = 'mid';
  else if (candidateYears <= 10) candidateLevel = 'senior';
  else candidateLevel = 'executive';
  
  // Check for level keywords in candidate experience
  for (const [level, keywords] of Object.entries(experienceLevels)) {
    if (keywords.some(keyword => candidateExp.includes(keyword))) {
      candidateLevel = level;
      break;
    }
  }
  
  // Determine job level
  if (requiredYears <= 2) jobLevel = 'entry';
  else if (requiredYears <= 5) jobLevel = 'mid';
  else if (requiredYears <= 10) jobLevel = 'senior';
  else jobLevel = 'executive';
  
  // Check for level keywords in job description
  for (const [level, keywords] of Object.entries(experienceLevels)) {
    if (keywords.some(keyword => jobDesc.includes(keyword))) {
      jobLevel = level;
      break;
    }
  }
  
  // Calculate experience match score
  const levelOrder = ['entry', 'mid', 'senior', 'executive'];
  const candidateLevelIndex = levelOrder.indexOf(candidateLevel);
  const jobLevelIndex = levelOrder.indexOf(jobLevel);
  
  let experienceScore = 100;
  
  // Penalize under-qualification more than over-qualification
  if (candidateLevelIndex < jobLevelIndex) {
    experienceScore = Math.max(0, 100 - (jobLevelIndex - candidateLevelIndex) * 30);
  } else if (candidateLevelIndex > jobLevelIndex) {
    experienceScore = Math.max(60, 100 - (candidateLevelIndex - jobLevelIndex) * 15);
  }
  
  // Years-based adjustment
  if (requiredYears > 0) {
    if (candidateYears >= requiredYears) {
      experienceScore = Math.min(100, experienceScore + 10);
    } else {
      const shortfall = requiredYears - candidateYears;
      experienceScore = Math.max(0, experienceScore - shortfall * 10);
    }
  }
  
  return experienceScore;
}

function calculateLocationMatch(candidateLocation?: string, jobLocation?: string, workType?: string): number {
  // Remote work gets high score regardless of location
  if (workType?.toLowerCase() === 'remote') {
    return 95;
  }
  
  if (!candidateLocation || !jobLocation) {
    return 70; // Neutral score when location info is missing
  }
  
  const candidateLoc = candidateLocation.toLowerCase().trim();
  const jobLoc = jobLocation.toLowerCase().trim();
  
  // Exact match
  if (candidateLoc === jobLoc) {
    return 100;
  }
  
  // Same city different formatting
  if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) {
    return 90;
  }
  
  // Extract city and state/country
  const candidateParts = candidateLoc.split(',').map(p => p.trim());
  const jobParts = jobLoc.split(',').map(p => p.trim());
  
  // Same city
  if (candidateParts[0] === jobParts[0]) {
    return 85;
  }
  
  // Same state/region
  if (candidateParts.length > 1 && jobParts.length > 1) {
    if (candidateParts[1] === jobParts[1]) {
      return 60;
    }
  }
  
  // Major metropolitan areas
  const metroAreas = {
    'san francisco': ['san francisco', 'sf', 'bay area', 'silicon valley', 'palo alto', 'mountain view'],
    'new york': ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens'],
    'los angeles': ['los angeles', 'la', 'hollywood', 'santa monica'],
    'chicago': ['chicago', 'chi'],
    'boston': ['boston', 'cambridge', 'somerville'],
    'seattle': ['seattle', 'bellevue', 'redmond']
  };
  
  for (const [metro, cities] of Object.entries(metroAreas)) {
    const candidateInMetro = cities.some(city => candidateLoc.includes(city));
    const jobInMetro = cities.some(city => jobLoc.includes(city));
    
    if (candidateInMetro && jobInMetro) {
      return 80;
    }
  }
  
  return 30; // Different locations
}

function calculateSalaryCompatibility(candMin?: number, candMax?: number, jobMin?: number, jobMax?: number): number {
  // If no salary info available, assume neutral compatibility
  if (!candMin && !jobMin) {
    return 80;
  }
  
  // Candidate expectations vs job offer
  if (candMin && jobMax) {
    if (candMin <= jobMax) {
      const salaryGap = jobMax - candMin;
      const percentageAbove = salaryGap / candMin;
      return Math.min(100, 85 + percentageAbove * 15);
    } else {
      const shortfall = candMin - jobMax;
      const percentageShort = shortfall / candMin;
      return Math.max(0, 80 - percentageShort * 100);
    }
  }
  
  if (candMax && jobMin) {
    if (candMax >= jobMin) {
      return 90;
    } else {
      return 40;
    }
  }
  
  return 75; // Partial salary info available
}

function calculateWorkTypeMatch(candidateWorkType?: string, jobWorkType?: string): number {
  if (!candidateWorkType || !jobWorkType) {
    return 80; // Neutral when not specified
  }
  
  const candType = candidateWorkType.toLowerCase();
  const jobType = jobWorkType.toLowerCase();
  
  if (candType === jobType) {
    return 100;
  }
  
  // Compatibility matrix
  const compatibility: Record<string, Record<string, number>> = {
    'remote': { 'hybrid': 85, 'onsite': 30 },
    'hybrid': { 'remote': 90, 'onsite': 70 },
    'onsite': { 'hybrid': 60, 'remote': 20 }
  };
  
  return compatibility[candType]?.[jobType] || 50;
}

function calculateIndustryMatch(candidateIndustry?: string, jobIndustry?: string): number {
  if (!candidateIndustry || !jobIndustry) {
    return 80;
  }
  
  const candInd = candidateIndustry.toLowerCase();
  const jobInd = jobIndustry.toLowerCase();
  
  if (candInd === jobInd) {
    return 100;
  }
  
  // Related industries
  const relatedIndustries: Record<string, string[]> = {
    'technology': ['software', 'tech', 'it', 'saas', 'fintech', 'edtech'],
    'finance': ['fintech', 'banking', 'investment', 'insurance'],
    'healthcare': ['healthtech', 'medical', 'pharma', 'biotech'],
    'retail': ['e-commerce', 'consumer', 'fashion'],
    'media': ['advertising', 'marketing', 'entertainment', 'gaming']
  };
  
  for (const [industry, related] of Object.entries(relatedIndustries)) {
    if ((candInd.includes(industry) || related.some(r => candInd.includes(r))) &&
        (jobInd.includes(industry) || related.some(r => jobInd.includes(r)))) {
      return 75;
    }
  }
  
  return 50;
}

function analyzeTitleRelevance(candidateSkills: string[], candidateExperience: string, jobTitle: string): number {
  const title = jobTitle.toLowerCase();
  const skills = candidateSkills.map(s => s.toLowerCase());
  const experience = candidateExperience.toLowerCase();
  
  // Extract key terms from job title
  const titleTerms = title.split(/[\s\-\/,]+/).filter(term => term.length > 2);
  
  let relevanceScore = 0;
  
  // Check if candidate skills match title terms
  titleTerms.forEach(term => {
    if (skills.some(skill => skill.includes(term) || term.includes(skill))) {
      relevanceScore += 20;
    }
    if (experience.includes(term)) {
      relevanceScore += 15;
    }
  });
  
  return Math.min(100, relevanceScore);
}

function generateMatchExplanation(scores: any): string {
  const { skillAnalysis, experienceScore, locationScore, salaryScore, overallScore } = scores;
  
  let explanation = '';
  
  // Skills explanation
  if (skillAnalysis.exactMatches > 0) {
    explanation += `Strong skill match with ${skillAnalysis.exactMatches} exact matches including ${skillAnalysis.matchedSkills.slice(0, 3).join(', ')}. `;
  } else if (skillAnalysis.partialMatches > 0) {
    explanation += `Partial skill alignment with transferable skills. `;
  } else {
    explanation += `Limited skill overlap - consider highlighting transferable skills. `;
  }
  
  // Experience explanation
  if (experienceScore >= 80) {
    explanation += `Experience level well-aligned with role requirements. `;
  } else if (experienceScore >= 60) {
    explanation += `Experience level somewhat matches, with room for growth. `;
  } else {
    explanation += `Experience gap present - consider emphasizing relevant projects. `;
  }
  
  // Location explanation
  if (locationScore >= 90) {
    explanation += `Excellent location compatibility. `;
  } else if (locationScore >= 70) {
    explanation += `Good location match. `;
  } else {
    explanation += `Location may require consideration for relocation or remote work. `;
  }
  
  // Overall assessment
  if (overallScore >= 85) {
    explanation += `This is an excellent match with high compatibility across multiple factors.`;
  } else if (overallScore >= 70) {
    explanation += `This is a good match worth pursuing with some areas for development.`;
  } else if (overallScore >= 50) {
    explanation += `This is a moderate match that could work with the right circumstances.`;
  } else {
    explanation += `This match has significant gaps that would need to be addressed.`;
  }
  
  return explanation.trim();
}

export async function generateJobInsights(candidateProfile: CandidateProfile): Promise<string[]> {
  if (!openai) {
    return [
      "Consider adding more technical skills to your profile to increase match opportunities.",
      "Remote work opportunities have increased significantly in your field.",
      "Your skill set is well-aligned with current market demands."
    ];
  }

  try {
    const prompt = `
      Generate 2-3 actionable career insights for this candidate profile:
      
      Skills: ${candidateProfile.skills.join(', ')}
      Experience: ${candidateProfile.experience}
      Industry: ${candidateProfile.industry || 'Not specified'}
      Location: ${candidateProfile.location || 'Not specified'}
      
      Provide insights as a JSON array of strings focusing on:
      - Skill development opportunities
      - Market trends relevant to their profile
      - Ways to improve their job matching potential
      
      Format: {"insights": ["insight1", "insight2", "insight3"]}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system", 
          content: "You are a career advisor providing actionable insights. Keep insights concise and specific."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
    return result.insights || [];
  } catch (error) {
    console.error('OpenAI API error for insights:', error);
    return [
      "Consider adding more technical skills to your profile to increase match opportunities.",
      "Remote work opportunities have increased significantly in your field.",
      "Your skill set is well-aligned with current market demands."
    ];
  }
}