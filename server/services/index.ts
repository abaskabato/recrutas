// Core Services
export { JobService } from './job.service';
export { ResumeService } from './resume.service';
export { ExamService } from './exam.service';

// Service Dependencies (Simplified)
export const serviceDependencies = {
  job: ['db'],
  resume: ['storage', 'aiResumeParser'],
  exam: ['storage']
} as const;

export const serviceConfig = {
  cache: { defaultTTL: 300000 },
  retry: { attempts: 3 }
} as const;