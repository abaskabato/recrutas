/**
 * Application Constants
 * 
 * Centralized constants for consistent values across the Recrutas platform.
 * Organized by functional categories for easy maintenance and updates.
 */

// =============================================================================
// APPLICATION CONFIGURATION
// =============================================================================

export const APP_CONFIG = {
  name: 'Recrutas',
  version: '1.0.0',
  description: 'AI-powered hiring platform revolutionizing talent acquisition',
  tagline: 'DoorDash for Jobs',
} as const;

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const API_CONFIG = {
  baseUrl: '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// =============================================================================
// PAGINATION & LIMITS
// =============================================================================

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultOffset: 0,
} as const;

export const LIMITS = {
  maxSkills: 20,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxDescriptionLength: 5000,
  maxBioLength: 1000,
  maxMessageLength: 2000,
} as const;

// =============================================================================
// USER INTERFACE
// =============================================================================

export const UI_CONFIG = {
  animationDuration: 300,
  debounceDelay: 300,
  throttleDelay: 100,
  toastDuration: 5000,
  modalZIndex: 1000,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// =============================================================================
// JOB MATCHING & SEARCH
// =============================================================================

export const MATCHING_CONFIG = {
  minConfidenceThreshold: 0.6,
  maxMatchesPerCandidate: 50,
  matchScoreDecimalPlaces: 1,
  searchDebounceMs: 500,
} as const;

export const WORK_TYPES = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
} as const;

export const JOB_URGENCY_LEVELS = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
} as const;

// =============================================================================
// APPLICATION STATUS VALUES
// =============================================================================

export const APPLICATION_STATUSES = {
  submitted: 'Submitted',
  viewed: 'Viewed',
  screening: 'In Screening',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer: 'Offer Extended',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
} as const;

export const MATCH_STATUSES = {
  pending: 'Pending',
  viewed: 'Viewed',
  interested: 'Interested',
  applied: 'Applied',
  rejected: 'Rejected',
} as const;

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

export const NOTIFICATION_TYPES = {
  application_viewed: 'Application Viewed',
  application_ranked: 'Application Ranked',
  application_accepted: 'Application Accepted',
  application_rejected: 'Application Rejected',
  exam_completed: 'Exam Completed',
  candidate_message: 'Message Received',
  interview_scheduled: 'Interview Scheduled',
  high_score_alert: 'High Score Alert',
  direct_connection: 'Direct Connection',
  status_update: 'Status Update',
  new_match: 'New Match',
} as const;

export const NOTIFICATION_PRIORITIES = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
} as const;

// =============================================================================
// FILE HANDLING
// =============================================================================

export const ACCEPTED_FILE_TYPES = {
  resume: {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  image: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
  },
} as const;

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

export const REGEX_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/,
  github: /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/,
  salary: /^\d+(\.\d{2})?$/,
} as const;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const ERROR_MESSAGES = {
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  invalidUrl: 'Please enter a valid URL',
  fileTooLarge: 'File size exceeds the maximum limit',
  invalidFileType: 'Invalid file type',
  networkError: 'Network error. Please try again.',
  authRequired: 'Authentication required',
  forbidden: 'Access denied',
  notFound: 'Resource not found',
  serverError: 'Server error. Please try again later.',
} as const;

// =============================================================================
// SUCCESS MESSAGES
// =============================================================================

export const SUCCESS_MESSAGES = {
  profileUpdated: 'Profile updated successfully',
  applicationSubmitted: 'Application submitted successfully',
  jobPosted: 'Job posted successfully',
  messageReceived: 'Message sent successfully',
  fileUploaded: 'File uploaded successfully',
  settingsSaved: 'Settings saved successfully',
} as const;

// =============================================================================
// ROUTES
// =============================================================================

export const ROUTES = {
  home: '/',
  candidateDashboard: '/candidate-dashboard',
  talentDashboard: '/talent-dashboard',
  chat: '/chat',
  profile: '/profile',
  settings: '/settings',
  help: '/help',
} as const;

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
  userPreferences: 'recrutas_user_preferences',
  searchFilters: 'recrutas_search_filters',
  draftJobPost: 'recrutas_draft_job',
  theme: 'recrutas_theme',
  notificationSettings: 'recrutas_notifications',
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const FEATURE_FLAGS = {
  enableAIMatching: true,
  enableRealTimeChat: true,
  enableNotifications: true,
  enableFileUpload: true,
  enableVideoInterviews: false, // Coming soon
  enableAdvancedAnalytics: true,
} as const;