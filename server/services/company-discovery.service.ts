/**
 * Company Discovery Service
 *
 * Maintains a verified list of companies with known ATS types.
 * Used by sota-scraper to grow its company list without code changes.
 */

export interface DiscoveredCompany {
  name: string;
  careerUrl: string;
  atsType: 'greenhouse' | 'lever' | 'workday' | 'custom' | 'unknown';
  atsId?: string;
  source: 'wikipedia' | 'crunchbase' | 'pattern' | 'manual';
  confidence: number;
}

// Verified companies with correct ATS types
const KNOWN_COMPANIES: DiscoveredCompany[] = [
  // Tech - Greenhouse
  { name: 'Stripe', careerUrl: 'https://stripe.com/jobs', atsType: 'greenhouse', atsId: 'stripe', source: 'manual', confidence: 1.0 },
  { name: 'Airbnb', careerUrl: 'https://careers.airbnb.com/', atsType: 'greenhouse', atsId: 'airbnb', source: 'manual', confidence: 1.0 },
  { name: 'Discord', careerUrl: 'https://discord.com/careers', atsType: 'greenhouse', atsId: 'discord', source: 'manual', confidence: 1.0 },
  { name: 'Figma', careerUrl: 'https://www.figma.com/careers/', atsType: 'greenhouse', atsId: 'figma', source: 'manual', confidence: 1.0 },
  { name: 'Notion', careerUrl: 'https://www.notion.so/careers', atsType: 'greenhouse', atsId: 'notion', source: 'manual', confidence: 1.0 },
  { name: 'Coinbase', careerUrl: 'https://www.coinbase.com/careers', atsType: 'greenhouse', atsId: 'coinbase', source: 'manual', confidence: 1.0 },
  { name: 'Instacart', careerUrl: 'https://careers.instacart.com/', atsType: 'greenhouse', atsId: 'instacart', source: 'manual', confidence: 1.0 },
  { name: 'Robinhood', careerUrl: 'https://robinhood.com/us/en/careers/', atsType: 'greenhouse', atsId: 'robinhood', source: 'manual', confidence: 1.0 },
  { name: 'Plaid', careerUrl: 'https://plaid.com/careers/', atsType: 'greenhouse', atsId: 'plaid', source: 'manual', confidence: 1.0 },
  { name: 'Ramp', careerUrl: 'https://ramp.com/careers', atsType: 'greenhouse', atsId: 'ramp', source: 'manual', confidence: 1.0 },
  { name: 'Datadog', careerUrl: 'https://careers.datadoghq.com/', atsType: 'greenhouse', atsId: 'datadog', source: 'manual', confidence: 1.0 },
  { name: 'Duolingo', careerUrl: 'https://careers.duolingo.com/', atsType: 'greenhouse', atsId: 'duolingo', source: 'manual', confidence: 1.0 },
  { name: 'HashiCorp', careerUrl: 'https://www.hashicorp.com/careers', atsType: 'greenhouse', atsId: 'hashicorp', source: 'manual', confidence: 1.0 },
  { name: 'Snyk', careerUrl: 'https://snyk.io/careers/', atsType: 'greenhouse', atsId: 'snyk', source: 'manual', confidence: 1.0 },
  { name: 'GitLab', careerUrl: 'https://about.gitlab.com/jobs/', atsType: 'greenhouse', atsId: 'gitlab', source: 'manual', confidence: 1.0 },
  { name: 'Databricks', careerUrl: 'https://databricks.com/careers', atsType: 'greenhouse', atsId: 'databricks', source: 'manual', confidence: 1.0 },
  { name: 'Carta', careerUrl: 'https://carta.com/careers/', atsType: 'greenhouse', atsId: 'carta', source: 'manual', confidence: 1.0 },
  { name: 'Brex', careerUrl: 'https://www.brex.com/careers', atsType: 'greenhouse', atsId: 'brex', source: 'manual', confidence: 1.0 },
  { name: 'Scale AI', careerUrl: 'https://scale.com/careers', atsType: 'greenhouse', atsId: 'scaleai', source: 'manual', confidence: 1.0 },
  { name: 'Deel', careerUrl: 'https://www.deel.com/careers', atsType: 'greenhouse', atsId: 'deel', source: 'manual', confidence: 1.0 },
  { name: 'Retool', careerUrl: 'https://retool.com/careers', atsType: 'greenhouse', atsId: 'retool', source: 'manual', confidence: 1.0 },
  { name: 'Benchling', careerUrl: 'https://www.benchling.com/careers/', atsType: 'greenhouse', atsId: 'benchling', source: 'manual', confidence: 1.0 },
  { name: 'Mercury', careerUrl: 'https://mercury.com/careers', atsType: 'greenhouse', atsId: 'mercury', source: 'manual', confidence: 1.0 },
  { name: 'Rippling', careerUrl: 'https://www.rippling.com/careers', atsType: 'greenhouse', atsId: 'rippling', source: 'manual', confidence: 1.0 },
  { name: 'Anduril', careerUrl: 'https://www.anduril.com/careers/', atsType: 'greenhouse', atsId: 'anduril', source: 'manual', confidence: 1.0 },
  { name: 'Cockroach Labs', careerUrl: 'https://www.cockroachlabs.com/careers/', atsType: 'greenhouse', atsId: 'cockroachlabs', source: 'manual', confidence: 1.0 },
  { name: 'Amplitude', careerUrl: 'https://amplitude.com/careers', atsType: 'greenhouse', atsId: 'amplitude', source: 'manual', confidence: 1.0 },
  { name: 'LaunchDarkly', careerUrl: 'https://launchdarkly.com/careers/', atsType: 'greenhouse', atsId: 'launchdarkly', source: 'manual', confidence: 1.0 },
  { name: 'Segment', careerUrl: 'https://segment.com/careers/', atsType: 'greenhouse', atsId: 'segment', source: 'manual', confidence: 1.0 },
  { name: 'Confluent', careerUrl: 'https://www.confluent.io/careers/', atsType: 'greenhouse', atsId: 'confluent', source: 'manual', confidence: 1.0 },
  { name: 'Snowflake', careerUrl: 'https://careers.snowflake.com/', atsType: 'greenhouse', atsId: 'snowflake', source: 'manual', confidence: 1.0 },
  // Tech - Lever
  { name: 'Cloudflare', careerUrl: 'https://www.cloudflare.com/careers/', atsType: 'lever', atsId: 'cloudflare', source: 'manual', confidence: 1.0 },
  { name: 'Airtable', careerUrl: 'https://airtable.com/careers', atsType: 'lever', atsId: 'airtable', source: 'manual', confidence: 1.0 },
  { name: 'Webflow', careerUrl: 'https://webflow.com/careers', atsType: 'lever', atsId: 'webflow', source: 'manual', confidence: 1.0 },
  { name: 'Canva', careerUrl: 'https://www.canva.com/careers/', atsType: 'lever', atsId: 'canva', source: 'manual', confidence: 1.0 },
  { name: 'Loom', careerUrl: 'https://www.loom.com/careers', atsType: 'lever', atsId: 'loom', source: 'manual', confidence: 1.0 },
  { name: 'Postman', careerUrl: 'https://www.postman.com/company/careers/', atsType: 'lever', atsId: 'postman', source: 'manual', confidence: 1.0 },
  { name: 'Grammarly', careerUrl: 'https://www.grammarly.com/jobs', atsType: 'lever', atsId: 'grammarly', source: 'manual', confidence: 1.0 },
  { name: 'Miro', careerUrl: 'https://miro.com/careers/', atsType: 'lever', atsId: 'miro', source: 'manual', confidence: 1.0 },
  { name: 'Asana', careerUrl: 'https://asana.com/jobs', atsType: 'lever', atsId: 'asana', source: 'manual', confidence: 1.0 },
  { name: 'Intercom', careerUrl: 'https://www.intercom.com/careers', atsType: 'lever', atsId: 'intercom', source: 'manual', confidence: 1.0 },
  { name: 'Calendly', careerUrl: 'https://calendly.com/careers', atsType: 'lever', atsId: 'calendly', source: 'manual', confidence: 1.0 },
  { name: 'Zapier', careerUrl: 'https://zapier.com/jobs', atsType: 'lever', atsId: 'zapier', source: 'manual', confidence: 1.0 },
  { name: 'Gusto', careerUrl: 'https://gusto.com/company/careers', atsType: 'lever', atsId: 'gusto', source: 'manual', confidence: 1.0 },
  { name: 'Netflix', careerUrl: 'https://jobs.netflix.com/', atsType: 'lever', atsId: 'netflix', source: 'manual', confidence: 1.0 },
  { name: 'Twilio', careerUrl: 'https://www.twilio.com/company/jobs', atsType: 'lever', atsId: 'twilio', source: 'manual', confidence: 1.0 },
  { name: 'Flexport', careerUrl: 'https://www.flexport.com/careers/', atsType: 'lever', atsId: 'flexport', source: 'manual', confidence: 1.0 },
  // Workday
  { name: 'Salesforce', careerUrl: 'https://careers.salesforce.com/jobs', atsType: 'workday', atsId: 'salesforce', source: 'manual', confidence: 1.0 },
  { name: 'VMware', careerUrl: 'https://careers.vmware.com/main/jobs', atsType: 'workday', atsId: 'vmware', source: 'manual', confidence: 1.0 },
  { name: 'Adobe', careerUrl: 'https://careers.adobe.com/us/en/search-results', atsType: 'workday', atsId: 'adobe', source: 'manual', confidence: 1.0 },
  { name: 'Workday', careerUrl: 'https://workday.wd5.myworkdayjobs.com/Workday', atsType: 'workday', atsId: 'workday', source: 'manual', confidence: 1.0 },
  { name: 'ServiceNow', careerUrl: 'https://careers.servicenow.com/', atsType: 'workday', atsId: 'servicenow', source: 'manual', confidence: 1.0 },
  { name: 'Nvidia', careerUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', atsType: 'workday', atsId: 'nvidia', source: 'manual', confidence: 1.0 },
];

export class CompanyDiscoveryService {
  private discoveredCompanies: Map<string, DiscoveredCompany> = new Map();

  constructor() {
    for (const company of KNOWN_COMPANIES) {
      this.discoveredCompanies.set(company.name.toLowerCase(), company);
    }
  }

  /**
   * Discover companies from Wikipedia list
   */
  async discoverFromWikipedia(): Promise<DiscoveredCompany[]> {
    const companies: DiscoveredCompany[] = [];

    const wikipediaLists = [
      'https://en.wikipedia.org/wiki/List_of_largest_technology_companies_by_revenue',
      'https://en.wikipedia.org/wiki/Fortune_1000',
      'https://en.wikipedia.org/wiki/List_of_unicorn_startup_companies',
    ];

    for (const url of wikipediaLists) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RecrutasBot/1.0)',
          },
        });
        const html = await response.text();

        const companyMatches = html.match(/<a[^>]*title="([^"]+)"[^>]*>(?:[A-Z][a-z]+(?: [A-Z][a-z]+)+)<\/a>/g);

        if (companyMatches) {
          for (const match of companyMatches.slice(0, 50)) {
            const nameMatch = match.match(/title="([^"]+)"/);
            if (nameMatch) {
              const name = nameMatch[1];
              if (name && name.length > 2 && !name.includes('List of')) {
                const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const company: DiscoveredCompany = {
                  name,
                  careerUrl: `https://${base}.com/careers`,
                  atsType: 'unknown',
                  source: 'wikipedia',
                  confidence: 0.5,
                };
                if (!this.discoveredCompanies.has(company.name.toLowerCase())) {
                  companies.push(company);
                  this.discoveredCompanies.set(company.name.toLowerCase(), company);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch Wikipedia list: ${url}`, error);
      }
    }

    console.log(`[CompanyDiscovery] Discovered ${companies.length} companies from Wikipedia`);
    return companies;
  }

  /**
   * Get all discovered companies
   */
  getAllCompanies(): DiscoveredCompany[] {
    return Array.from(this.discoveredCompanies.values());
  }

  /**
   * Get companies by ATS type
   */
  getCompaniesByAtsType(atsType: string): DiscoveredCompany[] {
    return Array.from(this.discoveredCompanies.values())
      .filter(c => c.atsType === atsType);
  }

  /**
   * Get only high-confidence companies (manually verified)
   */
  getVerifiedCompanies(): DiscoveredCompany[] {
    return Array.from(this.discoveredCompanies.values())
      .filter(c => c.confidence >= 1.0);
  }

  /**
   * Add a new company to the discovery list
   */
  addCompany(company: DiscoveredCompany): void {
    this.discoveredCompanies.set(company.name.toLowerCase(), company);
  }

  /**
   * Get company count by source
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const company of this.discoveredCompanies.values()) {
      stats[company.source] = (stats[company.source] || 0) + 1;
    }
    return stats;
  }
}

export const companyDiscoveryService = new CompanyDiscoveryService();
