/**
 * Transform Utilities
 * 
 * Data transformation functions for converting between different
 * data formats and structures across the Recrutas platform.
 */

/**
 * Transform API response to frontend format
 */
export function transformApiResponse<T>(response: any): T {
  // Remove null values and convert to appropriate types
  const cleaned = Object.entries(response).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  return cleaned as T;
}

/**
 * Transform form data for API submission
 */
export function transformFormData(formData: Record<string, any>): Record<string, any> {
  const transformed = { ...formData };
  
  // Convert empty strings to null
  Object.keys(transformed).forEach(key => {
    if (transformed[key] === '') {
      transformed[key] = null;
    }
  });

  return transformed;
}

/**
 * Transform skills array to comma-separated string
 */
export function skillsToString(skills: string[]): string {
  return skills.join(', ');
}

/**
 * Transform comma-separated string to skills array
 */
export function stringToSkills(skillsString: string): string[] {
  return skillsString
    .split(',')
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);
}

/**
 * Transform job posting for display
 */
export function transformJobForDisplay(job: any) {
  return {
    ...job,
    salaryRange: job.salaryMin && job.salaryMax 
      ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
      : 'Salary not specified',
    skillsList: job.skills ? job.skills.join(', ') : 'No skills specified',
    workTypeLabel: job.workType === 'remote' ? 'Remote' : 
                   job.workType === 'hybrid' ? 'Hybrid' : 'On-site',
  };
}

/**
 * Transform candidate profile for API
 */
export function transformCandidateForApi(candidate: any) {
  return {
    ...candidate,
    skills: Array.isArray(candidate.skills) ? candidate.skills : [],
    salaryExpectation: candidate.salaryExpectation ? 
      parseInt(candidate.salaryExpectation) : null,
  };
}

/**
 * Flatten nested object
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

/**
 * Group array by property
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by multiple criteria
 */
export function sortBy<T>(array: T[], ...criteria: Array<keyof T | ((item: T) => any)>): T[] {
  return [...array].sort((a, b) => {
    for (const criterion of criteria) {
      let aVal, bVal;
      
      if (typeof criterion === 'function') {
        aVal = criterion(a);
        bVal = criterion(b);
      } else {
        aVal = a[criterion];
        bVal = b[criterion];
      }
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

/**
 * Create lookup map from array
 */
export function createLookupMap<T>(array: T[], key: keyof T): Map<any, T> {
  return new Map(array.map(item => [item[key], item]));
}

/**
 * Merge objects deeply
 */
export function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Extract unique values from array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Transform pagination data
 */
export function transformPaginationData(data: any[], page: number, limit: number) {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = data.slice(start, end);
  
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}