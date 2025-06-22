/**
 * Services Index
 * 
 * Centralized export of all business logic services for the Recrutas platform.
 * This barrel export pattern provides a clean interface for importing services
 * throughout the application while maintaining clear separation of concerns.
 */

// Core Business Logic Services
export { MatchingService } from './matching.service';
export { JobService } from './job.service';
export { CandidateService } from './candidate.service';
export { NotificationService } from './notification.service';
export { ApplicationService } from './application.service';
export { ChatService } from './chat.service';

// External Integration Services
export { JobAggregatorService } from './job-aggregator.service';
export { ResumeParserService } from './resume-parser.service';
export { EmailService } from './email.service';

// Utility Services
export { CacheService } from './cache.service';
export { ValidationService } from './validation.service';
export { SecurityService } from './security.service';

/**
 * Service Dependencies
 * 
 * This object maps service dependencies for dependency injection.
 * Services can be instantiated with their required dependencies.
 */
export const serviceDependencies = {
  matching: ['job', 'candidate', 'notification'],
  application: ['notification', 'email'],
  chat: ['notification'],
  jobAggregator: ['cache'],
  notification: ['email'],
} as const;

/**
 * Service Configuration
 * 
 * Default configuration for all services.
 * Can be overridden by environment variables.
 */
export const serviceConfig = {
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
  },
  matching: {
    minConfidenceThreshold: 0.6,
    maxMatchesPerCandidate: 50,
  },
  notification: {
    batchSize: 10,
    retryAttempts: 3,
  },
  jobAggregator: {
    timeout: 30000, // 30 seconds
    maxConcurrentRequests: 5,
  },
} as const;