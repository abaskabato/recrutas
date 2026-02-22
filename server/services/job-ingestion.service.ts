/**
 * Job Ingestion Service
 * Persists external jobs to database with deduplication
 */

import { db } from '../db';
import { jobPostings, users } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { gt } from 'drizzle-orm/sql/expressions';
import { sql } from 'drizzle-orm/sql';
import { normalizeSkills, SKILL_ALIASES } from '../skill-normalizer';

/** Extract canonical skills from free-form text using the full alias taxonomy. */
function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const words = text.split(/[\s,;|•·()\[\]{}<>]+/).filter(w => w.length > 0);
  const found = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 4 && i + n <= words.length; n++) {
      const phrase = words.slice(i, i + n).join(' ').toLowerCase();
      const canonical = SKILL_ALIASES[phrase];
      if (canonical) found.add(canonical);
    }
  }
  return Array.from(found).slice(0, 20);
}
import { isUSLocation } from '../location-filter';

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
  async ingestExternalJobs(jobs: ExternalJobInput[]): Promise<{ inserted: number; duplicates: number; errors: number; skippedNonUS: number }> {
    const stats = { inserted: 0, duplicates: 0, errors: 0, skippedNonUS: 0 };

    console.log(`[JobIngestion] Processing ${jobs.length} external jobs...`);

    // Ensure system user exists before inserting any jobs
    const systemUserId = await ensureSystemUserExists();

    for (const job of jobs) {
      // Skip non-US jobs (platform is US-only)
      if (!isUSLocation(job.location)) {
        stats.skippedNonUS++;
        continue;
      }
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

          // Content-fingerprint dedup: same title + company from a different source within 30 days
          const normalizedTitle = job.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
          const normalizedCompany = job.company.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const contentDuplicate = await tx
            .select()
            .from(jobPostings)
            .where(
              and(
                sql`LOWER(REGEXP_REPLACE(${jobPostings.title}, '[^a-z0-9\\s]', '', 'gi')) = ${normalizedTitle}`,
                sql`LOWER(REGEXP_REPLACE(${jobPostings.company}, '[^a-z0-9\\s]', '', 'gi')) = ${normalizedCompany}`,
                sql`${jobPostings.source} != ${job.source}`,
                gt(jobPostings.createdAt, thirtyDaysAgo)
              )
            )
            .limit(1);

          if (contentDuplicate.length > 0) {
            const dupJob = contentDuplicate[0];
            const incomingTrust = getSourceTrustScore(job.source);
            const existingTrust = dupJob.trustScore ?? 0;
            if (incomingTrust > existingTrust) {
              // Upgrade trust score to the higher-trust source
              await tx
                .update(jobPostings)
                .set({ trustScore: incomingTrust, lastLivenessCheck: new Date(), updatedAt: new Date() })
                .where(eq(jobPostings.id, dupJob.id));
            } else {
              // Just refresh liveness timestamp
              await tx
                .update(jobPostings)
                .set({ lastLivenessCheck: new Date(), updatedAt: new Date() })
                .where(eq(jobPostings.id, dupJob.id));
            }
            return 'duplicate';
          }

          // Calculate trust score and expiration
          const trustScore = getSourceTrustScore(job.source);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 60);

          // Insert new external job with valid system user UUID
          // postgres.js throws UNDEFINED_VALUE for undefined fields — coerce to null
          await tx.insert(jobPostings).values({
            talentOwnerId: systemUserId,
            title: job.title,
            company: job.company,
            location: job.location ?? null,
            description: job.description ?? null,
            requirements: job.requirements ?? null,
            skills: normalizeSkills(
              job.skills?.length > 0 ? job.skills : extractSkillsFromText(job.description)
            ),
            workType: job.workType ?? null,
            salaryMin: job.salaryMin ?? null,
            salaryMax: job.salaryMax ?? null,
            source: job.source,
            externalId: job.externalId,
            externalUrl: job.externalUrl ?? null,
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

    console.log(`[JobIngestion] Complete. Inserted: ${stats.inserted}, Duplicates: ${stats.duplicates}, Errors: ${stats.errors}, Skipped non-US: ${stats.skippedNonUS}`);
    return stats;
  }

  async expireStaleJobs(daysOld: number = 60): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .update(jobPostings)
      .set({
        status: 'closed',
        livenessStatus: 'stale'
      })
      .where(
        and(
          sql`${jobPostings.source} != 'platform'`,
          or(
            sql`${jobPostings.expiresAt} < NOW()`,
            sql`${jobPostings.createdAt} < ${cutoffDate}`
          ),
          eq(jobPostings.status, 'active')
        )
      );

    return result.count ?? 0;
  }
}

export const jobIngestionService = new JobIngestionService();