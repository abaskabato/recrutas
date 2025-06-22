/**
 * Utilities Index
 * 
 * Centralized export of utility functions for consistent usage across the application.
 * Organized by functional categories for better maintainability.
 */

// String and Text Processing
export * from './string.utils';
export * from './validation.utils';

// Date and Time Operations
export * from './date.utils';

// Data Transformation and Formatting
export * from './format.utils';
export * from './transform.utils';

// API and Network Utilities
export * from './api.utils';

// Local Storage and State Management
export * from './storage.utils';

// UI and Component Helpers
export * from './ui.utils';

// Constants and Configuration
export * from './constants';

/**
 * Common utility functions that don't fit into specific categories
 */

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Check if environment is development
 */
export const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Check if environment is production
 */
export const isProduction = import.meta.env.MODE === 'production';