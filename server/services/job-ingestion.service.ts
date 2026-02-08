/**
 * Job Ingestion Service
 * Persists external jobs to database with deduplication
 */

import { db } from '../db';
import { jobPostings, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

// System user UUID for external jobs (well-known constant)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// Ensure system user exists for external job ownership
async function ensureSystemUserExists(): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, SYSTEM_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: SYSTEM_USER_ID,
      name: 'External Jobs System',
      email: 'system@recrutas.internal',
      emailVerified: true,
      role: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('[JobIngestion] Created system user for external jobs');
  }

  return SYSTEM_USER_ID;
}

export interface ExternalJobInput {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  skills: string[];
  workType: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  salaryMax?: number;
  source: string;
  externalId: string;
  externalUrl: string;
  postedDate: string;
}

function getSourceTrustScore(source: string): number {
  const trustScores: Record<string, number> = {
    'greenhouse': 95,
    'lever': 95,
    'workday': 90,
    'company-api': 95,
    'jsearch': 70,
    'remoteok': 75,
    'themuse': 70,
    'arbeitnow': 65,
    'usajobs': 85,
    'default': 50
  };
  return trustScores[source.toLowerCase()] || trustScores.default;
}

export class JobIngestionService {
  async ingestExternalJobs(jobs: ExternalJobInput[]): Promise<{ inserted: number; duplicates: number; errors: number }> {
    const stats = { inserted: 0, duplicates: 0, errors: 0 };

    console.log(`[JobIngestion] Processing ${jobs.length} external jobs...`);

    // Ensure system user exists before inserting any jobs
    const systemUserId = await ensureSystemUserExists();

    for (const job of jobs) {
      try {
        // Use transaction to ensure atomic check-and-insert (prevent race conditions)
        const result = await db.transaction(async (tx) => {
          // Check if job already exists (by externalId + source) within transaction
          const existing = await tx
            .select()
            .from(jobPostings)
            .where(
              and(
                eq(jobPostings.externalId, job.externalId),
                eq(jobPostings.source, job.source)
              )
            )
            .limit(1)
            .for('update', { skipLocked: true }); // Lock row to prevent concurrent modifications

          if (existing.length > 0) {
            // Update liveness for existing jobs
            await tx
              .update(jobPostings)
              .set({
                lastLivenessCheck: new Date(),
                livenessStatus: 'active',
                updatedAt: new Date()
              })
              .where(eq(jobPostings.id, existing[0].id));
            return 'duplicate';
          }

          // Calculate trust score and expiration
          const trustScore = getSourceTrustScore(job.source);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 60);

          // Insert new external job with valid system user UUID
          await tx.insert(jobPostings).values({
            talentOwnerId: systemUserId,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            requirements: job.requirements,
            skills: job.skills,
            workType: job.workType,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            source: job.source,
            externalId: job.externalId,
            externalUrl: job.externalUrl,
            trustScore: trustScore,
            livenessStatus: 'unknown',
            lastLivenessCheck: new Date(),
            expiresAt: expiresAt,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          return 'inserted';
        });

        if (result === 'duplicate') {
          stats.duplicates++;
        } else {
          stats.inserted++;
        }
      } catch (error) {
        console.error(`[JobIngestion] Error ingesting job ${job.title}:`, error);
        stats.errors++;
      }
    }

    console.log(`[JobIngestion] Complete. Inserted: ${stats.inserted}, Duplicates: ${stats.duplicates}, Errors: ${stats.errors}`);
    return stats;
  }

  async expireStaleJobs(): Promise<number> {
    const result = await db
      .update(jobPostings)
      .set({
        status: 'closed',
        livenessStatus: 'stale'
      })
      .where(
        and(
          sql`${jobPostings.source} != 'platform'`,
          sql`${jobPostings.expiresAt} < NOW()`,
          eq(jobPostings.status, 'active')
        )
      );

    return result.count ?? 0;
  }
}

export const jobIngestionService = new JobIngestionService();