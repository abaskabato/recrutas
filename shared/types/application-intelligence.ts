export interface ApplicationIntelligence {
  id: number;
  status: string;
  appliedAt: string;
  viewedByEmployerAt?: string;
  lastStatusUpdate: string;
  interviewDate?: string;
  candidateName: string;
  candidateEmail: string;
  hackerrankAssessmentId?: number;
  codilityAssessmentId?: number;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    workType: string;
  };
  match?: {
    matchScore: string;
    confidenceLevel: string;
  };
  // Revolutionary Intelligence Features
  intelligence?: {
    timeline: Array<{
      timestamp: string;
      type: string;
      actor: string;
      details: {
        viewDuration?: number;
        ranking?: number;
        totalApplicants?: number;
        feedback?: string;
        humanReadable: string;
      };
    }>;
    insights: {
      strengthsIdentified: string[];
      improvementAreas: string[];
      recommendedActions: string[];
    };
    benchmarks: {
      averageViewTime: number;
      yourViewTime: number;
      averageScore: number;
      yourScore: number;
    };
  };
}