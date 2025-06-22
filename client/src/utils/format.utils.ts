/**
 * Format Utilities
 * 
 * Comprehensive formatting functions for consistent data presentation
 * across the Recrutas platform.
 */

/**
 * Format salary range for display
 */
export function formatSalaryRange(min?: number, max?: number): string {
  if (!min && !max) return 'Salary not specified';
  if (!min) return `Up to ${formatCurrency(max!)}`;
  if (!max) return `From ${formatCurrency(min)}`;
  if (min === max) return formatCurrency(min);
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

/**
 * Format currency with appropriate locale
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format job match score for display
 */
export function formatMatchScore(score: string | number): string {
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numScore)) return 'N/A';
  return `${Math.round(numScore * 100)}% match`;
}

/**
 * Format skills array for display
 */
export function formatSkillsList(skills: string[], maxDisplay: number = 3): string {
  if (skills.length <= maxDisplay) {
    return skills.join(', ');
  }
  const displayed = skills.slice(0, maxDisplay);
  const remaining = skills.length - maxDisplay;
  return `${displayed.join(', ')} +${remaining} more`;
}

/**
 * Format work type for display
 */
export function formatWorkType(workType: string): string {
  const workTypeMap: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  };
  return workTypeMap[workType] || workType;
}

/**
 * Format location for display
 */
export function formatLocation(location?: string): string {
  if (!location) return 'Location not specified';
  return location;
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format application status for display
 */
export function formatApplicationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    submitted: 'Submitted',
    viewed: 'Viewed',
    screening: 'In Screening',
    interview_scheduled: 'Interview Scheduled',
    interview_completed: 'Interview Completed',
    offer: 'Offer Extended',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return statusMap[status] || status;
}

/**
 * Format urgency level for display
 */
export function formatUrgency(urgency: string): string {
  const urgencyMap: Record<string, string> = {
    low: 'Low Priority',
    medium: 'Medium Priority',
    high: 'High Priority',
  };
  return urgencyMap[urgency] || urgency;
}

/**
 * Format industry name
 */
export function formatIndustry(industry?: string): string {
  if (!industry) return 'Industry not specified';
  return industry.charAt(0).toUpperCase() + industry.slice(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Format company name for display
 */
export function formatCompanyName(company: string): string {
  return company.trim();
}

/**
 * Format profile strength as percentage
 */
export function formatProfileStrength(strength: number): string {
  return `${Math.max(0, Math.min(100, strength))}%`;
}

/**
 * Format notification priority
 */
export function formatNotificationPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  return priorityMap[priority] || priority;
}