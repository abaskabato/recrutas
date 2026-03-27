/**
 * Batch Embedding Service
 * Pre-computes vector embeddings for all active jobs
 * Run via GitHub Actions (cron) or on-demand
 * 
 * Benefits:
 * - Real-time matching just does cosine similarity on stored vectors
 * - No need to generate embeddings on every request
 * - Runs offline - no server required at runtime
 */

import { storage } from '../storage.js';
import { generateEmbedding } from '../ml-matching.js';
import { db, client } from '../db.js';
import { jobPostings } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const BATCH_SIZE = 50;

async function computeJobEmbedding(job: {
  id: number;
  title: string;
  company: string;
  description?: string;
  skills?: string[];
  requirements?: string[];
}): Promise<number[]> {
  const text = [
    job.title,
    job.company,
    ...(job.skills || []),
    ...(job.requirements || []),
    job.description?.slice(0, 1000) || '',
  ].join(' ');

  const result = await generateEmbedding(text);
  return result.embedding;
}

export async function updateJobEmbedding(jobId: number): Promise<void> {
  const job = await storage.getJobPosting(jobId);
  if (!job) {
    console.error(`[BatchEmbed] Job ${jobId} not found`);
    return;
  }

  const embedding = await computeJobEmbedding(job);
  if (!embedding || embedding.length === 0) {
    console.warn(`[BatchEmbed] Empty embedding for job ${jobId} — skipping`);
    return;
  }
  const vectorStr = `[${embedding.join(',')}]`;

  // Dual-write: TEXT column (legacy) + native pgvector column
  await client`
    UPDATE job_postings
    SET vector_embedding = ${JSON.stringify(embedding)},
        embedding = ${vectorStr}::vector,
        embedding_updated_at = NOW()
    WHERE id = ${jobId}
  `;

  console.log(`[BatchEmbed] Updated embedding for job ${jobId}: ${job.title}`);
}

export async function batchComputeEmbeddings(
  limit: number = 500,
  forceRefresh: boolean = false
): Promise<{ processed: number; errors: number }> {
  console.log(`[BatchEmbed] Starting batch embedding computation (limit: ${limit})`);
  
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    if (!db) throw new Error('Database not available');
    // Fetch all active jobs directly — storage.getJobPostings requires a talentOwnerId
    const allJobs = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.status, 'active'))
      .limit(limit);
    const activeJobs = allJobs;

    console.log(`[BatchEmbed] Processing ${activeJobs.length} active jobs`);

    for (let i = 0; i < activeJobs.length; i += BATCH_SIZE) {
      const batch = activeJobs.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (job) => {
          try {
            const needsUpdate = forceRefresh || !job.vectorEmbedding;
            
            if (!needsUpdate) {
              const lastUpdate = job.embeddingUpdatedAt ? new Date(job.embeddingUpdatedAt).getTime() : 0;
              const daysSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
              if (daysSinceUpdate < 7) {return;}
            }

            await updateJobEmbedding(job.id);
            processed++;
          } catch (err) {
            console.error(`[BatchEmbed] Error processing job ${job.id}:`, err);
            errors++;
          }
        })
      );

      console.log(`[BatchEmbed] Processed ${Math.min(i + BATCH_SIZE, activeJobs.length)}/${activeJobs.length}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[BatchEmbed] Completed in ${duration}s. Processed: ${processed}, Errors: ${errors}`);
    
    return { processed, errors };
  } catch (err) {
    console.error('[BatchEmbed] Fatal error:', err);
    throw err;
  }
}

export async function findSimilarJobs(
  jobId: number,
  limit: number = 10
): Promise<Array<{ jobId: number; score: number; title: string; company: string }>> {
  if (!client) return [];

  // Use pgvector cosine distance for fast ANN similarity search
  const rows = await client`
    SELECT j2.id AS job_id, j2.title, j2.company,
           1 - (j1.embedding <=> j2.embedding) AS score
    FROM job_postings j1
    JOIN job_postings j2 ON j2.id != j1.id AND j2.embedding IS NOT NULL
    WHERE j1.id = ${jobId} AND j1.embedding IS NOT NULL AND j2.status = 'active'
    ORDER BY j1.embedding <=> j2.embedding
    LIMIT ${limit}
  `;

  return rows.map((r: any) => ({
    jobId: r.job_id,
    score: r.score,
    title: r.title,
    company: r.company,
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[BatchEmbed] Running as CLI script...');

  const limit = parseInt(process.env.BATCH_LIMIT || '500');
  const force = process.argv.includes('--force');

  (async () => {
    // Job embeddings
    const jobResult = await batchComputeEmbeddings(limit, force);
    console.log('[BatchEmbed] Jobs done:', jobResult);

    // Candidate embeddings backfill
    const { backfillCandidateEmbeddings } = await import('./candidate-embedding.service.js');
    const candidateResult = await backfillCandidateEmbeddings(100);
    console.log('[BatchEmbed] Candidates done:', candidateResult);

    process.exit(0);
  })().catch((err) => {
    console.error('[BatchEmbed] Failed:', err);
    process.exit(1);
  });
}
