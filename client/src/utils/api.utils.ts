/**
 * API Utilities
 * 
 * Helper functions for API interactions, error handling,
 * and network request management across the Recrutas platform.
 */

import { API_CONFIG } from './constants';

/**
 * API response wrapper type
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

/**
 * Build query string from parameters
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Build API URL with base path and query parameters
 */
export function buildApiUrl(endpoint: string, params?: Record<string, any>): string {
  const baseUrl = `${API_CONFIG.baseUrl}${endpoint}`;
  const queryString = params ? buildQueryString(params) : '';
  return `${baseUrl}${queryString}`;
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if response is successful
 */
export function isSuccessResponse(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Create form data from object
 */
export function createFormData(data: Record<string, any>): FormData {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(item => formData.append(key, String(item)));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  
  return formData;
}

/**
 * Extract error message from fetch response
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message || data.error || 'Request failed';
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

/**
 * Retry API request with exponential backoff
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = API_CONFIG.retryAttempts,
  baseDelay: number = API_CONFIG.retryDelay
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return !error.response || error.code === 'NETWORK_ERROR';
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout');
}

/**
 * Format API request headers
 */
export function getApiHeaders(includeAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Note: Authentication headers would be added by the fetch wrapper
  // that handles session management
  
  return headers;
}

/**
 * Validate API response structure
 */
export function validateApiResponse(response: any): boolean {
  return response && typeof response === 'object';
}

/**
 * Transform API filters for query parameters
 */
export function transformFiltersForApi(filters: Record<string, any>): Record<string, any> {
  const transformed: Record<string, any> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        transformed[key] = value;
      } else if (!Array.isArray(value)) {
        transformed[key] = value;
      }
    }
  });
  
  return transformed;
}