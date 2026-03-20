/**
 * Compute and store candidate embedding (BGE-M3, 1024-dim).
 * Called after resume parsing and during batch backfill.
 */

import { db } from '../db';
import { candidateProfiles } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { generateCandidateEmbedding } from '../ml-matching';

/**
 * Compute a candidate's embedding from skills + experience and persist it.
 * Non-blocking — callers should fire-and-forget with .catch().
 */
export async function updateCandidateEmbedding(
  userId: string,
  skills: string[],
  experience: string,
): Promise<void> {
  if (!skills || skills.length === 0) return;
  if (!process.env.HF_API_KEY) return;

  try {
    const embedding = await generateCandidateEmbedding(skills, experience);
    if (!embedding || embedding.length === 0) return;

    await db.update(candidateProfiles)
      .set({
        vectorEmbedding: JSON.stringify(embedding),
        embeddingUpdatedAt: new Date(),
      })
      .where(eq(candidateProfiles.userId, userId));

    console.log(`[CandidateEmbedding] Stored ${embedding.length}-dim vector for ${userId}`);
  } catch (err: any) {
    console.warn(`[CandidateEmbedding] Failed for ${userId}:`, err?.message);
  }
}

/**
 * Backfill embeddings for all candidates with skills but no embedding.
 * Called from batch-embeddings cron.
 */
export async function backfillCandidateEmbeddings(limit = 100): Promise<{ processed: number; errors: number }> {
  const { sql } = await import('drizzle-orm/sql');

  const candidates = await db.select()
    .from(candidateProfiles)
    .where(sql`
      ${candidateProfiles.vectorEmbedding} IS NULL
      AND jsonb_array_length(${candidateProfiles.skills}) > 0
    `)
    .limit(limit);

  let processed = 0;
  let errors = 0;

  for (const c of candidates) {
    try {
      await updateCandidateEmbedding(
        c.userId,
        (c.skills || []) as string[],
        c.experience || '',
      );
      processed++;
      // Small delay to avoid HF rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch {
      errors++;
    }
  }

  console.log(`[CandidateEmbedding] Backfill: ${processed} computed, ${errors} errors`);
  return { processed, errors };
}
