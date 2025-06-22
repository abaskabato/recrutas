// Shared utilities for both candidate and talent manager dashboards
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Status color mappings shared between dashboards
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'applied': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'viewed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'interested': return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'screening': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'interview': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'hired': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'pending': return 'bg-slate-100 text-slate-800 border-slate-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

// Format salary consistently across dashboards
export const formatSalary = (min?: number, max?: number) => {
  if (!min && !max) return 'Salary not specified';
  if (min && max) return `$${(min/1000).toFixed(0)}k - $${(max/1000).toFixed(0)}k`;
  if (min) return `$${(min/1000).toFixed(0)}k+`;
  return `Up to $${(max!/1000).toFixed(0)}k`;
};

// Format work type consistently
export const formatWorkType = (workType: string) => {
  switch (workType?.toLowerCase()) {
    case 'remote': return 'Remote';
    case 'hybrid': return 'Hybrid';
    case 'onsite': return 'On-site';
    default: return 'Not specified';
  }
};

// Format experience level consistently
export const formatExperience = (experience: string) => {
  switch (experience?.toLowerCase()) {
    case 'entry': return 'Entry Level';
    case 'mid': return 'Mid Level';
    case 'senior': return 'Senior Level';
    case 'lead': return 'Lead';
    case 'manager': return 'Manager';
    case 'director': return 'Director';
    default: return experience || 'Not specified';
  }
};

// Date formatting utilities
export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const timeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return formatDate(date);
};

// File validation utilities
export const validateFileType = (file: File, allowedTypes: string[]) => {
  return allowedTypes.some(type => 
    file.type === type || file.name.toLowerCase().endsWith(type.replace('application/', '.'))
  );
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Match score utilities
export const getMatchScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600 bg-green-100';
  if (score >= 75) return 'text-blue-600 bg-blue-100';
  if (score >= 60) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export const getMatchScoreLabel = (score: number) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Poor';
};

// Error handling utilities
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  return 'An unexpected error occurred';
};

// Loading state utilities
export const createLoadingArray = (length: number) => 
  Array.from({ length }, (_, i) => i);

// Skills utilities
export const formatSkills = (skills: string[] | null | undefined) => {
  if (!skills || skills.length === 0) return [];
  return skills.filter(skill => skill && skill.trim().length > 0);
};

export const highlightMatchingSkills = (jobSkills: string[], candidateSkills: string[]) => {
  const jobSkillsLower = jobSkills.map(skill => skill.toLowerCase());
  const candidateSkillsLower = candidateSkills.map(skill => skill.toLowerCase());
  
  return jobSkills.map(skill => ({
    skill,
    isMatch: candidateSkillsLower.includes(skill.toLowerCase())
  }));
};

// Dashboard navigation utilities
export const getDashboardRoute = (userRole: string) => {
  switch (userRole) {
    case 'candidate': return '/candidate-dashboard';
    case 'talent_owner': return '/talent-dashboard';
    default: return '/role-selection';
  }
};

// Notification utilities
export const getNotificationIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'match': return '🎯';
    case 'message': return '💬';
    case 'application': return '📝';
    case 'interview': return '🗓️';
    case 'hire': return '🎉';
    case 'rejection': return '❌';
    default: return '📢';
  }
};

export const getNotificationColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'match': return 'bg-blue-100 text-blue-800';
    case 'message': return 'bg-green-100 text-green-800';
    case 'application': return 'bg-purple-100 text-purple-800';
    case 'interview': return 'bg-orange-100 text-orange-800';
    case 'hire': return 'bg-emerald-100 text-emerald-800';
    case 'rejection': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};