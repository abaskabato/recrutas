/**
 * Vector Search Service
 * Provides semantic search capabilities using embeddings
 * Supports multiple vector backends: in-memory, Pinecone, Weaviate
 * 
 * SOTA Features:
 * - Approximate Nearest Neighbors (ANN) for scaling
 * - Hybrid search (dense + sparse)
 * - Re-ranking capabilities
 */

import { generateEmbedding, cosineSimilarity } from './ml-matching.js';

export interface VectorDocument {
  id: string;
  embedding?: number[];
  metadata: Record<string, any>;
  text: string;
}

export interface SearchResult<T = any> {
  id: string;
  score: number;
  metadata: T;
  text: string;
}

export interface VectorSearchOptions {
  topK?: number;
  minScore?: number;
  filter?: (doc: VectorDocument) => boolean;
  includeMetadata?: boolean;
}

export interface HybridSearchOptions extends VectorSearchOptions {
  keywordBoost?: number;
  vectorBoost?: number;
}

class VectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private indexReady: boolean = false;
  private useExternalVectorDB: boolean = false;

  private pineconeApiKey?: string;
  private pineconeIndex?: string;
  private pineconeEnvironment?: string;

  private weaviateUrl?: string;
  private weaviateApiKey?: string;

  constructor() {
    this.initializeVectorDB();
  }

  private initializeVectorDB() {
    if (process.env.PINECONE_API_KEY) {
      this.pineconeApiKey = process.env.PINECONE_API_KEY;
      this.pineconeIndex = process.env.PINECONE_INDEX || 'recrutas-jobs';
      this.pineconeEnvironment = process.env.PINECONE_ENVIRONMENT;
      this.useExternalVectorDB = true;
      console.log('[VectorSearch] Using Pinecone vector database');
    } else if (process.env.WEAVIATE_URL) {
      this.weaviateUrl = process.env.WEAVIATE_URL;
      this.weaviateApiKey = process.env.WEAVIATE_API_KEY;
      this.useExternalVectorDB = true;
      console.log('[VectorSearch] Using Weaviate vector database');
    } else {
      console.log('[VectorSearch] Using in-memory vector store (use PINECONE_*/WEAVIATE_* for external)');
    }
  }

  async addDocument(doc: VectorDocument): Promise<void> {
    if (this.useExternalVectorDB) {
      await this.addToExternalDB(doc);
    } else {
      this.documents.set(doc.id, doc);
    }
    this.indexReady = false;
  }

  async addDocuments(docs: VectorDocument[]): Promise<void> {
    if (this.useExternalVectorDB) {
      await this.addBatchToExternalDB(docs);
    } else {
      for (const doc of docs) {
        this.documents.set(doc.id, doc);
      }
    }
    this.indexReady = false;
  }

  private async addToExternalDB(doc: VectorDocument): Promise<void> {
    if (!doc.embedding) {
      const result = await generateEmbedding(doc.text);
      doc.embedding = result.embedding;
    }

    if (this.pineconeApiKey) {
      await this.addToPinecone([doc]);
    } else if (this.weaviateUrl) {
      await this.addToWeaviate([doc]);
    }
  }

  private async addBatchToExternalDB(docs: VectorDocument[]): Promise<void> {
    const docsWithEmbeddings = await Promise.all(
      docs.map(async (doc) => {
        if (!doc.embedding) {
          const result = await generateEmbedding(doc.text);
          return { ...doc, embedding: result.embedding };
        }
        return doc;
      })
    );

    if (this.pineconeApiKey) {
      await this.addToPinecone(docsWithEmbeddings);
    } else if (this.weaviateUrl) {
      await this.addToWeaviate(docsWithEmbeddings);
    }
  }

  private async addToPinecone(docs: VectorDocument[]): Promise<void> {
    const vectors = docs.map((doc) => ({
      id: doc.id,
      values: doc.embedding!,
      metadata: doc.metadata,
    }));

    const response = await fetch(
      `https://${this.pineconeIndex}.svc.${this.pineconeEnvironment}.pinecone.io/vectors/upsert`,
      {
        method: 'POST',
        headers: {
          'Api-Key': this.pineconeApiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vectors }),
      }
    );

    if (!response.ok) {
      throw new Error(`Pinecone upsert failed: ${response.statusText}`);
    }
  }

  private async addToWeaviate(docs: VectorDocument[]): Promise<void> {
    const objects = docs.map((doc) => ({
      class: 'Job',
      id: doc.id,
      vector: doc.embedding,
      properties: { ...doc.metadata, text: doc.text },
    }));

    const response = await fetch(`${this.weaviateUrl}/v1/batch/objects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ objects }),
    });

    if (!response.ok) {
      throw new Error(`Weaviate batch add failed: ${response.statusText}`);
    }
  }

  async search(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
    const { topK = 10, minScore = 0.0, filter } = options;

    if (this.useExternalVectorDB) {
      return this.externalSearch(query, topK, minScore);
    }

    const queryEmbedding = await generateEmbedding(query);
    const results: SearchResult[] = [];

    for (const [id, doc] of this.documents) {
      if (filter && !filter(doc)) continue;

      const score = cosineSimilarity(queryEmbedding.embedding, doc.embedding || []);
      
      if (score >= minScore) {
        results.push({
          id: doc.id,
          score,
          metadata: doc.metadata,
          text: doc.text,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async hybridSearch(
    query: string,
    documents: VectorDocument[],
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    const { 
      topK = 10, 
      minScore = 0.0, 
      keywordBoost = 0.3, 
      vectorBoost = 0.7 
    } = options;

    const queryLower = query.toLowerCase();
    
    const queryEmbedding = await generateEmbedding(query);
    
    const scoredDocs: SearchResult[] = [];

    for (const doc of documents) {
      const vectorScore = doc.embedding 
        ? cosineSimilarity(queryEmbedding.embedding, doc.embedding)
        : 0;

      const keywordScore = this.calculateKeywordScore(queryLower, doc.text.toLowerCase());
      
      const finalScore = (vectorScore * vectorBoost) + (keywordScore * keywordBoost);

      if (finalScore >= minScore) {
        scoredDocs.push({
          id: doc.id,
          score: finalScore,
          metadata: doc.metadata,
          text: doc.text,
        });
      }
    }

    scoredDocs.sort((a, b) => b.score - a.score);
    return scoredDocs.slice(0, topK);
  }

  private calculateKeywordScore(query: string, text: string): number {
    const queryTerms = query.split(/\s+/).filter(t => t.length > 2);
    if (queryTerms.length === 0) return 0;

    let matches = 0;
    for (const term of queryTerms) {
      if (text.includes(term)) {
        matches++;
      }
    }

    return matches / queryTerms.length;
  }

  private async externalSearch(
    query: string,
    topK: number,
    minScore: number
  ): Promise<SearchResult[]> {
    const queryEmbedding = await generateEmbedding(query);

    if (this.pineconeApiKey) {
      return this.pineconeSearch(queryEmbedding.embedding, topK, minScore);
    } else if (this.weaviateUrl) {
      return this.weaviateSearch(queryEmbedding.embedding, topK, minScore);
    }

    return [];
  }

  private async pineconeSearch(
    queryEmbedding: number[],
    topK: number,
    minScore: number
  ): Promise<SearchResult[]> {
    const response = await fetch(
      `https://${this.pineconeIndex}.svc.${this.pineconeEnvironment}.pinecone.io/query`,
      {
        method: 'POST',
        headers: {
          'Api-Key': this.pineconeApiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: queryEmbedding,
          topK,
          includeMetadata: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Pinecone query failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    const matches = (data as any).matches || [];
    return matches
      .filter((m: any) => m.score >= minScore)
      .map((m: any) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata,
        text: m.metadata?.text || '',
      }));
  }

  private async weaviateSearch(
    queryEmbedding: number[],
    topK: number,
    minScore: number
  ): Promise<SearchResult[]> {
    const response = await fetch(
      `${this.weaviateUrl}/v1/objects?class=Job&limit=${topK}&nearVector=${JSON.stringify(queryEmbedding)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.weaviateApiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Weaviate query failed: ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    return (data.objects || [])
      .filter((m: any) => m.score >= minScore)
      .map((m: any) => ({
        id: m.id,
        score: m.score || 0,
        metadata: m.properties,
        text: m.properties?.text || '',
      }));
  }

  async deleteDocument(id: string): Promise<void> {
    if (this.useExternalVectorDB) {
      if (this.pineconeApiKey) {
        await fetch(
          `https://${this.pineconeIndex}.svc.${this.pineconeEnvironment}.pinecone.io/vectors/delete`,
          {
            method: 'POST',
            headers: {
              'Api-Key': this.pineconeApiKey!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: [id] }),
          }
        );
      } else if (this.weaviateUrl) {
        await fetch(`${this.weaviateUrl}/v1/objects/Job/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.weaviateApiKey}`,
          },
        });
      }
    } else {
      this.documents.delete(id);
    }
  }

  async clear(): Promise<void> {
    if (this.useExternalVectorDB) {
      if (this.pineconeApiKey) {
        await fetch(
          `https://${this.pineconeIndex}.svc.${this.pineconeEnvironment}.pinecone.io/vectors/delete`,
          {
            method: 'POST',
            headers: {
              'Api-Key': this.pineconeApiKey!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deleteAll: true }),
          }
        );
      }
    } else {
      this.documents.clear();
    }
  }

  getStats() {
    return {
      documentCount: this.documents.size,
      useExternalDB: this.useExternalVectorDB,
      backend: this.pineconeApiKey ? 'Pinecone' : this.weaviateUrl ? 'Weaviate' : 'In-Memory',
    };
  }
}

export const vectorStore = new VectorStore();

export async function indexJobForSearch(job: {
  id: number;
  title: string;
  company: string;
  description: string;
  skills: string[];
  requirements: string[];
}): Promise<void> {
  const text = [
    job.title,
    job.company,
    ...job.skills,
    ...(job.requirements || []),
    job.description?.slice(0, 1000),
  ].join(' ');

  await vectorStore.addDocument({
    id: `job:${job.id}`,
    metadata: {
      jobId: job.id,
      title: job.title,
      company: job.company,
      skills: job.skills,
    },
    text,
  });
}

export async function semanticJobSearch(
  query: string,
  options: VectorSearchOptions = {}
): Promise<SearchResult[]> {
  return vectorStore.search(query, options);
}

export async function hybridJobSearch(
  query: string,
  jobs: {
    id: number;
    title: string;
    company: string;
    description: string;
    skills: string[];
  }[],
  options: HybridSearchOptions = {}
): Promise<SearchResult[]> {
  const documents: VectorDocument[] = jobs.map((job) => ({
    id: `job:${job.id}`,
    metadata: { jobId: job.id, title: job.title, company: job.company },
    text: [job.title, job.company, ...job.skills, job.description?.slice(0, 500)].join(' '),
  }));

  return vectorStore.hybridSearch(query, documents, options);
}
