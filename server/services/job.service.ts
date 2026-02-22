/**
 * Job Service
 * 
 * Handles all job posting related business logic including:
 * - Job creation and management
 * - Job search and filtering
 * - Job statistics and analytics
 * - External job aggregation coordination
 */

import { db } from "../db";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { sql, ilike, inArray } from "drizzle-orm/sql";
import {
  jobPostings,
  jobMatches,
  candidateProfiles,
  type JobPosting,
  type InsertJobPosting
} from "../../shared/schema";

export interface JobSearchFilters {
  skills?: string[];
  location?: string;
  workType?: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  salaryMax?: number;
  industry?: string;
  company?: string;
  searchTerm?: string;
}

export interface JobSearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'salary' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface JobStatistics {
  totalJobs: number;
  activeJobs: number;
  recentJobs: number;
  topCompanies: Array<{ company: string; count: number }>;
  topSkills: Array<{ skill: string; count: number }>;
  avgSalary: number;
}

export class JobService {
  /**
   * Create a new job posting
   */
  async createJob(jobData: InsertJobPosting): Promise<JobPosting> {
    const [job] = await db
      .insert(jobPostings)
      .values({
        ...jobData,
        viewCount: 0,
        applicationCount: 0,
        status: 'active',
      })
      .returning();

    return job;
  }

  /**
   * Get job by ID with full details
   */
  async getJobById(id: number): Promise<JobPosting | undefined> {
    const [job] = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.id, id));

    return job;
  }

  /**
   * Update job posting
   */
  async updateJob(id: number, updates: Partial<InsertJobPosting>): Promise<JobPosting | undefined> {
    const [job] = await db
      .update(jobPostings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, id))
      .returning();

    return job;
  }

  /**
   * Delete job posting (soft delete by setting status to closed)
   */
  async deleteJob(id: number): Promise<boolean> {
    const result = await db
      .update(jobPostings)
      .set({
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, id));

    return (result.count ?? 0) > 0;
  }

  /**
   * Search jobs with advanced filtering
   */
  async searchJobs(
    filters: JobSearchFilters = {},
    options: JobSearchOptions = {}
  ): Promise<{ jobs: JobPosting[]; total: number }> {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'created',
      sortOrder = 'desc'
    } = options;

    let query = db.select().from(jobPostings).$dynamic();

    // Apply filters
    const conditions = [eq(jobPostings.status, 'active')];

    if (filters.skills && filters.skills.length > 0) {
      conditions.push(
        sql`${jobPostings.skills} && ${JSON.stringify(filters.skills)}`
      );
    }

    if (filters.location) {
      conditions.push(ilike(jobPostings.location, `%${filters.location}%`));
    }

    if (filters.workType) {
      conditions.push(eq(jobPostings.workType, filters.workType));
    }

    if (filters.salaryMin) {
      conditions.push(sql`${jobPostings.salaryMin} >= ${filters.salaryMin}`);
    }

    if (filters.salaryMax) {
      conditions.push(sql`${jobPostings.salaryMax} <= ${filters.salaryMax}`);
    }

    if (filters.industry) {
      conditions.push(eq(jobPostings.industry, filters.industry));
    }

    if (filters.company) {
      conditions.push(ilike(jobPostings.company, `%${filters.company}%`));
    }

    if (filters.searchTerm) {
      conditions.push(
        sql`(
          ${jobPostings.title} ILIKE ${`%${filters.searchTerm}%`} OR
          ${jobPostings.description} ILIKE ${`%${filters.searchTerm}%`} OR
          ${jobPostings.company} ILIKE ${`%${filters.searchTerm}%`}
        )`
      );
    }

    // Apply WHERE conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = sortBy === 'created' ? jobPostings.createdAt :
      sortBy === 'salary' ? jobPostings.salaryMax :
        jobPostings.createdAt;

    query = query.orderBy(
      sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)
    );

    // Apply pagination
    const jobs = await query.limit(limit).offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobPostings)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      jobs,
      total: count,
    };
  }

  /**
   * Get jobs posted by a specific talent owner
   */
  async getJobsByTalentOwner(talentOwnerId: string): Promise<JobPosting[]> {
    return await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.talentOwnerId, talentOwnerId))
      .orderBy(desc(jobPostings.createdAt));
  }

  /**
   * Get job statistics for analytics
   */
  async getJobStatistics(): Promise<JobStatistics> {
    // Total and active jobs
    const [jobCounts] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status = 'active')`,
        recent: sql<number>`count(*) filter (where created_at >= now() - interval '7 days')`,
      })
      .from(jobPostings);

    // Top companies
    const topCompanies = await db
      .select({
        company: jobPostings.company,
        count: sql<number>`count(*)`,
      })
      .from(jobPostings)
      .where(eq(jobPostings.status, 'active'))
      .groupBy(jobPostings.company)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Average salary
    const [avgSalaryResult] = await db
      .select({
        avgSalary: sql<number>`avg((salary_min + salary_max) / 2)`,
      })
      .from(jobPostings)
      .where(
        and(
          eq(jobPostings.status, 'active'),
          sql`salary_min is not null and salary_max is not null`
        )
      );

    // Top skills aggregation
    const skillsData = await db
      .select({ skills: jobPostings.skills })
      .from(jobPostings)
      .where(eq(jobPostings.status, 'active'));

    const skillCounts = new Map<string, number>();
    skillsData.forEach(job => {
      if (job.skills) {
        job.skills.forEach((skill: string) => {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        });
      }
    });

    const topSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    return {
      totalJobs: jobCounts.total,
      activeJobs: jobCounts.active,
      recentJobs: jobCounts.recent,
      topCompanies,
      topSkills,
      avgSalary: avgSalaryResult.avgSalary || 0,
    };
  }

  /**
   * Increment view count for a job
   */
  async incrementViewCount(jobId: number): Promise<void> {
    await db
      .update(jobPostings)
      .set({
        viewCount: sql`${jobPostings.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, jobId));
  }

  /**
   * Increment application count for a job
   */
  async incrementApplicationCount(jobId: number): Promise<void> {
    await db
      .update(jobPostings)
      .set({
        applicationCount: sql`${jobPostings.applicationCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, jobId));
  }

  /**
   * Get similar jobs based on skills and industry
   */
  async getSimilarJobs(jobId: number, limit: number = 5): Promise<JobPosting[]> {
    const [targetJob] = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.id, jobId));

    if (!targetJob) return [];

    return await db
      .select()
      .from(jobPostings)
      .where(
        and(
          eq(jobPostings.status, 'active'),
          sql`${jobPostings.id} != ${jobId}`,
          sql`(
            ${jobPostings.industry} = ${targetJob.industry} OR
            ${jobPostings.skills} && ${JSON.stringify(targetJob.skills || [])}
          )`
        )
      )
      .orderBy(desc(jobPostings.createdAt))
      .limit(limit);
  }

  /**
   * Update job urgency level
   */
  async updateJobUrgency(
    jobId: number,
    urgency: 'low' | 'medium' | 'high'
  ): Promise<boolean> {
    const result = await db
      .update(jobPostings)
      .set({
        urgency,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, jobId));

    return (result.count ?? 0) > 0;
  }

  /**
   * Get jobs that are expiring soon (for cleanup)
   */
  async getExpiringJobs(days: number = 30): Promise<JobPosting[]> {
    return await db
      .select()
      .from(jobPostings)
      .where(
        and(
          eq(jobPostings.status, 'active'),
          sql`created_at < now() - interval '${days} days'`
        )
      )
      .orderBy(asc(jobPostings.createdAt));
  }
}