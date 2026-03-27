/**
 * ML-Based Job Matching Service
 * Uses HuggingFace Inference API (BAAI/bge-m3) for semantic embeddings
 * — 384-dim multilingual model, SOTA for retrieval/matching tasks.
 * No local ONNX/WASM model, no cold-start delays.
 */

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
 * Get model info
 */
export function getModelInfo() {
  return {
    model: 'BAAI/bge-m3',
    description: 'BGE-M3 via HuggingFace Inference API — 384-dim, multilingual, SOTA retrieval',
    dimensions: 384,
    maxTokens: 8192,
    type: 'HuggingFace Inference API',
    endpoint: HF_MODEL_URL,
  };
}
