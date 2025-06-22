/**
 * UI Utilities
 * 
 * User interface helper functions for consistent styling,
 * animations, and visual feedback across the Recrutas platform.
 */

import { UI_CONFIG } from './constants';

/**
 * Generate CSS class names conditionally
 */
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Generate status badge color based on status
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-gray-100 text-gray-800',
    closed: 'bg-red-100 text-red-800',
    viewed: 'bg-blue-100 text-blue-800',
    interested: 'bg-purple-100 text-purple-800',
    applied: 'bg-indigo-100 text-indigo-800',
    rejected: 'bg-red-100 text-red-800',
    accepted: 'bg-green-100 text-green-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Generate priority badge color
 */
export function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };
  
  return priorityColors[priority] || 'bg-gray-100 text-gray-600';
}

/**
 * Generate work type icon
 */
export function getWorkTypeIcon(workType: string): string {
  const workTypeIcons: Record<string, string> = {
    remote: '🏠',
    hybrid: '🔄',
    onsite: '🏢',
  };
  
  return workTypeIcons[workType] || '📍';
}

/**
 * Generate avatar background color from name
 */
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-gray-500',
  ];
  
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

/**
 * Smooth scroll to element
 */
export function scrollToElement(elementId: string, offset: number = 0): void {
  const element = document.getElementById(elementId);
  if (element) {
    const top = element.offsetTop - offset;
    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

/**
 * Format match score for display with color
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-yellow-600';
  if (score >= 0.4) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get relative position for tooltips
 */
export function getTooltipPosition(element: HTMLElement, tooltip: HTMLElement): { top: number; left: number } {
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let top = rect.top - tooltipRect.height - 8;
  let left = rect.left + (rect.width - tooltipRect.width) / 2;
  
  // Adjust if tooltip goes off screen
  if (top < 0) {
    top = rect.bottom + 8;
  }
  
  if (left < 0) {
    left = 8;
  } else if (left + tooltipRect.width > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width - 8;
  }
  
  return { top, left };
}

/**
 * Generate loading skeleton classes
 */
export function getSkeletonClasses(variant: 'text' | 'avatar' | 'card' = 'text'): string {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  switch (variant) {
    case 'avatar':
      return `${baseClasses} rounded-full w-10 h-10`;
    case 'card':
      return `${baseClasses} rounded-lg w-full h-32`;
    default:
      return `${baseClasses} rounded h-4 w-full`;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(1);
  
  return `${size} ${sizes[i]}`;
}

/**
 * Generate notification toast classes
 */
export function getToastClasses(type: 'success' | 'error' | 'warning' | 'info' = 'info'): string {
  const baseClasses = 'rounded-lg p-4 shadow-lg';
  
  const typeClasses: Record<string, string> = {
    success: 'bg-green-50 border border-green-200 text-green-800',
    error: 'bg-red-50 border border-red-200 text-red-800',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border border-blue-200 text-blue-800',
  };
  
  return `${baseClasses} ${typeClasses[type]}`;
}

/**
 * Calculate reading time for text
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Generate breadcrumb from path
 */
export function generateBreadcrumbs(path: string): Array<{ label: string; href: string }> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ label: 'Home', href: '/' }];
  
  let currentPath = '';
  segments.forEach(segment => {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
    breadcrumbs.push({ label, href: currentPath });
  });
  
  return breadcrumbs;
}

/**
 * Validate file type and size
 */
export function validateFile(file: File, allowedTypes: string[], maxSize: number): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${formatFileSize(maxSize)} limit` };
  }
  
  return { valid: true };
}

/**
 * Generate random placeholder image URL
 */
export function getPlaceholderImage(width: number = 400, height: number = 300, text?: string): string {
  const baseUrl = 'https://via.placeholder.com';
  const dimensions = `${width}x${height}`;
  const textParam = text ? `?text=${encodeURIComponent(text)}` : '';
  
  return `${baseUrl}/${dimensions}${textParam}`;
}