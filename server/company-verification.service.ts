/**
 * Company Verification Service
 * 
 * Verifies whether a job posting is from a legitimate company by:
 * - Checking if recruiter email domain matches company domain
 * - Validating company website exists and is accessible
 * - Detecting third-party recruiters vs direct employers
 * - Cross-referencing company information
 */

import { db } from './db';
import { jobPostings, users, talentOwnerProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

export interface CompanyVerificationResult {
  jobId: number;
  isVerified: boolean;
  verificationMethod: string;
  confidence: number; // 0-100
  isThirdPartyRecruiter: boolean;
  companyDomain?: string;
  recruiterDomain?: string;
  issues: string[];
  companyWebsite?: string;
  websiteStatus?: 'accessible' | 'not_found' | 'error';
}

// Common third-party recruiting domains
const THIRD_PARTY_RECRUITER_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'ziprecruiter.com',
  'monster.com',
  'glassdoor.com',
  'careerbuilder.com',
  'dice.com',
  'angel.co',
  'wellfound.com',
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'smartrecruiters.com',
  'jobvite.com',
  'icims.com',
  'taleo.net',
  'oraclecloud.com',
  'hirehive.com',
  'recruitee.com',
  'breezy.hr',
  'jazzhr.com',
  'workable.com',
  'ashbyhq.com',
  'pinpoint.com',
];

// Suspicious patterns in company names
const SUSPICIOUS_COMPANY_PATTERNS = [
  /\b(urgent|immediate|hiring now|apply today)\b/i,
  /\$\d+k/i, // Salary in company name like "$120k"
  /\b(remote|work from home)\b.*\b(remote|work from home)\b/i, // Duplicate keywords
  /^[\d\s]+$/i, // Just numbers
  /.{100,}/, // Way too long
];

export class CompanyVerificationService {
  /**
   * Verify a job posting's company legitimacy
   */
  async verifyJob(jobId: number): Promise<CompanyVerificationResult> {
    const job = await db
      .select({
        id: jobPostings.id,
        talentOwnerId: jobPostings.talentOwnerId,
        company: jobPostings.company,
        careerPageUrl: jobPostings.careerPageUrl,
        externalUrl: jobPostings.externalUrl,
        source: jobPostings.source,
      })
      .from(jobPostings)
      .where(eq(jobPostings.id, jobId))
      .limit(1);

    if (!job[0]) {
      return {
        jobId,
        isVerified: false,
        verificationMethod: 'not_found',
        confidence: 0,
        isThirdPartyRecruiter: false,
        issues: ['Job not found'],
      };
    }

    const result: CompanyVerificationResult = {
      jobId,
      isVerified: false,
      verificationMethod: 'none',
      confidence: 0,
      isThirdPartyRecruiter: false,
      issues: [],
    };

    // Get recruiter information
    const recruiter = await this.getRecruiterInfo(job[0].talentOwnerId!);
    
    // Step 1: Extract company domain from company name
    const companyDomain = this.extractDomainFromCompany(job[0].company!);
    result.companyDomain = companyDomain;

    // Step 2: Check recruiter email domain
    if (recruiter?.email) {
      const recruiterDomain = this.extractDomain(recruiter.email);
      result.recruiterDomain = recruiterDomain;

      // Check if it's a third-party recruiter
      if (this.isThirdPartyRecruiter(recruiterDomain)) {
        result.isThirdPartyRecruiter = true;
        result.issues.push(`Posted via third-party platform (${recruiterDomain})`);
      }

      // Check if email domain matches company domain
      if (companyDomain && this.domainsMatch(recruiterDomain, companyDomain)) {
        result.isVerified = true;
        result.verificationMethod = 'email_domain_match';
        result.confidence = 90;
        result.companyWebsite = `https://${companyDomain}`;
      }
    }

    // Step 3: Check for suspicious company name patterns
    if (this.hasSuspiciousPatterns(job[0].company!)) {
      result.issues.push('Company name contains suspicious patterns');
      result.confidence = Math.max(0, result.confidence - 20);
    }

    // Step 4: Check company website if available
    if (job[0].careerPageUrl) {
      const websiteStatus = await this.checkWebsite(job[0].careerPageUrl);
      result.websiteStatus = websiteStatus;
      
      if (websiteStatus === 'accessible') {
        result.confidence = Math.min(100, result.confidence + 10);
        if (!result.isVerified) {
          result.isVerified = true;
          result.verificationMethod = 'career_page_accessible';
        }
      } else if (websiteStatus === 'not_found') {
        result.issues.push('Career page not accessible');
        result.confidence = Math.max(0, result.confidence - 15);
      }
    }

    // Step 5: For external jobs, check external URL
    if (job[0].source !== 'platform' && job[0].externalUrl) {
      const externalStatus = await this.checkWebsite(job[0].externalUrl);
      if (externalStatus === 'accessible') {
        result.confidence = Math.min(100, result.confidence + 5);
      }
    }

    // Step 6: Calculate final verification status
    if (!result.isVerified && result.confidence >= 50) {
      result.isVerified = true;
      result.verificationMethod = 'heuristic';
    }

    // Update job with verification results
    await this.updateJobVerification(jobId, result);

    return result;
  }

  /**
   * Get recruiter information including email
   */
  private async getRecruiterInfo(recruiterId: string) {
    const user = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, recruiterId))
      .limit(1);

    return user[0];
  }

  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string {
    const match = email.match(/@([^@]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Extract domain from company name (best effort)
   */
  private extractDomainFromCompany(companyName: string): string | undefined {
    // Clean up company name
    const clean = companyName
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/inc$|llc$|corp$|ltd$/i, '');

    // Common domain patterns
    const variations = [
      clean,
      clean + '.com',
      clean.replace(/company/g, ''),
      clean.replace(/co$/g, ''),
    ];

    return variations[0] + '.com';
  }

  /**
   * Check if recruiter domain is a known third-party platform
   */
  private isThirdPartyRecruiter(domain: string): boolean {
    return THIRD_PARTY_RECRUITER_DOMAINS.some(
      thirdParty => domain.includes(thirdParty)
    );
  }

  /**
   * Check if two domains match (accounting for subdomains)
   */
  private domainsMatch(domain1: string, domain2: string): boolean {
    const d1 = domain1.toLowerCase().replace(/^www\./, '');
    const d2 = domain2.toLowerCase().replace(/^www\./, '');
    
    // Direct match
    if (d1 === d2) return true;
    
    // One contains the other
    if (d1.includes(d2) || d2.includes(d1)) return true;
    
    return false;
  }

  /**
   * Check for suspicious patterns in company name
   */
  private hasSuspiciousPatterns(companyName: string): boolean {
    return SUSPICIOUS_COMPANY_PATTERNS.some(pattern => pattern.test(companyName));
  }

  /**
   * Check if a website is accessible
   */
  private async checkWebsite(url: string): Promise<'accessible' | 'not_found' | 'error'> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return 'accessible';
      } else if (response.status === 404) {
        return 'not_found';
      } else {
        return 'error';
      }
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Update job with verification results
   */
  private async updateJobVerification(
    jobId: number,
    result: CompanyVerificationResult
  ): Promise<void> {
    await db
      .update(jobPostings)
      .set({
        companyVerified: result.isVerified,
        recruiterEmailDomain: result.recruiterDomain,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, jobId));
  }

  /**
   * Batch verify all active jobs
   */
  async runBatchVerification(): Promise<{
    checked: number;
    verified: number;
    thirdParty: number;
    issues: number;
  }> {
    const jobs = await db
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(eq(jobPostings.status, 'active'));

    let verified = 0;
    let thirdParty = 0;
    let issues = 0;

    for (const job of jobs) {
      try {
        const result = await this.verifyJob(job.id);
        if (result.isVerified) verified++;
        if (result.isThirdPartyRecruiter) thirdParty++;
        if (result.issues.length > 0) issues++;
      } catch (error) {
        console.error(`[CompanyVerification] Error verifying job ${job.id}:`, error);
      }
    }

    return {
      checked: jobs.length,
      verified,
      thirdParty,
      issues,
    };
  }

  /**
   * Get verification statistics
   */
  async getStatistics(): Promise<{
    totalJobs: number;
    verifiedJobs: number;
    thirdPartyJobs: number;
    verificationRate: number;
  }> {
    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        verified: sql<number>`count(case when ${jobPostings.companyVerified} = true then 1 end)`,
        thirdParty: sql<number>`count(case when ${jobPostings.recruiterEmailDomain} is not null then 1 end)`,
      })
      .from(jobPostings)
      .where(eq(jobPostings.status, 'active'));

    const total = Number(stats[0].total);
    const verified = Number(stats[0].verified);

    return {
      totalJobs: total,
      verifiedJobs: verified,
      thirdPartyJobs: Number(stats[0].thirdParty),
      verificationRate: total > 0 ? parseFloat(((verified / total) * 100).toFixed(2)) : 0,
    };
  }
}

// Export singleton instance
export const companyVerificationService = new CompanyVerificationService();
