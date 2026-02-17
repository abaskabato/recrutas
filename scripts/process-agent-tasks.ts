/**
 * Agent Task Processor
 *
 * Picks up queued agent tasks from the DB and processes them
 * via the AgentApplyService (Playwright browser automation).
 *
 * Invoked by GitHub Actions every 15 minutes.
 *
 * Usage:
 *   npx tsx scripts/process-agent-tasks.ts
 */

import { storage } from '../server/storage.js';
import { agentApplyService } from '../server/services/agent-apply.service.js';

const BATCH_SIZE = 5;
const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

async function main() {
  console.log('[agent-worker] Starting agent task processor...');

  // Check required env vars
  if (!process.env.DATABASE_URL) {
    console.error('[agent-worker] ERROR: Missing DATABASE_URL');
    process.exit(1);
  }

  // Cleanup stuck tasks (processing > 30 min)
  try {
    const allProcessing = await storage.getPendingAgentTasks(100);
    // getPendingAgentTasks only returns 'queued', so we need a custom query for stuck tasks
    // For now, the updateAgentTaskStatus handles the retry logic
  } catch (error) {
    console.error('[agent-worker] Error during cleanup:', error);
  }

  // Fetch batch of pending tasks
  const tasks = await storage.getPendingAgentTasks(BATCH_SIZE);
  console.log(`[agent-worker] Found ${tasks.length} queued tasks`);

  if (tasks.length === 0) {
    console.log('[agent-worker] No tasks to process. Exiting.');
    return;
  }

  // Process tasks sequentially to avoid rate limiting
  for (const task of tasks) {
    console.log(`[agent-worker] Processing task #${task.id} for job ${task.jobId} (attempt ${task.attempts + 1}/${task.maxAttempts})`);

    try {
      // Mark as processing
      await storage.updateAgentTaskStatus(task.id, 'processing', undefined, {
        timestamp: new Date().toISOString(),
        action: 'start_processing',
        result: `Attempt ${task.attempts + 1}`,
      });

      // Run the agent
      const result = await agentApplyService.processTask(task);

      if (result.success) {
        console.log(`[agent-worker] Task #${task.id} — SUCCESS`);
        await storage.updateAgentTaskStatus(task.id, 'submitted', undefined, {
          timestamp: new Date().toISOString(),
          action: 'completed',
          result: 'Application submitted successfully',
        });
      } else {
        const currentAttempts = task.attempts + 1; // +1 because updateAgentTaskStatus increments
        const maxed = currentAttempts >= task.maxAttempts;
        const newStatus = maxed ? 'failed' : 'queued';

        console.log(`[agent-worker] Task #${task.id} — FAILED: ${result.error} (${maxed ? 'max attempts reached' : 'will retry'})`);
        await storage.updateAgentTaskStatus(task.id, newStatus, result.error, {
          timestamp: new Date().toISOString(),
          action: 'attempt_failed',
          result: result.error || 'Unknown error',
          log: result.log,
        });
      }
    } catch (error: any) {
      console.error(`[agent-worker] Task #${task.id} — EXCEPTION:`, error.message);
      const currentAttempts = task.attempts + 1;
      const maxed = currentAttempts >= task.maxAttempts;

      await storage.updateAgentTaskStatus(task.id, maxed ? 'failed' : 'queued', error.message, {
        timestamp: new Date().toISOString(),
        action: 'exception',
        result: error.message,
      });
    }
  }

  console.log('[agent-worker] Done processing batch.');
}

main().catch((error) => {
  console.error('[agent-worker] Fatal error:', error);
  process.exit(1);
});
