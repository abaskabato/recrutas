export interface JobPosting {
  id: number;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  workType: 'remote' | 'hybrid' | 'onsite';
  status: 'active' | 'paused' | 'closed';
  viewCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
  hasExam?: boolean;
  maxChatCandidates?: number;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  skills: string[];
  experience: string;
  location: string;
  matchScore: number;
  status: 'submitted' | 'viewed' | 'screening' | 'interview_scheduled' | 'interview_completed' | 'offer' | 'rejected' | 'withdrawn';
  appliedAt: string;
  resumeUrl?: string;
  jobTitle?: string;
  examScore?: number;
  canChat?: boolean;
}

export interface DashboardStats {
  activeJobs: number;
  totalMatches: number;
  activeChats: number;
  hires: number;
}

export type TabName = 'overview' | 'jobs' | 'candidates' | 'analytics';
