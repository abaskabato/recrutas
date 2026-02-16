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
import { generateEmbedding, cosineSimilarity } from '../ml-matching.js';
import { db } from '../db.js';
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
  
  await db
    .update(jobPostings)
    .set({
      vectorEmbedding: JSON.stringify(embedding),
      embeddingUpdatedAt: new Date(),
    })
    .where(eq(jobPostings.id, jobId));

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
    const jobs = await storage.getJobPostings('');
    const activeJobs = jobs
      .filter(j => j.status === 'active')
      .slice(0, limit);

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
              if (daysSinceUpdate < 7) return;
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
  const job = await storage.getJobPosting(jobId);
  if (!job?.vectorEmbedding) {
    console.warn(`[BatchEmbed] Job ${jobId} has no embedding`);
    return [];
  }

  const queryEmbedding = JSON.parse(job.vectorEmbedding);
  const allJobs = await storage.getJobPostings('');
  
  const similarities: Array<{ jobId: number; score: number; title: string; company: string }> = [];

  for (const otherJob of allJobs) {
    if (otherJob.id === jobId || !otherJob.vectorEmbedding) continue;
    
    try {
      const otherEmbedding = JSON.parse(otherJob.vectorEmbedding);
      const score = cosineSimilarity(queryEmbedding, otherEmbedding);
      
      similarities.push({
        jobId: otherJob.id,
        score,
        title: otherJob.title,
        company: otherJob.company,
      });
    } catch (e) {
      console.warn(`[BatchEmbed] Could not parse embedding for job ${otherJob.id}`);
    }
  }

  similarities.sort((a, b) => b.score - a.score);
  return similarities.slice(0, limit);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[BatchEmbed] Running as CLI script...');
  
  const limit = parseInt(process.env.BATCH_LIMIT || '500');
  const force = process.argv.includes('--force');
  
  batchComputeEmbeddings(limit, force)
    .then((result) => {
      console.log('[BatchEmbed] Done:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[BatchEmbed] Failed:', err);
      process.exit(1);
    });
}
