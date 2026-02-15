/**
 * Profession Configuration System
 * Supports multiple professions with configurable sources and taxonomies
 */

export interface ProfessionConfig {
  code: string;
  name: string;
  category: string;
  keywords: string[];
  sources: string[]; // Which job sources to use
  atsTypes: string[]; // Preferred ATS systems
  enabled: boolean;
}

export const PROFESSIONS: ProfessionConfig[] = [
  // Technology
  {
    code: 'software-engineer',
    name: 'Software Engineer',
    category: 'Technology',
    keywords: ['software', 'engineer', 'developer', 'programmer', 'coding'],
    sources: ['sota', 'jsearch', 'remoteok', 'themuse'],
    atsTypes: ['greenhouse', 'lever', 'workday'],
    enabled: true
  },
  {
    code: 'product-manager',
    name: 'Product Manager',
    category: 'Technology',
    keywords: ['product manager', 'product owner', 'pm'],
    sources: ['sota', 'jsearch', 'themuse'],
    atsTypes: ['greenhouse', 'lever'],
    enabled: true
  },
  {
    code: 'data-scientist',
    name: 'Data Scientist',
    category: 'Technology',
    keywords: ['data scientist', 'machine learning', 'ml engineer', 'ai'],
    sources: ['sota', 'jsearch', 'themuse'],
    atsTypes: ['greenhouse', 'lever', 'workday'],
    enabled: true
  },
  {
    code: 'designer',
    name: 'Designer',
    category: 'Technology',
    keywords: ['designer', 'ux', 'ui', 'product design', 'graphic design'],
    sources: ['sota', 'jsearch', 'authenticjobs', 'themuse'],
    atsTypes: ['greenhouse', 'lever'],
    enabled: true
  },
  
  // Non-Tech: Business
  {
    code: 'sales-representative',
    name: 'Sales Representative',
    category: 'Business',
    keywords: ['sales', 'account executive', 'business development', 'bd', 'sdr'],
    sources: ['jsearch', 'weworkremotely', 'usajobs'],
    atsTypes: ['workday', 'custom'],
    enabled: true
  },
  {
    code: 'customer-service',
    name: 'Customer Service',
    category: 'Business',
    keywords: ['customer service', 'support', 'customer success', 'cs'],
    sources: ['jsearch', 'weworkremotely', 'remoteok'],
    atsTypes: ['custom', 'workday'],
    enabled: true
  },
  {
    code: 'marketing',
    name: 'Marketing',
    category: 'Business',
    keywords: ['marketing', 'growth', 'seo', 'content', 'social media'],
    sources: ['jsearch', 'weworkremotely', 'themuse'],
    atsTypes: ['greenhouse', 'lever'],
    enabled: true
  },
  {
    code: 'accountant',
    name: 'Accountant',
    category: 'Business',
    keywords: ['accountant', 'cpa', 'bookkeeping', 'finance'],
    sources: ['usajobs', 'jsearch'],
    atsTypes: ['workday', 'custom'],
    enabled: true
  },
  
  // Non-Tech: Healthcare
  {
    code: 'registered-nurse',
    name: 'Registered Nurse',
    category: 'Healthcare',
    keywords: ['registered nurse', 'rn', 'nursing', 'patient care'],
    sources: ['usajobs', 'jsearch'],
    atsTypes: ['workday', 'taleo', 'custom'],
    enabled: true
  },
  {
    code: 'healthcare-admin',
    name: 'Healthcare Administrator',
    category: 'Healthcare',
    keywords: ['healthcare admin', 'medical admin', 'hospital admin'],
    sources: ['usajobs', 'jsearch'],
    atsTypes: ['workday', 'custom'],
    enabled: true
  },
  
  // Non-Tech: Legal
  {
    code: 'paralegal',
    name: 'Paralegal',
    category: 'Legal',
    keywords: ['paralegal', 'legal assistant', 'law firm'],
    sources: ['usajobs', 'jsearch'],
    atsTypes: ['custom', 'workday'],
    enabled: true
  },
  
  // Non-Tech: Education
  {
    code: 'teacher',
    name: 'Teacher',
    category: 'Education',
    keywords: ['teacher', 'educator', 'instructor', 'professor'],
    sources: ['usajobs', 'jsearch'],
    atsTypes: ['custom', 'workday'],
    enabled: true
  },
  
  // Non-Tech: Trades
  {
    code: 'electrician',
    name: 'Electrician',
    category: 'Trades',
    keywords: ['electrician', 'electrical', 'journeyman'],
    sources: ['usajobs', 'jsearch'],
    atsTypes: ['custom'],
    enabled: true
  },
  {
    code: 'construction',
    name: 'Construction',
    category: 'Trades',
    keywords: ['construction', 'carpenter', 'plumber', 'hvac'],
    sources: ['usajobs', 'jsearch'],
    atsTypes: ['custom'],
    enabled: true
  }
];

export function getProfessions(): ProfessionConfig[] {
  return PROFESSIONS.filter(p => p.enabled);
}

export function getProfession(code: string): ProfessionConfig | undefined {
  return PROFESSIONS.find(p => p.code === code && p.enabled);
}

export function getProfessionsByCategory(category: string): ProfessionConfig[] {
  return PROFESSIONS.filter(p => p.category === category && p.enabled);
}

export function detectProfession(title: string, description: string = ''): ProfessionConfig | undefined {
  const text = (title + ' ' + description).toLowerCase();

  // Score each profession by keyword matches using word boundaries
  const scores = PROFESSIONS.map(profession => {
    const matches = profession.keywords.filter(keyword => {
      const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
    }).length;
    return { profession, matches };
  });

  // Return highest scoring profession (sort a copy to avoid mutation)
  const sorted = [...scores].sort((a, b) => b.matches - a.matches);
  return sorted[0].matches > 0 ? sorted[0].profession : undefined;
}

export function getSourcesForProfession(professionCode: string): string[] {
  const profession = getProfession(professionCode);
  return profession?.sources || ['jsearch'];
}
