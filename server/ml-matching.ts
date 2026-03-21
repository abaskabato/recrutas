/**
 * ML-Based Job Matching Service
 * Uses HuggingFace Inference API (BAAI/bge-m3) for semantic embeddings
 * — 1024-dim multilingual model, SOTA for retrieval/matching tasks.
 * No local ONNX/WASM model, no cold-start delays.
 */

import { normalizeSkills } from './skill-normalizer.js';

const HF_MODEL_URL =
  'https://router.huggingface.co/hf-inference/models/BAAI/bge-m3';

interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

// ── HuggingFace API call with retry ──────────────────────────────────────────

async function callHFAPI(text: string, attempt = 0): Promise<number[]> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    console.warn('[ML Matching] HF_API_KEY not set — returning empty embedding');
    return [];
  }

  try {
    const response = await fetch(HF_MODEL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-hf-task': 'feature-extraction',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`HF API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // sentence-transformers feature-extraction returns a number[] (flat embedding)
    // or occasionally a nested array — flatten if needed.
    if (Array.isArray(data)) {
      if (data.length > 0 && Array.isArray(data[0])) {
        // 2-D array (batch of 1): take first row
        return (data[0] as number[]).map(Number);
      }
      return (data as number[]).map(Number);
    }

    console.warn('[ML Matching] Unexpected HF API response shape:', typeof data);
    return [];
  } catch (error) {
    if (attempt < 2) {
      const delay = (attempt + 1) * 1000;
      console.warn(`[ML Matching] HF API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (error as Error).message);
      await new Promise(r => setTimeout(r, delay));
      return callHFAPI(text, attempt + 1);
    }
    console.warn('[ML Matching] HF API failed after 3 attempts — returning empty embedding:', (error as Error).message);
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate embedding vector for text using HuggingFace Inference API.
 * Returns { embedding, tokens } to keep callers (vector-search, batch-embedding) working.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  // Truncate to ~512 tokens (approx 2048 chars)
  const truncatedText = text.slice(0, 2048);
  const embedding = await callHFAPI(truncatedText);
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
 * Calculate embedding similarity between candidate and job.
 * Returns score 0-100.
 */
export async function calculateMLMatchScore(
  candidateSkills: string[],
  candidateExperience: string,
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string[],
  jobSkills: string[],
  precomputedCandidateEmbedding?: number[],
  precomputedJobEmbedding?: number[]
): Promise<{
  score: number;
  confidence: number;
  skillMatches: string[];
  explanation: string;
}> {
  try {
    // Prepare job text for embedding
    const jobText = [
      jobTitle,
      ...(jobSkills || []),
      ...(jobRequirements || []),
      (jobDescription || '').slice(0, 1000),
    ].join(' ').trim();

    // Reuse pre-computed candidate embedding or generate a new one
    let candidateEmbeddingVec: number[];
    if (precomputedCandidateEmbedding && precomputedCandidateEmbedding.length > 0) {
      candidateEmbeddingVec = precomputedCandidateEmbedding;
    } else {
      candidateEmbeddingVec = await generateCandidateEmbedding(candidateSkills, candidateExperience);
    }

    // Reuse pre-computed job embedding or generate a new one
    let jobEmbeddingVec: number[];
    if (precomputedJobEmbedding && precomputedJobEmbedding.length > 0) {
      jobEmbeddingVec = precomputedJobEmbedding;
    } else {
      const jobEmbedding = await generateEmbedding(jobText);
      jobEmbeddingVec = jobEmbedding.embedding;
    }

    // Calculate semantic similarity using ML embeddings
    const baseSimilarity = cosineSimilarity(candidateEmbeddingVec, jobEmbeddingVec);

    // Check explicit skill matches (canonical exact match, no substring false positives)
    const normalizedCandSkills = normalizeSkills(candidateSkills).map(s => s.toLowerCase());
    const normalizedJobSkillSet = new Set(
      normalizeSkills([...(jobSkills || []), ...(jobRequirements || [])]).map(s => s.toLowerCase())
    );
    const explicitMatches: string[] = [];
    for (const skill of normalizedCandSkills) {
      if (normalizedJobSkillSet.has(skill) && !explicitMatches.includes(skill)) {
        explicitMatches.push(skill);
      }
    }

    // Combine ML similarity with explicit matches
    // ML similarity: 70%, Explicit matches: 30%
    const explicitMatchBonus = Math.min(explicitMatches.length * 0.1, 0.3);
    let finalScore = Math.min((baseSimilarity * 0.7) + explicitMatchBonus, 1.0);
    // Semantic similarity alone shouldn't rank unrelated jobs highly —
    // cap at 25% when there is no explicit skill overlap
    if (explicitMatches.length === 0) { finalScore = Math.min(finalScore, 0.25); }

    // Confidence based on text quality
    const candidateTextLength = candidateSkills.join(' ').length + (candidateExperience || '').length;
    const confidence = Math.min(
      (candidateTextLength / 100 + jobText.length / 500) / 2,
      1.0
    );

    // Generate explanation
    let explanation = '';
    if (finalScore >= 0.7) {
      explanation = 'Strong match! Your skills align well with this position.';
    } else if (finalScore >= 0.5) {
      explanation = 'Good match based on your experience and skills.';
    } else if (finalScore >= 0.3) {
      explanation = 'Partial match - consider applying if you\'re interested in learning this role.';
    } else {
      explanation = 'Limited match - this role may require different skills.';
    }

    if (explicitMatches.length > 0) {
      explanation += ` Matching skills: ${explicitMatches.slice(0, 5).join(', ')}`;
    }

    return {
      score: Math.round(finalScore * 100),
      confidence: Math.round(confidence * 100),
      skillMatches: explicitMatches.slice(0, 10),
      explanation,
    };
  } catch (error) {
    console.error('[ML Matching] Error in match scoring:', error);
    return {
      score: 0,
      confidence: 0,
      skillMatches: [],
      explanation: 'Unable to calculate match score',
    };
  }
}

/**
 * Returns true if HuggingFace API key is configured.
 * (Replaces old isModelLoaded check — model is always "loaded" via API.)
 */
export function isModelLoaded(): boolean {
  return !!process.env.HF_API_KEY;
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    model: 'BAAI/bge-m3',
    description: 'BGE-M3 via HuggingFace Inference API — 1024-dim, multilingual, SOTA retrieval',
    dimensions: 1024,
    maxTokens: 8192,
    type: 'HuggingFace Inference API',
    endpoint: HF_MODEL_URL,
  };
}
