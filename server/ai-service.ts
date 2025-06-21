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
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());
  const jobSkills = job.skills.map(s => s.toLowerCase());
  
  // Calculate skill match percentage
  const matchingSkills = candidateSkills.filter(skill => 
    jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
  );
  
  const skillMatchScore = jobSkills.length > 0 ? matchingSkills.length / jobSkills.length : 0;
  
  // Location match
  const locationMatch = candidate.location && job.location 
    ? candidate.location.toLowerCase().includes(job.location.toLowerCase()) ? 1 : 0.5 
    : 0.7;
    
  // Work type match
  const workTypeMatch = candidate.workType && job.workType 
    ? candidate.workType === job.workType ? 1 : 0.6 
    : 0.8;
    
  // Salary compatibility
  let salaryMatch = 0.8;
  if (candidate.salaryMin && job.salaryMax) {
    salaryMatch = candidate.salaryMin <= job.salaryMax ? 1 : 0.3;
  }
  
  // Calculate overall score
  const overallScore = (skillMatchScore * 0.5 + locationMatch * 0.2 + workTypeMatch * 0.2 + salaryMatch * 0.1);
  
  return {
    confidenceLevel: overallScore,
    skillMatches: candidateSkills.filter(skill => 
      jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
    ),
    aiExplanation: `This position matches ${Math.round(skillMatchScore * 100)}% of your skills (${matchingSkills.join(', ')}). ${
      locationMatch === 1 ? 'Perfect location match. ' : ''
    }${
      workTypeMatch === 1 ? 'Work type preference aligned. ' : ''
    }${
      salaryMatch === 1 ? 'Salary expectations compatible.' : ''
    }`,
    score: Math.round(overallScore * 100)
  };
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