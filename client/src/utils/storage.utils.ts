/**
 * Storage Utilities
 * 
 * Local storage and session storage management functions
 * for persistent data across the Recrutas platform.
 */

import { STORAGE_KEYS } from './constants';

/**
 * Safe localStorage wrapper with error handling
 */
export class SafeStorage {
  private static isAvailable(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  static setItem(key: string, value: any): boolean {
    if (!this.isAvailable()) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  static getItem<T>(key: string, defaultValue: T): T {
    if (!this.isAvailable()) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static removeItem(key: string): boolean {
    if (!this.isAvailable()) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  static clear(): boolean {
    if (!this.isAvailable()) return false;
    
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * User preferences management
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  emailUpdates: boolean;
  autoSave: boolean;
}

export function getUserPreferences(): UserPreferences {
  return SafeStorage.getItem(STORAGE_KEYS.userPreferences, {
    theme: 'system',
    language: 'en',
    notifications: true,
    emailUpdates: true,
    autoSave: true,
  });
}

export function setUserPreferences(preferences: Partial<UserPreferences>): void {
  const current = getUserPreferences();
  const updated = { ...current, ...preferences };
  SafeStorage.setItem(STORAGE_KEYS.userPreferences, updated);
}

// Profile caching for resilience
export interface CachedProfile {
  data: any;
  cachedAt: number;
}

export function getCachedProfile(): any | null {
  const cached = SafeStorage.getItem<CachedProfile | null>(STORAGE_KEYS.candidateProfile, null);
  if (!cached) return null;

  // Cache valid for 30 minutes
  const MAX_AGE = 1000 * 60 * 30;
  if (Date.now() - cached.cachedAt > MAX_AGE) return null;

  return cached.data;
}

export function setCachedProfile(profile: any): void {
  if (profile && profile.skills && profile.skills.length > 0) {
    SafeStorage.setItem(STORAGE_KEYS.candidateProfile, {
      data: profile,
      cachedAt: Date.now()
    });
  }
}

export function clearCachedProfile(): void {
  SafeStorage.removeItem(STORAGE_KEYS.candidateProfile);
}

/**
 * Search filters persistence
 */
export interface SearchFilters {
  skills: string[];
  location: string;
  workType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  industry: string;
}

export function getSearchFilters(): Partial<SearchFilters> {
  return SafeStorage.getItem(STORAGE_KEYS.searchFilters, {});
}

export function setSearchFilters(filters: Partial<SearchFilters>): void {
  SafeStorage.setItem(STORAGE_KEYS.searchFilters, filters);
}

export function clearSearchFilters(): void {
  SafeStorage.removeItem(STORAGE_KEYS.searchFilters);
}

/**
 * Draft job post management
 */
export interface DraftJobPost {
  title: string;
  company: string;
  description: string;
  skills: string[];
  workType: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  lastSaved: string;
}

export function getDraftJobPost(): DraftJobPost | null {
  return SafeStorage.getItem(STORAGE_KEYS.draftJobPost, null);
}

export function saveDraftJobPost(draft: Partial<DraftJobPost>): void {
  const current = getDraftJobPost() || {};
  const updated = {
    ...current,
    ...draft,
    lastSaved: new Date().toISOString(),
  };
  SafeStorage.setItem(STORAGE_KEYS.draftJobPost, updated);
}

export function clearDraftJobPost(): void {
  SafeStorage.removeItem(STORAGE_KEYS.draftJobPost);
}

/**
 * Theme management
 */
export function getTheme(): string {
  return SafeStorage.getItem(STORAGE_KEYS.theme, 'system');
}

export function setTheme(theme: string): void {
  SafeStorage.setItem(STORAGE_KEYS.theme, theme);
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  browser: boolean;
  email: boolean;
  sms: boolean;
  newMatches: boolean;
  applications: boolean;
  messages: boolean;
}

export function getNotificationSettings(): NotificationSettings {
  return SafeStorage.getItem(STORAGE_KEYS.notificationSettings, {
    browser: true,
    email: true,
    sms: false,
    newMatches: true,
    applications: true,
    messages: true,
  });
}

export function setNotificationSettings(settings: Partial<NotificationSettings>): void {
  const current = getNotificationSettings();
  const updated = { ...current, ...settings };
  SafeStorage.setItem(STORAGE_KEYS.notificationSettings, updated);
}

/**
 * Session storage utilities
 */
export class SessionStorage {
  static setItem(key: string, value: any): boolean {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static removeItem(key: string): boolean {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  static clear(): boolean {
    try {
      sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Clear all application data
 */
export function clearAllAppData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    SafeStorage.removeItem(key);
  });
}