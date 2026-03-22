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
import { db } from '../server/db.js';
import { jobApplications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail as sendTransactionalEmail } from '../server/lib/email.js';

const BATCH_SIZE = 5;
const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

async function main() {
  console.log('[agent-worker] Starting agent task processor...');

  // Check required env vars (db.ts accepts either DATABASE_URL or POSTGRES_URL)
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error('[agent-worker] ERROR: Missing DATABASE_URL or POSTGRES_URL');
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

      const candidateData = task.candidateData as any;
      const candidateEmail = candidateData?.email || '';
      const candidateName = [candidateData?.firstName, candidateData?.lastName].filter(Boolean).join(' ') || 'there';
      const job = await storage.getJobPosting(task.jobId);
      const dashboardUrl = (process.env.FRONTEND_URL || 'https://www.recrutas.ai') + '/candidate-dashboard';

      if (result.success) {
        console.log(`[agent-worker] Task #${task.id} — SUCCESS`);
        await storage.updateAgentTaskStatus(task.id, 'submitted', undefined, {
          timestamp: new Date().toISOString(),
          action: 'completed',
          result: 'Application submitted successfully',
          log: result.log,
        });

        // Update application status
        await db.update(jobApplications).set({
          status: 'submitted' as any,
          metadata: { agentApply: true, ats: 'greenhouse', submittedAt: new Date().toISOString() },
          updatedAt: new Date(),
          lastStatusUpdate: new Date(),
        }).where(eq(jobApplications.id, task.applicationId));

        // Email the candidate
        if (candidateEmail && job) {
          sendTransactionalEmail({
            to: candidateEmail,
            subject: `Application submitted: ${job.title} at ${job.company}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:#000;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                  <h1 style="margin:0;font-size:20px;">Application Submitted</h1>
                </div>
                <div style="padding:24px;background:#f9f9f9;">
                  <p>Hi ${candidateName},</p>
                  <p>Your application for <strong>${job.title}</strong> at <strong>${job.company}</strong> has been submitted successfully.</p>
                  <p><strong>What happens next:</strong> You should receive a confirmation email from ${job.company}. They'll reach out directly if they'd like to move forward.</p>
                  <div style="text-align:center;margin:20px 0;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 30px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">View Your Applications</a>
                  </div>
                </div>
                <div style="text-align:center;padding:15px;color:#666;font-size:13px;">Recrutas &mdash; No ghosting, guaranteed.</div>
              </div>`,
          }).catch((err: any) => console.error(`[agent-worker] Email failed for task #${task.id}:`, err?.message));
        }
      } else {
        const currentAttempts = task.attempts + 1;
        const maxed = currentAttempts >= task.maxAttempts;
        const newStatus = maxed ? 'failed' : 'queued';

        console.log(`[agent-worker] Task #${task.id} — FAILED: ${result.error} (${maxed ? 'max attempts reached' : 'will retry'})`);
        await storage.updateAgentTaskStatus(task.id, newStatus, result.error, {
          timestamp: new Date().toISOString(),
          action: 'attempt_failed',
          result: result.error || 'Unknown error',
          log: result.log,
        });

        if (maxed) {
          // Update application to failed
          await db.update(jobApplications).set({
            status: 'rejected' as any,
            metadata: { agentApply: true, ats: 'greenhouse', failedAt: new Date().toISOString(), error: result.error },
            updatedAt: new Date(),
            lastStatusUpdate: new Date(),
          }).where(eq(jobApplications.id, task.applicationId));

          // Email the candidate about the failure
          if (candidateEmail && job) {
            sendTransactionalEmail({
              to: candidateEmail,
              subject: `Application could not be submitted: ${job.title} at ${job.company}`,
              html: `
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                  <div style="background:#dc2626;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                    <h1 style="margin:0;font-size:20px;">Application Could Not Be Submitted</h1>
                  </div>
                  <div style="padding:24px;background:#f9f9f9;">
                    <p>Hi ${candidateName},</p>
                    <p>We were unable to submit your application for <strong>${job.title}</strong> at <strong>${job.company}</strong> after multiple attempts.</p>
                    <p>You can still apply directly on the company's website:</p>
                    <div style="text-align:center;margin:20px 0;">
                      <a href="${job.externalUrl}" style="display:inline-block;padding:12px 30px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">Apply Directly</a>
                    </div>
                  </div>
                  <div style="text-align:center;padding:15px;color:#666;font-size:13px;">Recrutas &mdash; No ghosting, guaranteed.</div>
                </div>`,
            }).catch((err: any) => console.error(`[agent-worker] Failure email failed for task #${task.id}:`, err?.message));
          }
        }
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
