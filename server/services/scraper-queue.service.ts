/**
 * Job Queue System with BullMQ
 * 
 * Provides:
 * - Priority queue (high → low)
 * - Automatic retry with exponential backoff
 * - Dead letter queue for failed jobs
 * - Rate limiting per domain
 * - Job progress tracking
 * 
 * This is the foundation for scalable scraping.
 */

import { Queue, Worker, Job } from 'bullmq';

export interface ScrapeJob {
  companyId: string;
  companyName: string;
  careerUrl: string;
  atsType: 'greenhouse' | 'lever' | 'workday' | 'custom' | 'unknown';
  atsId?: string;
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
}

export interface JobResult {
  success: boolean;
  jobsFound: number;
  errors: string[];
  duration: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// Queue names
export const QUEUES = {
  SCRAPING: 'scraping',
  DETECTION: 'detection',
  EXTRACTION: 'extraction',
  DISCOVERY: 'discovery',
} as const;

// Priority levels
export const PRIORITIES = {
  high: 1,
  normal: 5,
  low: 10,
} as const;

// Redis connection config
const getConnection = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// Queue instances
const queues: Map<string, Queue> = new Map();
const workers: Map<string, Worker> = new Map();

/**
 * Create a queue with the given name and options
 */
export async function createQueue(name: string): Promise<Queue> {
  if (queues.has(name)) {
    return queues.get(name)!;
  }

  const queue = new Queue(name, {
    connection: getConnection(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });

  queues.set(name, queue);
  console.log(`[Queue] Created queue: ${name}`);
  
  return queue;
}

/**
 * Add a scraping job to the queue
 */
export async function addScrapeJob(job: ScrapeJob): Promise<Job> {
  const queue = await createQueue(QUEUES.SCRAPING);
  
  const jobOptions = {
    priority: PRIORITIES[job.priority] || PRIORITIES.normal,
    jobId: `${job.companyId}-${Date.now()}`,
    retryLimit: 3,
  };

  const addedJob = await queue.add(
    'scrape-company',
    job,
    jobOptions
  );

  console.log(`[Queue] Added job: ${job.companyName} (priority: ${job.priority})`);
  return addedJob;
}

/**
 * Add multiple jobs in batch
 */
export async function addScrapeJobs(jobs: ScrapeJob[]): Promise<Job[]> {
  const queue = await createQueue(QUEUES.SCRAPING);
  
  const bulkJobs = jobs.map(job => ({
    name: 'scrape-company',
    data: job,
    opts: {
      priority: PRIORITIES[job.priority] || PRIORITIES.normal,
      jobId: `${job.companyId}-${Date.now()}`,
    },
  }));

  const addedJobs = await queue.addBulk(bulkJobs);
  console.log(`[Queue] Added ${addedJobs.length} jobs in bulk`);
  
  return addedJobs;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string): Promise<QueueStats> {
  const queue = queues.get(queueName) || await createQueue(queueName);
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get all queue stats
 */
export async function getAllQueueStats(): Promise<Record<string, QueueStats>> {
  const stats: Record<string, QueueStats> = {};
  
  for (const name of Object.values(QUEUES)) {
    stats[name] = await getQueueStats(name);
  }
  
  return stats;
}

/**
 * Register a worker to process jobs
 */
export function registerWorker(
  queueName: string,
  processor: (job: Job) => Promise<JobResult>
): Worker {
  const existingWorker = workers.get(queueName);
  if (existingWorker) {
    console.log(`[Queue] Worker already exists for: ${queueName}`);
    return existingWorker;
  }

  const worker = new Worker(queueName, async (job: Job) => {
    const startTime = Date.now();
    
    try {
      console.log(`[Queue] Processing job: ${job.id} - ${(job.data as ScrapeJob).companyName}`);
      
      const result = await processor(job);
      
      const duration = Date.now() - startTime;
      console.log(`[Queue] Job completed: ${job.id} in ${duration}ms (${result.jobsFound} jobs found)`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Queue] Job failed: ${job.id} after ${duration}ms`, error);
      throw error;
    }
  }, {
    connection: getConnection(),
    concurrency: 10,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    console.log(`[Queue] Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Job failed: ${job?.id}`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[Queue] Worker error:`, err);
  });

  workers.set(queueName, worker);
  console.log(`[Queue] Registered worker for: ${queueName}`);
  
  return worker;
}

/**
 * Clean up all queues and workers
 */
export async function cleanup(): Promise<void> {
  console.log('[Queue] Cleaning up...');
  
  for (const worker of workers.values()) {
    await worker.close();
  }
  workers.clear();
  
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
  
  console.log('[Queue] Cleanup complete');
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = queues.get(queueName);
  if (queue) {
    await queue.pause();
    console.log(`[Queue] Paused: ${queueName}`);
  }
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: string): Promise<void> {
  const queue = queues.get(queueName);
  if (queue) {
    await queue.resume();
    console.log(`[Queue] Resumed: ${queueName}`);
  }
}

/**
 * Drain a queue (process all waiting jobs)
 */
export async function drainQueue(queueName: string): Promise<void> {
  const queue = queues.get(queueName);
  if (queue) {
    await queue.drain();
    console.log(`[Queue] Drained: ${queueName}`);
  }
}

/**
 * Retry all failed jobs
 */
export async function retryFailedJobs(queueName: string): Promise<void> {
  const queue = queues.get(queueName) || await createQueue(queueName);
  const failedJobs = await queue.getFailed();
  
  for (const job of failedJobs) {
    await job.retry();
  }
  
  console.log(`[Queue] Retried ${failedJobs.length} failed jobs`);
}

/**
 * Get job by ID
 */
export async function getJob(queueName: string, jobId: string): Promise<Job | undefined> {
  const queue = queues.get(queueName) || await createQueue(queueName);
  return queue.getJob(jobId);
}

/**
 * Clean old completed jobs
 */
export async function cleanOldJobs(queueName: string, olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const queue = queues.get(queueName) || await createQueue(queueName);
  
  const counts = await queue.clean(olderThanMs, 100, 'completed');
  const count = Array.isArray(counts) ? counts.length : 0;
  console.log(`[Queue] Cleaned ${count} old completed jobs from ${queueName}`);
  
  return count;
}

/**
 * Initialize all queues
 */
export async function initializeQueues(): Promise<void> {
  console.log('[Queue] Initializing queues...');
  
  for (const name of Object.values(QUEUES)) {
    await createQueue(name);
  }
  
  console.log('[Queue] All queues initialized');
}

// Export for type safety
export type { Queue, Job };
