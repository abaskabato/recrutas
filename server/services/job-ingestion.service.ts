/**
 * Job Ingestion Service
 * Persists external jobs to database with deduplication
 */

import { createHash } from 'crypto';
import { db } from '../db';
import { jobPostings, users } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { gt } from 'drizzle-orm/sql/expressions';
import { sql } from 'drizzle-orm/sql';
import { normalizeSkills, SKILL_ALIASES } from '../skill-normalizer';

/** Extract canonical skills from free-form text using the full alias taxonomy. */
function extractSkillsFromText(text: string): string[] {
  if (!text) {return [];}
  const words = text.split(/[\s,;|•·()[\]{}<>]+/).filter(w => w.length > 0);
  const found = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 4 && i + n <= words.length; n++) {
      const phrase = words.slice(i, i + n).join(' ').toLowerCase();
      const canonical = SKILL_ALIASES[phrase];
      if (canonical) {found.add(canonical);}
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

    const systemUserId = await ensureSystemUserExists();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Filter non-US up front
    const usJobs = jobs.filter(job => {
      if (!isUSLocation(job.location)) { stats.skippedNonUS++; return false; }
      return true;
    });

    // Assign deterministic externalIds
    const prepared = usJobs.map(job => ({
      ...job,
      effectiveExternalId: job.externalId || createHash('sha1')
        .update(`${job.title ?? ''}:${job.company ?? ''}:${job.location ?? ''}`)
        .digest('hex')
        .slice(0, 16),
    }));

    // ── Bulk dedup: one query to find all already-existing (externalId, source) pairs ──
    const CHUNK = 500;
    for (let i = 0; i < prepared.length; i += CHUNK) {
      const chunk = prepared.slice(i, i + CHUNK);

      // Build a VALUES list for the dedup lookup
      const pairs = chunk.map(j => `(${sql.raw(`'${j.effectiveExternalId.replace(/'/g, "''")}'`)}, ${sql.raw(`'${(j.source ?? 'unknown').replace(/'/g, "''")}'`)})`);
      const existingRows = await db.execute(sql.raw(`
        SELECT external_id, source FROM job_postings
        WHERE (external_id, source) IN (${chunk.map(j =>
          `('${j.effectiveExternalId.replace(/'/g, "''")}', '${(j.source ?? 'unknown').replace(/'/g, "''")}')`
        ).join(', ')})
      `));
      const existingSet = new Set(
        (existingRows as any[]).map((r: any) => `${r.external_id}::${r.source}`)
      );

      const toInsert = chunk.filter(j => !existingSet.has(`${j.effectiveExternalId}::${j.source ?? 'unknown'}`));
      const toUpdate = chunk.filter(j => existingSet.has(`${j.effectiveExternalId}::${j.source ?? 'unknown'}`));

      // Bulk update liveness for existing jobs
      if (toUpdate.length > 0) {
        await db.execute(sql.raw(`
          UPDATE job_postings SET
            liveness_status = 'active',
            last_liveness_check = NOW(),
            updated_at = NOW()
          WHERE (external_id, source) IN (${toUpdate.map(j =>
            `('${j.effectiveExternalId.replace(/'/g, "''")}', '${(j.source ?? 'unknown').replace(/'/g, "''")}')`
          ).join(', ')})
        `));
        stats.duplicates += toUpdate.length;
      }

      // Bulk insert new jobs using ON CONFLICT DO NOTHING as safety net
      if (toInsert.length > 0) {
        try {
          await db.insert(jobPostings).values(
            toInsert.map(job => ({
              talentOwnerId: systemUserId,
              title: job.title ?? 'Untitled Position',
              company: job.company ?? 'Unknown Company',
              location: job.location ?? null,
              description: job.description ?? 'No description provided',
              requirements: job.requirements ?? null,
              skills: normalizeSkills(
                job.skills?.length > 0 ? job.skills : extractSkillsFromText(job.description)
              ),
              workType: job.workType ?? null,
              salaryMin: job.salaryMin ?? null,
              salaryMax: job.salaryMax ?? null,
              source: job.source ?? 'unknown',
              externalId: job.effectiveExternalId,
              externalUrl: job.externalUrl ?? null,
              trustScore: getSourceTrustScore(job.source),
              livenessStatus: 'unknown' as const,
              lastLivenessCheck: now,
              expiresAt,
              status: 'active' as const,
              createdAt: now,
              updatedAt: now,
            }))
          ).onConflictDoNothing();
          stats.inserted += toInsert.length;
        } catch (error) {
          console.error(`[JobIngestion] Bulk insert error for chunk ${i}–${i + CHUNK}:`, (error as Error).message);
          stats.errors += toInsert.length;
        }
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
            sql`${jobPostings.createdAt} < ${cutoffDate.toISOString()}`
          ),
          eq(jobPostings.status, 'active')
        )
      );

    return result.count ?? 0;
  }
}

export const jobIngestionService = new JobIngestionService();