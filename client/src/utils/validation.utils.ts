/**
 * Validation Utilities
 * 
 * Comprehensive validation functions for form data, user input,
 * and business logic validation across the Recrutas platform.
 */

import { REGEX_PATTERNS } from './constants';

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return REGEX_PATTERNS.email.test(email.trim());
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string): boolean {
  return REGEX_PATTERNS.phone.test(phone.trim());
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  return REGEX_PATTERNS.url.test(url.trim());
}

/**
 * Validate LinkedIn URL
 */
export function isValidLinkedInUrl(url: string): boolean {
  return REGEX_PATTERNS.linkedin.test(url.trim());
}

/**
 * Validate GitHub URL
 */
export function isValidGitHubUrl(url: string): boolean {
  return REGEX_PATTERNS.github.test(url.trim());
}

/**
 * Validate salary amount
 */
export function isValidSalary(amount: string | number): boolean {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) && numAmount > 0 && numAmount < 10000000;
}

/**
 * Validate required field
 */
export function isRequired(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * Validate minimum length
 */
export function minLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

/**
 * Validate maximum length
 */
export function maxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}

/**
 * Validate skills array
 */
export function isValidSkillsArray(skills: string[]): boolean {
  return Array.isArray(skills) && 
         skills.length > 0 && 
         skills.length <= 20 &&
         skills.every(skill => skill.trim().length > 0);
}

/**
 * Validate work type
 */
export function isValidWorkType(workType: string): boolean {
  return ['remote', 'hybrid', 'onsite'].includes(workType);
}

/**
 * Validate urgency level
 */
export function isValidUrgency(urgency: string): boolean {
  return ['low', 'medium', 'high'].includes(urgency);
}

/**
 * Validate file type
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

/**
 * Validate match score
 */
export function isValidMatchScore(score: number): boolean {
  return score >= 0 && score <= 1;
}

/**
 * Validate job title
 */
export function isValidJobTitle(title: string): boolean {
  return isRequired(title) && 
         minLength(title, 3) && 
         maxLength(title, 100);
}

/**
 * Validate company name
 */
export function isValidCompanyName(company: string): boolean {
  return isRequired(company) && 
         minLength(company, 2) && 
         maxLength(company, 100);
}

/**
 * Validate job description
 */
export function isValidJobDescription(description: string): boolean {
  return isRequired(description) && 
         minLength(description, 50) && 
         maxLength(description, 5000);
}

/**
 * Validate experience level
 */
export function isValidExperienceLevel(level: string): boolean {
  return ['entry', 'mid', 'senior', 'lead', 'executive'].includes(level);
}

/**
 * Comprehensive form validation
 */
export function validateJobPostingForm(data: {
  title: string;
  company: string;
  description: string;
  skills: string[];
  workType: string;
  salaryMin?: number;
  salaryMax?: number;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!isValidJobTitle(data.title)) {
    errors.title = 'Job title must be 3-100 characters long';
  }

  if (!isValidCompanyName(data.company)) {
    errors.company = 'Company name must be 2-100 characters long';
  }

  if (!isValidJobDescription(data.description)) {
    errors.description = 'Description must be 50-5000 characters long';
  }

  if (!isValidSkillsArray(data.skills)) {
    errors.skills = 'Please add 1-20 relevant skills';
  }

  if (!isValidWorkType(data.workType)) {
    errors.workType = 'Please select a valid work type';
  }

  if (data.salaryMin && !isValidSalary(data.salaryMin)) {
    errors.salaryMin = 'Please enter a valid minimum salary';
  }

  if (data.salaryMax && !isValidSalary(data.salaryMax)) {
    errors.salaryMax = 'Please enter a valid maximum salary';
  }

  if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
    errors.salaryRange = 'Minimum salary cannot be greater than maximum salary';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate candidate profile form
 */
export function validateCandidateProfileForm(data: {
  skills: string[];
  experience?: string;
  summary?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!isValidSkillsArray(data.skills)) {
    errors.skills = 'Please add 1-20 relevant skills';
  }

  if (data.summary && !maxLength(data.summary, 1000)) {
    errors.summary = 'Summary must be under 1000 characters';
  }

  if (data.linkedinUrl && !isValidLinkedInUrl(data.linkedinUrl)) {
    errors.linkedinUrl = 'Please enter a valid LinkedIn URL';
  }

  if (data.githubUrl && !isValidGitHubUrl(data.githubUrl)) {
    errors.githubUrl = 'Please enter a valid GitHub URL';
  }

  if (data.portfolioUrl && !isValidUrl(data.portfolioUrl)) {
    errors.portfolioUrl = 'Please enter a valid portfolio URL';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}