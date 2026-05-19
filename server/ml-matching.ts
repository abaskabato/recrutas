/**
 * ML-Based Job Matching Service
 * Generates semantic embeddings locally with @xenova/transformers running
 * BAAI/bge-small-en-v1.5 (ONNX) — 384-dim English, no API dependency.
 *
 * Previous incarnation used the HuggingFace Inference API; that account hit
 * the monthly credit cap on 2026-05-11 and silently dropped 8 days of
 * embedding work into "Empty embedding — skipping" no-ops. Running the same
 * model locally avoids the credit limit entirely and is faster per call once
 * the model is cached (~10ms vs. ~150ms over the network).
 */

import type { FeatureExtractionPipeline } from '@xenova/transformers';

const MODEL_ID = 'Xenova/bge-small-en-v1.5';

interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

// ── Local pipeline (singleton; ~80MB ONNX, ~1.3s cold-load) ─────────────────

let _pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (_pipelinePromise) return _pipelinePromise;
  _pipelinePromise = (async () => {
    const { pipeline, env } = await import('@xenova/transformers');
    // Allow downloading from the HuggingFace hub on first run; subsequent
    // runs use the on-disk cache (~/.cache/huggingface/ by default).
    env.allowLocalModels = false;
    return pipeline('feature-extraction', MODEL_ID) as Promise<FeatureExtractionPipeline>;
  })();
  return _pipelinePromise;
}

async function callLocalModel(text: string): Promise<number[]> {
  try {
    const extractor = await getPipeline();
    // Mean-pooled + L2-normalized to match the sentence-transformers reference
    // implementation; this is what BGE was trained for downstream cosine sim.
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  } catch (error) {
    console.warn('[ML Matching] Local embedding failed — returning empty:', (error as Error).message);
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate embedding vector for text using HuggingFace Inference API.
 * Returns { embedding, tokens } to keep callers (vector-search, batch-embedding) working.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  // Truncate to ~512 tokens (approx 2048 chars). The tokenizer enforces a
  // 512-token cap regardless; keeping the byte cap upstream avoids paying for
  // tokenization on anything we'd just truncate.
  const truncatedText = text.slice(0, 2048);
  const embedding = await callLocalModel(truncatedText);
  return { embedding, tokens: embedding.length };
}

/**
 * Generate embeddings for multiple texts sequentially.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  for (const text of texts) {
    results.push(await generateEmbedding(text));
  }
  return results;
}

/**
 * Calculate cosine similarity between two embedding vectors.
 * Returns value between 0 (no similarity) and 1 (identical).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    if (a.length !== b.length && a.length > 0 && b.length > 0) {
      console.warn('[ML Matching] Embedding dimensions mismatch, returning 0');
    }
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) { return 0; }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate a reusable candidate embedding from skills + experience + job titles.
 * Compute once and pass into calculateMLMatchScore for each job.
 *
 * Job titles are placed first in the text to give them high prominence in the
 * embedding — BGE-M3 (and most embedding models) weight earlier tokens more.
 */
export async function generateCandidateEmbedding(
  candidateSkills: string[],
  candidateExperience: string,
  previousJobTitles?: string[],
): Promise<number[]> {
  // Front-load job titles so the embedding strongly represents the candidate's role identity
  const titleBlock = previousJobTitles && previousJobTitles.length > 0
    ? previousJobTitles.join(', ') + '. '
    : '';
  const candidateText = [
    titleBlock,
    ...candidateSkills,
    candidateExperience || '',
  ].join(' ').trim();
  const result = await generateEmbedding(candidateText);
  return result.embedding;
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    model: MODEL_ID,
    description: 'BGE-small-en-v1.5 running locally via @xenova/transformers — 384-dim, English',
    dimensions: 384,
    maxTokens: 512,
    type: 'Local ONNX',
    endpoint: 'local',
  };
}
