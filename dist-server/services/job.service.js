/**
 * Job Service
 *
 * Handles all job posting related business logic including:
 * - Job creation and management
 * - Job search and filtering
 * - Job statistics and analytics
 * - External job aggregation coordination
 */
import { eq, and, desc, asc, sql, ilike } from "drizzle-orm";
import { db } from "../db";
import { jobPostings } from "../../shared/schema";
export class JobService {
    /**
     * Create a new job posting
     */
    async createJob(jobData) {
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
    async getJobById(id) {
        const [job] = await db
            .select()
            .from(jobPostings)
            .where(eq(jobPostings.id, id));
        return job;
    }
    /**
     * Update job posting
     */
    async updateJob(id, updates) {
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
    async deleteJob(id) {
        const result = await db
            .update(jobPostings)
            .set({
            status: 'closed',
            updatedAt: new Date(),
        })
            .where(eq(jobPostings.id, id));
        return result.rowCount > 0;
    }
    /**
     * Search jobs with advanced filtering
     */
    async searchJobs(filters = {}, options = {}) {
        const { limit = 20, offset = 0, sortBy = 'created', sortOrder = 'desc' } = options;
        let query = db.select().from(jobPostings);
        // Apply filters
        const conditions = [eq(jobPostings.status, 'active')];
        if (filters.skills && filters.skills.length > 0) {
            conditions.push(sql `${jobPostings.skills} && ${JSON.stringify(filters.skills)}`);
        }
        if (filters.location) {
            conditions.push(ilike(jobPostings.location, `%${filters.location}%`));
        }
        if (filters.workType) {
            conditions.push(eq(jobPostings.workType, filters.workType));
        }
        if (filters.salaryMin) {
            conditions.push(sql `${jobPostings.salaryMin} >= ${filters.salaryMin}`);
        }
        if (filters.salaryMax) {
            conditions.push(sql `${jobPostings.salaryMax} <= ${filters.salaryMax}`);
        }
        if (filters.industry) {
            conditions.push(eq(jobPostings.industry, filters.industry));
        }
        if (filters.company) {
            conditions.push(ilike(jobPostings.company, `%${filters.company}%`));
        }
        if (filters.searchTerm) {
            conditions.push(sql `(
          ${jobPostings.title} ILIKE ${`%${filters.searchTerm}%`} OR
          ${jobPostings.description} ILIKE ${`%${filters.searchTerm}%`} OR
          ${jobPostings.company} ILIKE ${`%${filters.searchTerm}%`}
        )`);
        }
        // Apply WHERE conditions
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        // Apply sorting
        const sortColumn = sortBy === 'created' ? jobPostings.createdAt :
            sortBy === 'salary' ? jobPostings.salaryMax :
                jobPostings.createdAt;
        query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));
        // Apply pagination
        const jobs = await query.limit(limit).offset(offset);
        // Get total count for pagination
        const [{ count }] = await db
            .select({ count: sql `count(*)` })
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
    async getJobsByTalentOwner(talentOwnerId) {
        return await db
            .select()
            .from(jobPostings)
            .where(eq(jobPostings.talentOwnerId, talentOwnerId))
            .orderBy(desc(jobPostings.createdAt));
    }
    /**
     * Get job statistics for analytics
     */
    async getJobStatistics() {
        // Total and active jobs
        const [jobCounts] = await db
            .select({
            total: sql `count(*)`,
            active: sql `count(*) filter (where status = 'active')`,
            recent: sql `count(*) filter (where created_at >= now() - interval '7 days')`,
        })
            .from(jobPostings);
        // Top companies
        const topCompanies = await db
            .select({
            company: jobPostings.company,
            count: sql `count(*)`,
        })
            .from(jobPostings)
            .where(eq(jobPostings.status, 'active'))
            .groupBy(jobPostings.company)
            .orderBy(desc(sql `count(*)`))
            .limit(10);
        // Average salary
        const [avgSalaryResult] = await db
            .select({
            avgSalary: sql `avg((salary_min + salary_max) / 2)`,
        })
            .from(jobPostings)
            .where(and(eq(jobPostings.status, 'active'), sql `salary_min is not null and salary_max is not null`));
        // Top skills aggregation
        const skillsData = await db
            .select({ skills: jobPostings.skills })
            .from(jobPostings)
            .where(eq(jobPostings.status, 'active'));
        const skillCounts = new Map();
        skillsData.forEach(job => {
            if (job.skills) {
                job.skills.forEach(skill => {
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
    async incrementViewCount(jobId) {
        await db
            .update(jobPostings)
            .set({
            viewCount: sql `${jobPostings.viewCount} + 1`,
            updatedAt: new Date(),
        })
            .where(eq(jobPostings.id, jobId));
    }
    /**
     * Increment application count for a job
     */
    async incrementApplicationCount(jobId) {
        await db
            .update(jobPostings)
            .set({
            applicationCount: sql `${jobPostings.applicationCount} + 1`,
            updatedAt: new Date(),
        })
            .where(eq(jobPostings.id, jobId));
    }
    /**
     * Get similar jobs based on skills and industry
     */
    async getSimilarJobs(jobId, limit = 5) {
        const [targetJob] = await db
            .select()
            .from(jobPostings)
            .where(eq(jobPostings.id, jobId));
        if (!targetJob)
            return [];
        return await db
            .select()
            .from(jobPostings)
            .where(and(eq(jobPostings.status, 'active'), sql `${jobPostings.id} != ${jobId}`, sql `(
            ${jobPostings.industry} = ${targetJob.industry} OR
            ${jobPostings.skills} && ${JSON.stringify(targetJob.skills || [])}
          )`))
            .orderBy(desc(jobPostings.createdAt))
            .limit(limit);
    }
    /**
     * Update job urgency level
     */
    async updateJobUrgency(jobId, urgency) {
        const result = await db
            .update(jobPostings)
            .set({
            urgency,
            updatedAt: new Date(),
        })
            .where(eq(jobPostings.id, jobId));
        return result.rowCount > 0;
    }
    /**
     * Get jobs that are expiring soon (for cleanup)
     */
    async getExpiringJobs(days = 30) {
        return await db
            .select()
            .from(jobPostings)
            .where(and(eq(jobPostings.status, 'active'), sql `created_at < now() - interval '${days} days'`))
            .orderBy(asc(jobPostings.createdAt));
    }
}
