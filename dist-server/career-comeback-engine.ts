interface CareerGapAnalysis {
  gapDuration: number;
  gapReason: 'health' | 'family' | 'education' | 'career_change' | 'other';
  skillsDecay: {
    skill: string;
    decayLevel: number; // 0-100
    refreshStrategies: string[];
    timeToRefresh: string;
  }[];
  narrativeStrength: number; // How well can they explain the gap
  marketPerception: 'positive' | 'neutral' | 'challenging';
  recoveryStrategy: RecoveryPlan;
}

interface RecoveryPlan {
  immediateActions: Action[];
  shortTermGoals: Action[];
  longTermStrategy: Action[];
  networkingPlan: NetworkingStrategy;
  skillRefreshPlan: SkillRefreshPlan;
  confidenceBuilding: ConfidenceStrategy;
}

interface Action {
  task: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
  effort: 'low' | 'medium' | 'high';
  impact: number; // 0-100
  resources: string[];
}

interface NetworkingStrategy {
  targetContacts: {
    type: 'alumni' | 'former_colleague' | 'industry_peer' | 'recruiter';
    name?: string;
    company?: string;
    connectionStrength: number;
    outreachScript: string;
    expectedResponse: string;
  }[];
  communityEngagement: {
    platform: string;
    activity: string;
    frequency: string;
    expectedImpact: number;
  }[];
}

interface SkillRefreshPlan {
  criticalSkills: {
    skill: string;
    currentLevel: number;
    targetLevel: number;
    refreshPath: LearningResource[];
    timeToTarget: string;
  }[];
  emergingSkills: {
    skill: string;
    marketDemand: number;
    learningPath: LearningResource[];
    competitiveAdvantage: number;
  }[];
}

interface ConfidenceStrategy {
  mindsetShifts: string[];
  practiceInterviews: {
    type: 'behavioral' | 'technical' | 'cultural';
    questions: string[];
    practice_frequency: string;
  }[];
  successStories: string[];
  supportSystem: string[];
}

interface LearningResource {
  title: string;
  type: 'course' | 'certification' | 'project' | 'tutorial';
  duration: string;
  cost: number;
  credibility: number;
  directApplicability: number;
}

export class CareerComebackEngine {
  async analyzeCareerGap(profile: {
    gapDuration: number;
    gapReason: string;
    previousRole: string;
    industry: string;
    skills: string[];
    targetRole?: string;
    location?: string;
    personalCircumstances?: string;
  }): Promise<CareerGapAnalysis> {
    
    const skillsAnalysis = await this.analyzeSkillsDecay(profile.skills, profile.gapDuration);
    const marketPerception = this.assessMarketPerception(profile.gapReason, profile.gapDuration);
    const narrative = await this.analyzeNarrativeStrength(profile);
    const recovery = await this.createRecoveryPlan(profile, skillsAnalysis, marketPerception);

    return {
      gapDuration: profile.gapDuration,
      gapReason: this.categorizeGapReason(profile.gapReason),
      skillsDecay: skillsAnalysis,
      narrativeStrength: narrative,
      marketPerception,
      recoveryStrategy: recovery
    };
  }

  private async analyzeSkillsDecay(skills: string[], gapDuration: number): Promise<any[]> {
    // Analyze how skills might have degraded during career gap
    return skills.map(skill => {
      const decayRate = this.getSkillDecayRate(skill);
      const decayLevel = Math.min(100, decayRate * gapDuration);
      
      return {
        skill,
        decayLevel,
        refreshStrategies: this.getRefreshStrategies(skill, decayLevel),
        timeToRefresh: this.estimateRefreshTime(skill, decayLevel)
      };
    });
  }

  private assessMarketPerception(reason: string, duration: number): 'positive' | 'neutral' | 'challenging' {
    if (reason.toLowerCase().includes('health') || reason.toLowerCase().includes('family')) {
      return duration > 24 ? 'challenging' : 'neutral';
    }
    if (reason.toLowerCase().includes('education') || reason.toLowerCase().includes('sabbatical')) {
      return 'positive';
    }
    return duration > 12 ? 'challenging' : 'neutral';
  }

  private async analyzeNarrativeStrength(profile: any): Promise<number> {
    // Analyze how well the candidate can explain their career gap
    const factors = [
      profile.gapReason ? 40 : 0, // Has clear reason
      profile.personalCircumstances ? 30 : 0, // Can explain circumstances
      profile.targetRole ? 20 : 0, // Has clear direction
      10 // Base points for self-awareness
    ];
    
    return factors.reduce((sum, score) => sum + score, 0);
  }

  private async createRecoveryPlan(
    profile: any, 
    skillsAnalysis: any[], 
    marketPerception: string
  ): Promise<RecoveryPlan> {
    
    return {
      immediateActions: this.getImmediateActions(profile, marketPerception),
      shortTermGoals: this.getShortTermGoals(profile, skillsAnalysis),
      longTermStrategy: this.getLongTermStrategy(profile),
      networkingPlan: await this.createNetworkingPlan(profile),
      skillRefreshPlan: await this.createSkillRefreshPlan(skillsAnalysis),
      confidenceBuilding: this.createConfidenceStrategy(profile, marketPerception)
    };
  }

  private getImmediateActions(profile: any, perception: string): Action[] {
    const actions: Action[] = [
      {
        task: "Craft compelling career gap narrative",
        priority: 'high',
        timeframe: '1-2 days',
        effort: 'medium',
        impact: 85,
        resources: ['Career counselor', 'Narrative templates', 'Practice partners']
      },
      {
        task: "Update LinkedIn with strategic positioning",
        priority: 'high',
        timeframe: '1 day',
        effort: 'low',
        impact: 70,
        resources: ['LinkedIn optimization guide', 'Professional headshot', 'Keyword research']
      },
      {
        task: "Create portfolio showcasing current capabilities",
        priority: 'high',
        timeframe: '1 week',
        effort: 'high',
        impact: 90,
        resources: ['Portfolio platforms', 'Project examples', 'Skills demonstration']
      }
    ];

    if (perception === 'challenging') {
      actions.push({
        task: "Complete relevant micro-certifications",
        priority: 'high',
        timeframe: '2-4 weeks',
        effort: 'medium',
        impact: 75,
        resources: ['Coursera', 'LinkedIn Learning', 'Industry certifications']
      });
    }

    return actions;
  }

  private getShortTermGoals(profile: any, skillsAnalysis: any[]): Action[] {
    return [
      {
        task: "Build professional network actively",
        priority: 'high',
        timeframe: '1-3 months',
        effort: 'medium',
        impact: 80,
        resources: ['Industry events', 'Professional associations', 'Alumni networks']
      },
      {
        task: "Complete skill refresh program",
        priority: 'medium',
        timeframe: '2-4 months',
        effort: 'high',
        impact: 85,
        resources: ['Online courses', 'Bootcamps', 'Mentorship programs']
      },
      {
        task: "Secure informational interviews",
        priority: 'high',
        timeframe: '2-6 weeks',
        effort: 'medium',
        impact: 75,
        resources: ['LinkedIn outreach', 'Warm introductions', 'Industry contacts']
      }
    ];
  }

  private getLongTermStrategy(profile: any): Action[] {
    return [
      {
        task: "Establish thought leadership in industry",
        priority: 'medium',
        timeframe: '6-12 months',
        effort: 'high',
        impact: 90,
        resources: ['Industry publications', 'Speaking opportunities', 'Content creation']
      },
      {
        task: "Build sustainable career resilience plan",
        priority: 'low',
        timeframe: '12+ months',
        effort: 'medium',
        impact: 95,
        resources: ['Career coaching', 'Skill diversification', 'Network maintenance']
      }
    ];
  }

  private async createNetworkingPlan(profile: any): Promise<NetworkingStrategy> {
    return {
      targetContacts: [
        {
          type: 'former_colleague',
          connectionStrength: 80,
          outreachScript: "Hi [Name], I hope you're doing well. I'm re-entering the job market after taking time for personal health, and I'd love to catch up and hear about what's happening in [Industry]. Would you be available for a brief coffee chat?",
          expectedResponse: "Most former colleagues are supportive of health-related career breaks"
        },
        {
          type: 'industry_peer',
          connectionStrength: 60,
          outreachScript: "Hi [Name], I noticed your work in [Specific Area] and would love to learn more about current trends in our industry. I'm refreshing my perspective after a career break and would appreciate any insights you could share.",
          expectedResponse: "Industry peers often appreciate direct, honest communication"
        }
      ],
      communityEngagement: [
        {
          platform: 'LinkedIn',
          activity: 'Thoughtful commenting on industry posts',
          frequency: 'Daily',
          expectedImpact: 70
        },
        {
          platform: 'Industry forums',
          activity: 'Answering questions and sharing insights',
          frequency: 'Weekly',
          expectedImpact: 65
        }
      ]
    };
  }

  private async createSkillRefreshPlan(skillsAnalysis: any[]): Promise<SkillRefreshPlan> {
    const criticalSkills = skillsAnalysis
      .filter(skill => skill.decayLevel > 30)
      .map(skill => ({
        skill: skill.skill,
        currentLevel: 100 - skill.decayLevel,
        targetLevel: 85,
        refreshPath: this.getRefreshResources(skill.skill),
        timeToTarget: skill.timeToRefresh
      }));

    return {
      criticalSkills,
      emergingSkills: await this.identifyEmergingSkills()
    };
  }

  private createConfidenceStrategy(profile: any, perception: string): ConfidenceStrategy {
    return {
      mindsetShifts: [
        "Your career break shows self-awareness and prioritization of health",
        "You bring fresh perspective and renewed energy",
        "Many successful professionals have had non-linear career paths",
        "Your experience during the break likely developed valuable soft skills"
      ],
      practiceInterviews: [
        {
          type: 'behavioral',
          questions: [
            "Tell me about your career gap and what you did during that time",
            "How do you stay current with industry trends?",
            "What motivates you to return to work now?"
          ],
          practice_frequency: '3 times per week'
        }
      ],
      successStories: [
        "Many professionals have successfully returned after health breaks",
        "Companies increasingly value diverse experiences and perspectives",
        "Mental health awareness has improved employer understanding"
      ],
      supportSystem: [
        "Career comeback support groups",
        "Mental health professional",
        "Trusted friends and family",
        "Career coach specializing in career gaps"
      ]
    };
  }

  // Helper methods
  private categorizeGapReason(reason: string): 'health' | 'family' | 'education' | 'career_change' | 'other' {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('health') || lowerReason.includes('depression') || lowerReason.includes('mental')) return 'health';
    if (lowerReason.includes('family') || lowerReason.includes('child') || lowerReason.includes('parent')) return 'family';
    if (lowerReason.includes('education') || lowerReason.includes('study') || lowerReason.includes('degree')) return 'education';
    if (lowerReason.includes('career') || lowerReason.includes('transition') || lowerReason.includes('change')) return 'career_change';
    return 'other';
  }

  private getSkillDecayRate(skill: string): number {
    // Technical skills decay faster than soft skills
    const technicalSkills = ['programming', 'software', 'technical', 'coding'];
    const isTechnical = technicalSkills.some(tech => skill.toLowerCase().includes(tech));
    return isTechnical ? 8 : 4; // Monthly decay rate percentage
  }

  private getRefreshStrategies(skill: string, decayLevel: number): string[] {
    if (decayLevel < 30) return ['Light refresher course', 'Industry news reading'];
    if (decayLevel < 60) return ['Intensive course', 'Practice projects', 'Peer learning'];
    return ['Comprehensive retraining', 'Certification program', 'Mentorship', 'Portfolio projects'];
  }

  private estimateRefreshTime(skill: string, decayLevel: number): string {
    if (decayLevel < 30) return '2-4 weeks';
    if (decayLevel < 60) return '2-3 months';
    return '4-6 months';
  }

  private getRefreshResources(skill: string): LearningResource[] {
    return [
      {
        title: `${skill} Refresher Course`,
        type: 'course',
        duration: '4-8 weeks',
        cost: 200,
        credibility: 85,
        directApplicability: 90
      }
    ];
  }

  private async identifyEmergingSkills(): Promise<any[]> {
    return [
      {
        skill: 'AI/ML Fundamentals',
        marketDemand: 95,
        learningPath: [],
        competitiveAdvantage: 85
      }
    ];
  }
}

export const careerComebackEngine = new CareerComebackEngine();