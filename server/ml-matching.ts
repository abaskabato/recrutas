/**
 * ML-Based Job Matching Service
 * Uses Open-Source Transformers (Xenova/all-MiniLM-L6-v2) for semantic embeddings
 * Runs locally - no external API calls needed
 */

import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we're using pre-converted ONNX models
env.allowLocalModels = false;
env.useBrowserCache = true;

// Model: all-MiniLM-L6-v2 - Fast (22MB), good quality embeddings
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

let embeddingPipeline: any = null;

// Singleton pipeline for generating embeddings
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    console.log('[ML Matching] Loading embedding model (first request may take 10-30 seconds)...');
    embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME);
    console.log('[ML Matching] Model loaded successfully');
  }
  return embeddingPipeline;
}

/**
 * Generate embedding vector for text using ML model
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const pipe = await getEmbeddingPipeline();
    
    // Truncate to 512 tokens (model max)
    const truncatedText = text.slice(0, 2048);
    
    const output: any = pipe(truncatedText, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert to regular array of numbers
    const embedding: number[] = Array.from(output.data).map((x: any) => Number(x));
    
    return {
      embedding,
      tokens: embedding.length,
    };
  } catch (error) {
    console.error('[ML Matching] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch (more efficient)
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const pipe = await getEmbeddingPipeline();
  
  const results: EmbeddingResult[] = [];
  
  for (const text of texts) {
    const truncatedText = text.slice(0, 2048);
    const output: any = pipe(truncatedText, {
      pooling: 'mean',
      normalize: true,
    });
    
    results.push({
      embedding: Array.from(output.data).map((x: any) => Number(x)),
      tokens: output.data.length,
    });
  }
  
  return results;
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns value between 0 (no similarity) and 1 (identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.warn('[ML Matching] Embedding dimensions mismatch, returning 0');
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
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate embedding similarity between candidate and job
 * Returns score 0-100
 */
export async function calculateMLMatchScore(
  candidateSkills: string[],
  candidateExperience: string,
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string[],
  jobSkills: string[]
): Promise<{
  score: number;
  confidence: number;
  skillMatches: string[];
  explanation: string;
}> {
  try {
    // Prepare texts for embedding
    const candidateText = [
      ...candidateSkills,
      candidateExperience || '',
    ].join(' ').trim();
    
    const jobText = [
      jobTitle,
      ...(jobSkills || []),
      ...(jobRequirements || []),
      (jobDescription || '').slice(0, 1000), // Limit description length
    ].join(' ').trim();
    
    // Generate embeddings using ML model
    const [candidateEmbedding, jobEmbedding] = await Promise.all([
      generateEmbedding(candidateText),
      generateEmbedding(jobText),
    ]);
    
    // Calculate semantic similarity using ML
    const baseSimilarity = cosineSimilarity(
      candidateEmbedding.embedding,
      jobEmbedding.embedding
    );
    
    // Additional: Check explicit skill matches
    const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
    const normalizedJobSkills = [...(jobSkills || []), ...(jobRequirements || [])].map(s => s.toLowerCase().trim());
    
    const explicitMatches: string[] = [];
    for (const candidateSkill of normalizedCandidateSkills) {
      for (const jobSkill of normalizedJobSkills) {
        // Check for exact or partial matches
        if (jobSkill.includes(candidateSkill) || candidateSkill.includes(jobSkill)) {
          if (!explicitMatches.includes(candidateSkill)) {
            explicitMatches.push(candidateSkill);
          }
        }
      }
    }
    
    // Combine ML similarity with explicit matches
    // ML similarity: 70%, Explicit matches: 30%
    const explicitMatchBonus = Math.min(explicitMatches.length * 0.1, 0.3);
    const finalScore = Math.min((baseSimilarity * 0.7) + explicitMatchBonus, 1.0);
    
    // Confidence based on text quality
    const confidence = Math.min(
      (candidateText.length / 100 + jobText.length / 500) / 2,
      1.0
    );
    
    // Generate explanation
    let explanation = '';
    if (finalScore >= 0.7) {
      explanation = `Strong match! Your skills align well with this position.`;
    } else if (finalScore >= 0.5) {
      explanation = `Good match based on your experience and skills.`;
    } else if (finalScore >= 0.3) {
      explanation = `Partial match - consider applying if you're interested in learning this role.`;
    } else {
      explanation = `Limited match - this role may require different skills.`;
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
    // Fallback to simple matching on error
    return {
      score: 0,
      confidence: 0,
      skillMatches: [],
      explanation: 'Unable to calculate match score',
    };
  }
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    model: MODEL_NAME,
    description: 'All-MiniLM-L6-v2 - Lightweight sentence transformer',
    dimensions: 384,
    maxTokens: 512,
    type: 'Open-source (Apache 2.0)',
  };
}

// Warm up the model on startup (optional)
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    console.log('[ML Matching] Warming up embedding model...');
    generateEmbedding('warmup').catch(console.error);
  }, 5000);
}
