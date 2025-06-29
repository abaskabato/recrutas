import { db } from "./db";
import { jobPostings, jobApplications, candidateProfiles, users } from "@shared/schema";
import { eq } from "drizzle-orm";

interface HRSystemConfig {
  type: 'workday' | 'greenhouse' | 'lever' | 'bamboohr' | 'successfactors';
  apiKey: string;
  baseUrl: string;
  webhookSecret?: string;
}

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  skills: string[];
  experience: string;
  appliedJobId: string;
  applicationDate: Date;
  status: string;
}

interface JobData {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  location: string;
  department: string;
  salaryRange?: {
    min: number;
    max: number;
  };
  status: 'active' | 'paused' | 'closed';
}

export class HRIntegrationService {
  private configs: Map<string, HRSystemConfig> = new Map();

  constructor() {
    // Load configurations from environment or database
    this.loadConfigurations();
  }

  private loadConfigurations() {
    // Example configurations - in production, these would come from database or env vars
    if (process.env.WORKDAY_API_KEY) {
      this.configs.set('workday', {
        type: 'workday',
        apiKey: process.env.WORKDAY_API_KEY,
        baseUrl: process.env.WORKDAY_BASE_URL || 'https://api.workday.com',
        webhookSecret: process.env.WORKDAY_WEBHOOK_SECRET
      });
    }

    if (process.env.GREENHOUSE_API_KEY) {
      this.configs.set('greenhouse', {
        type: 'greenhouse',
        apiKey: process.env.GREENHOUSE_API_KEY,
        baseUrl: 'https://harvest.greenhouse.io/v1',
        webhookSecret: process.env.GREENHOUSE_WEBHOOK_SECRET
      });
    }

    if (process.env.LEVER_API_KEY) {
      this.configs.set('lever', {
        type: 'lever',
        apiKey: process.env.LEVER_API_KEY,
        baseUrl: 'https://api.lever.co/v1',
        webhookSecret: process.env.LEVER_WEBHOOK_SECRET
      });
    }
  }

  // Sync candidates to external HR system
  async syncCandidateToHR(candidateId: string, hrSystem: string): Promise<boolean> {
    try {
      const config = this.configs.get(hrSystem);
      if (!config) {
        throw new Error(`HR system ${hrSystem} not configured`);
      }

      // Get candidate data from our database
      const candidate = await db
        .select()
        .from(candidateProfiles)
        .leftJoin(users, eq(candidateProfiles.userId, users.id))
        .where(eq(candidateProfiles.id, parseInt(candidateId)))
        .limit(1);

      if (!candidate[0]) {
        throw new Error('Candidate not found');
      }

      const candidateData = this.transformCandidateData(candidate[0]);
      
      switch (config.type) {
        case 'workday':
          return await this.syncToWorkday(candidateData, config);
        case 'greenhouse':
          return await this.syncToGreenhouse(candidateData, config);
        case 'lever':
          return await this.syncToLever(candidateData, config);
        default:
          throw new Error(`Unsupported HR system: ${config.type}`);
      }
    } catch (error) {
      console.error(`Error syncing candidate to ${hrSystem}:`, error);
      return false;
    }
  }

  // Sync job postings from external HR system
  async syncJobsFromHR(hrSystem: string): Promise<JobData[]> {
    try {
      const config = this.configs.get(hrSystem);
      if (!config) {
        throw new Error(`HR system ${hrSystem} not configured`);
      }

      let jobs: JobData[] = [];

      switch (config.type) {
        case 'workday':
          jobs = await this.fetchJobsFromWorkday(config);
          break;
        case 'greenhouse':
          jobs = await this.fetchJobsFromGreenhouse(config);
          break;
        case 'lever':
          jobs = await this.fetchJobsFromLever(config);
          break;
        default:
          throw new Error(`Unsupported HR system: ${config.type}`);
      }

      // Store jobs in our database
      await this.storeJobsInDatabase(jobs, hrSystem);
      
      return jobs;
    } catch (error) {
      console.error(`Error syncing jobs from ${hrSystem}:`, error);
      return [];
    }
  }

  // Handle webhooks from HR systems
  async handleWebhook(hrSystem: string, payload: any, signature: string): Promise<void> {
    try {
      const config = this.configs.get(hrSystem);
      if (!config || !config.webhookSecret) {
        throw new Error('Webhook not configured for this HR system');
      }

      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(payload, signature, config.webhookSecret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      switch (config.type) {
        case 'workday':
          await this.processWorkdayWebhook(payload);
          break;
        case 'greenhouse':
          await this.processGreenhouseWebhook(payload);
          break;
        case 'lever':
          await this.processLeverWebhook(payload);
          break;
      }
    } catch (error) {
      console.error(`Error processing ${hrSystem} webhook:`, error);
      throw error;
    }
  }

  // Workday integration methods
  private async syncToWorkday(candidate: CandidateData, config: HRSystemConfig): Promise<boolean> {
    const response = await fetch(`${config.baseUrl}/candidates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalData: {
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone
        },
        applicationData: {
          position: candidate.appliedJobId,
          resumeUrl: candidate.resumeUrl,
          skills: candidate.skills,
          experience: candidate.experience
        }
      })
    });

    return response.ok;
  }

  private async fetchJobsFromWorkday(config: HRSystemConfig): Promise<JobData[]> {
    const response = await fetch(`${config.baseUrl}/jobs?status=active`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Workday API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements || [],
      location: job.location,
      department: job.department,
      salaryRange: job.compensation ? {
        min: job.compensation.min,
        max: job.compensation.max
      } : undefined,
      status: job.status
    }));
  }

  private async processWorkdayWebhook(payload: any): Promise<void> {
    // Handle Workday webhook events
    switch (payload.eventType) {
      case 'candidate.status.changed':
        await this.updateCandidateStatus(payload.candidateId, payload.newStatus);
        break;
      case 'job.status.changed':
        await this.updateJobStatus(payload.jobId, payload.newStatus);
        break;
    }
  }

  // Greenhouse integration methods
  private async syncToGreenhouse(candidate: CandidateData, config: HRSystemConfig): Promise<boolean> {
    const response = await fetch(`${config.baseUrl}/candidates`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: candidate.name.split(' ')[0],
        last_name: candidate.name.split(' ').slice(1).join(' '),
        email_addresses: [{ value: candidate.email, type: 'personal' }],
        phone_numbers: candidate.phone ? [{ value: candidate.phone, type: 'mobile' }] : [],
        applications: [{
          job_id: candidate.appliedJobId,
          source_id: 'recrutas-integration'
        }]
      })
    });

    return response.ok;
  }

  private async fetchJobsFromGreenhouse(config: HRSystemConfig): Promise<JobData[]> {
    const response = await fetch(`${config.baseUrl}/jobs?status=open`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Greenhouse API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((job: any) => ({
      id: job.id.toString(),
      title: job.name,
      description: job.notes || '',
      requirements: [],
      location: job.offices.map((office: any) => office.name).join(', '),
      department: job.departments.map((dept: any) => dept.name).join(', '),
      status: job.status === 'open' ? 'active' : 'closed'
    }));
  }

  private async processGreenhouseWebhook(payload: any): Promise<void> {
    switch (payload.action) {
      case 'candidate_stage_change':
        await this.updateCandidateStatus(payload.payload.application.candidate.id, payload.payload.application.current_stage.name);
        break;
      case 'job_post_published':
        await this.syncJobsFromHR('greenhouse');
        break;
    }
  }

  // Lever integration methods
  private async syncToLever(candidate: CandidateData, config: HRSystemConfig): Promise<boolean> {
    const response = await fetch(`${config.baseUrl}/candidates`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        resumeUrl: candidate.resumeUrl,
        postings: [candidate.appliedJobId]
      })
    });

    return response.ok;
  }

  private async fetchJobsFromLever(config: HRSystemConfig): Promise<JobData[]> {
    const response = await fetch(`${config.baseUrl}/postings?state=published`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Lever API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((posting: any) => ({
      id: posting.id,
      title: posting.text,
      description: posting.content.description || '',
      requirements: posting.content.requirements ? [posting.content.requirements] : [],
      location: posting.categories.location || '',
      department: posting.categories.department || '',
      status: posting.state === 'published' ? 'active' : 'closed'
    }));
  }

  private async processLeverWebhook(payload: any): Promise<void> {
    switch (payload.event) {
      case 'candidate_stage_change':
        await this.updateCandidateStatus(payload.data.candidateId, payload.data.toStage.text);
        break;
      case 'posting_published':
        await this.syncJobsFromHR('lever');
        break;
    }
  }

  // Utility methods
  private transformCandidateData(dbCandidate: any): CandidateData {
    const profile = dbCandidate.candidate_profiles;
    const user = dbCandidate.users;

    return {
      id: profile.id.toString(),
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email || '',
      phone: profile.phoneNumber,
      resumeUrl: profile.resumeUrl,
      skills: profile.skills || [],
      experience: profile.experience || '',
      appliedJobId: '', // This would come from application context
      applicationDate: new Date(),
      status: 'new'
    };
  }

  private async storeJobsInDatabase(jobs: JobData[], source: string): Promise<void> {
    for (const job of jobs) {
      try {
        await db.insert(jobPostings).values({
          talentOwnerId: 'system', // System-generated jobs
          title: job.title,
          description: job.description,
          skills: [], // Would parse from requirements
          location: job.location,
          workType: 'hybrid',
          salaryMin: job.salaryRange?.min,
          salaryMax: job.salaryRange?.max,
          status: job.status,
          source: source,
          externalId: job.id
        }).onConflictDoUpdate({
          target: jobPostings.externalId,
          set: {
            title: job.title,
            description: job.description,
            status: job.status,
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.error(`Error storing job ${job.id}:`, error);
      }
    }
  }

  private async updateCandidateStatus(candidateId: string, status: string): Promise<void> {
    // Update candidate status in our database
    await db
      .update(jobApplications)
      .set({ 
        status: this.mapExternalStatusToInternal(status),
        updatedAt: new Date()
      })
      .where(eq(jobApplications.candidateId, candidateId));
  }

  private async updateJobStatus(jobId: string, status: string): Promise<void> {
    // Update job status in our database
    await db
      .update(jobPostings)
      .set({ 
        status: status === 'active' ? 'active' : 'closed',
        updatedAt: new Date()
      })
      .where(eq(jobPostings.externalId, jobId));
  }

  private mapExternalStatusToInternal(externalStatus: string): string {
    const statusMap: Record<string, string> = {
      'new': 'pending',
      'review': 'viewed',
      'phone_screen': 'interested',
      'onsite': 'applied',
      'offer': 'applied',
      'hired': 'applied',
      'rejected': 'rejected'
    };

    return statusMap[externalStatus.toLowerCase()] || 'pending';
  }

  private verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
    // Implement webhook signature verification based on HR system requirements
    // This is a simplified example - each system has different signature methods
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  // Bulk operations
  async bulkSyncCandidates(hrSystem: string, candidateIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const candidateId of candidateIds) {
      try {
        const result = await this.syncCandidateToHR(candidateId, hrSystem);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to sync candidate ${candidateId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  // Configuration management
  async addHRSystemConfig(systemName: string, config: HRSystemConfig): Promise<void> {
    this.configs.set(systemName, config);
    // In production, save to database
  }

  async removeHRSystemConfig(systemName: string): Promise<void> {
    this.configs.delete(systemName);
    // In production, remove from database
  }

  getConfiguredSystems(): string[] {
    return Array.from(this.configs.keys());
  }
}

export const hrIntegrationService = new HRIntegrationService();