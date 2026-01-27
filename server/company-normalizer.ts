/**
 * Company Normalizer Service
 *
 * Maps company name variations to canonical IDs for:
 * - Better deduplication
 * - Company-level analytics
 * - Improved filtering
 *
 * Handles:
 * - Legal suffixes (Inc, LLC, Ltd, Corp)
 * - Common abbreviations
 * - Acquisitions and subsidiaries
 * - Spelling variations
 */

export interface CanonicalCompany {
  id: string;
  canonicalName: string;
  aliases: string[];
  logoUrl?: string;
  website?: string;
  industry?: string;
  size?: string;
  parentCompany?: string;
  subsidiaries?: string[];
}

// Map of well-known companies with their aliases
const COMPANY_DATABASE: CanonicalCompany[] = [
  // FAANG / Big Tech
  {
    id: 'google',
    canonicalName: 'Google',
    aliases: ['google llc', 'google inc', 'alphabet', 'alphabet inc', 'google cloud', 'google deepmind'],
    website: 'https://google.com',
    industry: 'Technology',
    size: '10000+',
    subsidiaries: ['DeepMind', 'Waymo', 'Verily', 'Wing', 'YouTube']
  },
  {
    id: 'meta',
    canonicalName: 'Meta',
    aliases: ['meta platforms', 'meta platforms inc', 'facebook', 'facebook inc', 'fb', 'meta reality labs'],
    website: 'https://meta.com',
    industry: 'Technology',
    size: '10000+',
    subsidiaries: ['Instagram', 'WhatsApp', 'Oculus', 'Reality Labs']
  },
  {
    id: 'amazon',
    canonicalName: 'Amazon',
    aliases: ['amazon.com', 'amazon.com inc', 'amazon inc', 'amazon web services', 'aws', 'amazon lab126'],
    website: 'https://amazon.com',
    industry: 'Technology',
    size: '10000+',
    subsidiaries: ['AWS', 'Twitch', 'Whole Foods', 'Ring', 'MGM', 'Audible']
  },
  {
    id: 'apple',
    canonicalName: 'Apple',
    aliases: ['apple inc', 'apple computer', 'apple computer inc'],
    website: 'https://apple.com',
    industry: 'Technology',
    size: '10000+'
  },
  {
    id: 'microsoft',
    canonicalName: 'Microsoft',
    aliases: ['microsoft corp', 'microsoft corporation', 'msft', 'microsoft azure'],
    website: 'https://microsoft.com',
    industry: 'Technology',
    size: '10000+',
    subsidiaries: ['LinkedIn', 'GitHub', 'Activision Blizzard', 'Nuance']
  },
  {
    id: 'netflix',
    canonicalName: 'Netflix',
    aliases: ['netflix inc', 'netflix studios'],
    website: 'https://netflix.com',
    industry: 'Entertainment',
    size: '10000+'
  },

  // Cloud & Infrastructure
  {
    id: 'salesforce',
    canonicalName: 'Salesforce',
    aliases: ['salesforce inc', 'salesforce.com', 'salesforce.com inc', 'sfdc'],
    website: 'https://salesforce.com',
    industry: 'Technology',
    size: '10000+',
    subsidiaries: ['Slack', 'Tableau', 'MuleSoft', 'Heroku']
  },
  {
    id: 'oracle',
    canonicalName: 'Oracle',
    aliases: ['oracle corporation', 'oracle corp', 'oracle cloud'],
    website: 'https://oracle.com',
    industry: 'Technology',
    size: '10000+'
  },
  {
    id: 'ibm',
    canonicalName: 'IBM',
    aliases: ['international business machines', 'ibm corporation', 'ibm corp'],
    website: 'https://ibm.com',
    industry: 'Technology',
    size: '10000+'
  },

  // Fintech
  {
    id: 'stripe',
    canonicalName: 'Stripe',
    aliases: ['stripe inc', 'stripe payments'],
    website: 'https://stripe.com',
    industry: 'Fintech',
    size: '1000-5000'
  },
  {
    id: 'paypal',
    canonicalName: 'PayPal',
    aliases: ['paypal inc', 'paypal holdings', 'paypal holdings inc'],
    website: 'https://paypal.com',
    industry: 'Fintech',
    size: '10000+',
    subsidiaries: ['Venmo', 'Braintree', 'Honey']
  },
  {
    id: 'square',
    canonicalName: 'Block',
    aliases: ['square', 'square inc', 'block inc', 'block'],
    website: 'https://block.xyz',
    industry: 'Fintech',
    size: '5000-10000',
    subsidiaries: ['Cash App', 'Square', 'Afterpay', 'Tidal']
  },
  {
    id: 'coinbase',
    canonicalName: 'Coinbase',
    aliases: ['coinbase inc', 'coinbase global', 'coinbase global inc'],
    website: 'https://coinbase.com',
    industry: 'Fintech',
    size: '1000-5000'
  },
  {
    id: 'robinhood',
    canonicalName: 'Robinhood',
    aliases: ['robinhood markets', 'robinhood markets inc'],
    website: 'https://robinhood.com',
    industry: 'Fintech',
    size: '1000-5000'
  },

  // Enterprise Software
  {
    id: 'adobe',
    canonicalName: 'Adobe',
    aliases: ['adobe inc', 'adobe systems', 'adobe systems inc'],
    website: 'https://adobe.com',
    industry: 'Technology',
    size: '10000+'
  },
  {
    id: 'atlassian',
    canonicalName: 'Atlassian',
    aliases: ['atlassian inc', 'atlassian corporation', 'atlassian corp'],
    website: 'https://atlassian.com',
    industry: 'Technology',
    size: '5000-10000'
  },
  {
    id: 'workday',
    canonicalName: 'Workday',
    aliases: ['workday inc'],
    website: 'https://workday.com',
    industry: 'Technology',
    size: '10000+'
  },
  {
    id: 'servicenow',
    canonicalName: 'ServiceNow',
    aliases: ['servicenow inc'],
    website: 'https://servicenow.com',
    industry: 'Technology',
    size: '10000+'
  },

  // Collaboration & Productivity
  {
    id: 'slack',
    canonicalName: 'Slack',
    aliases: ['slack technologies', 'slack technologies inc'],
    website: 'https://slack.com',
    industry: 'Technology',
    size: '1000-5000',
    parentCompany: 'Salesforce'
  },
  {
    id: 'notion',
    canonicalName: 'Notion',
    aliases: ['notion labs', 'notion labs inc'],
    website: 'https://notion.so',
    industry: 'Technology',
    size: '500-1000'
  },
  {
    id: 'figma',
    canonicalName: 'Figma',
    aliases: ['figma inc'],
    website: 'https://figma.com',
    industry: 'Technology',
    size: '500-1000'
  },
  {
    id: 'asana',
    canonicalName: 'Asana',
    aliases: ['asana inc'],
    website: 'https://asana.com',
    industry: 'Technology',
    size: '1000-5000'
  },

  // Transportation
  {
    id: 'uber',
    canonicalName: 'Uber',
    aliases: ['uber technologies', 'uber technologies inc'],
    website: 'https://uber.com',
    industry: 'Transportation',
    size: '10000+'
  },
  {
    id: 'lyft',
    canonicalName: 'Lyft',
    aliases: ['lyft inc'],
    website: 'https://lyft.com',
    industry: 'Transportation',
    size: '5000-10000'
  },
  {
    id: 'doordash',
    canonicalName: 'DoorDash',
    aliases: ['doordash inc'],
    website: 'https://doordash.com',
    industry: 'Transportation',
    size: '5000-10000'
  },

  // E-commerce
  {
    id: 'shopify',
    canonicalName: 'Shopify',
    aliases: ['shopify inc'],
    website: 'https://shopify.com',
    industry: 'E-commerce',
    size: '10000+'
  },
  {
    id: 'ebay',
    canonicalName: 'eBay',
    aliases: ['ebay inc'],
    website: 'https://ebay.com',
    industry: 'E-commerce',
    size: '10000+'
  },

  // Social Media
  {
    id: 'twitter',
    canonicalName: 'X',
    aliases: ['twitter', 'twitter inc', 'x corp', 'x'],
    website: 'https://x.com',
    industry: 'Technology',
    size: '1000-5000'
  },
  {
    id: 'snap',
    canonicalName: 'Snap',
    aliases: ['snap inc', 'snapchat'],
    website: 'https://snap.com',
    industry: 'Technology',
    size: '5000-10000'
  },
  {
    id: 'pinterest',
    canonicalName: 'Pinterest',
    aliases: ['pinterest inc'],
    website: 'https://pinterest.com',
    industry: 'Technology',
    size: '5000-10000'
  },
  {
    id: 'reddit',
    canonicalName: 'Reddit',
    aliases: ['reddit inc'],
    website: 'https://reddit.com',
    industry: 'Technology',
    size: '1000-5000'
  },

  // AI/ML
  {
    id: 'openai',
    canonicalName: 'OpenAI',
    aliases: ['openai inc', 'openai lp'],
    website: 'https://openai.com',
    industry: 'AI',
    size: '500-1000'
  },
  {
    id: 'anthropic',
    canonicalName: 'Anthropic',
    aliases: ['anthropic pbc'],
    website: 'https://anthropic.com',
    industry: 'AI',
    size: '500-1000'
  },

  // Gaming
  {
    id: 'discord',
    canonicalName: 'Discord',
    aliases: ['discord inc'],
    website: 'https://discord.com',
    industry: 'Gaming',
    size: '500-1000'
  },

  // Developer Tools
  {
    id: 'github',
    canonicalName: 'GitHub',
    aliases: ['github inc'],
    website: 'https://github.com',
    industry: 'Technology',
    size: '1000-5000',
    parentCompany: 'Microsoft'
  },
  {
    id: 'gitlab',
    canonicalName: 'GitLab',
    aliases: ['gitlab inc'],
    website: 'https://gitlab.com',
    industry: 'Technology',
    size: '1000-5000'
  },
  {
    id: 'datadog',
    canonicalName: 'Datadog',
    aliases: ['datadog inc'],
    website: 'https://datadoghq.com',
    industry: 'Technology',
    size: '1000-5000'
  },

  // Infrastructure
  {
    id: 'cloudflare',
    canonicalName: 'Cloudflare',
    aliases: ['cloudflare inc'],
    website: 'https://cloudflare.com',
    industry: 'Technology',
    size: '1000-5000'
  },
  {
    id: 'twilio',
    canonicalName: 'Twilio',
    aliases: ['twilio inc'],
    website: 'https://twilio.com',
    industry: 'Technology',
    size: '5000-10000'
  },
  {
    id: 'vercel',
    canonicalName: 'Vercel',
    aliases: ['vercel inc', 'zeit'],
    website: 'https://vercel.com',
    industry: 'Technology',
    size: '200-500'
  }
];

// Build lookup index for fast searches
const aliasToCompanyIndex = new Map<string, CanonicalCompany>();
for (const company of COMPANY_DATABASE) {
  aliasToCompanyIndex.set(company.canonicalName.toLowerCase(), company);
  aliasToCompanyIndex.set(company.id, company);
  for (const alias of company.aliases) {
    aliasToCompanyIndex.set(alias.toLowerCase(), company);
  }
}

class CompanyNormalizer {
  /**
   * Normalize a company name to its canonical form
   */
  normalize(companyName: string): string {
    const canonical = this.getCanonicalCompany(companyName);
    return canonical?.canonicalName || this.basicNormalize(companyName);
  }

  /**
   * Get the canonical company object for a given name
   */
  getCanonicalCompany(companyName: string): CanonicalCompany | null {
    const normalized = this.basicNormalize(companyName).toLowerCase();

    // Direct lookup
    let match = aliasToCompanyIndex.get(normalized);
    if (match) return match;

    // Try removing common suffixes
    const withoutSuffix = this.removeCommonSuffixes(normalized);
    match = aliasToCompanyIndex.get(withoutSuffix);
    if (match) return match;

    // Try partial matching for longer names
    for (const [alias, company] of aliasToCompanyIndex.entries()) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return company;
      }
    }

    return null;
  }

  /**
   * Get canonical company ID
   */
  getCanonicalId(companyName: string): string {
    const canonical = this.getCanonicalCompany(companyName);
    return canonical?.id || this.basicNormalize(companyName).toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Check if two company names refer to the same company
   */
  isSameCompany(name1: string, name2: string): boolean {
    const id1 = this.getCanonicalId(name1);
    const id2 = this.getCanonicalId(name2);
    return id1 === id2;
  }

  /**
   * Get all known aliases for a company
   */
  getAliases(companyName: string): string[] {
    const canonical = this.getCanonicalCompany(companyName);
    if (canonical) {
      return [canonical.canonicalName, ...canonical.aliases];
    }
    return [companyName];
  }

  /**
   * Get company metadata
   */
  getCompanyInfo(companyName: string): Partial<CanonicalCompany> | null {
    return this.getCanonicalCompany(companyName);
  }

  /**
   * Add a new company to the database
   */
  addCompany(company: CanonicalCompany): void {
    COMPANY_DATABASE.push(company);
    aliasToCompanyIndex.set(company.canonicalName.toLowerCase(), company);
    aliasToCompanyIndex.set(company.id, company);
    for (const alias of company.aliases) {
      aliasToCompanyIndex.set(alias.toLowerCase(), company);
    }
  }

  /**
   * Basic normalization without canonical lookup
   */
  private basicNormalize(companyName: string): string {
    return companyName
      .trim()
      .replace(/[""'']/g, '') // Remove smart quotes
      .replace(/\s+/g, ' '); // Normalize spaces
  }

  /**
   * Remove common company suffixes
   */
  private removeCommonSuffixes(name: string): string {
    const suffixes = [
      'inc', 'inc.', 'incorporated',
      'llc', 'l.l.c.',
      'ltd', 'ltd.', 'limited',
      'corp', 'corp.', 'corporation',
      'co', 'co.', 'company',
      'plc', 'pbc',
      'gmbh', 'ag', 'sa', 'bv',
      'technologies', 'technology', 'tech',
      'software', 'solutions', 'systems',
      'services', 'group', 'holdings',
      'labs', 'studio', 'studios'
    ];

    let normalized = name;
    for (const suffix of suffixes) {
      const pattern = new RegExp(`[,\\s]+${suffix}$`, 'i');
      normalized = normalized.replace(pattern, '').trim();
    }

    return normalized;
  }

  /**
   * Get all companies in database
   */
  getAllCompanies(): CanonicalCompany[] {
    return [...COMPANY_DATABASE];
  }

  /**
   * Search companies by name
   */
  searchCompanies(query: string, limit: number = 10): CanonicalCompany[] {
    const lowerQuery = query.toLowerCase();

    return COMPANY_DATABASE
      .filter(company => {
        if (company.canonicalName.toLowerCase().includes(lowerQuery)) return true;
        if (company.aliases.some(a => a.includes(lowerQuery))) return true;
        return false;
      })
      .slice(0, limit);
  }

  /**
   * Get companies by industry
   */
  getCompaniesByIndustry(industry: string): CanonicalCompany[] {
    return COMPANY_DATABASE.filter(c =>
      c.industry?.toLowerCase() === industry.toLowerCase()
    );
  }

  /**
   * Get subsidiary's parent company
   */
  getParentCompany(companyName: string): CanonicalCompany | null {
    const canonical = this.getCanonicalCompany(companyName);
    if (canonical?.parentCompany) {
      return this.getCanonicalCompany(canonical.parentCompany);
    }
    return null;
  }

  /**
   * Get company's subsidiaries
   */
  getSubsidiaries(companyName: string): CanonicalCompany[] {
    const canonical = this.getCanonicalCompany(companyName);
    if (!canonical?.subsidiaries) return [];

    return canonical.subsidiaries
      .map(name => this.getCanonicalCompany(name))
      .filter((c): c is CanonicalCompany => c !== null);
  }
}

// Export singleton instance
export const companyNormalizer = new CompanyNormalizer();
