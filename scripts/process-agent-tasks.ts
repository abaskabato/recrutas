/**
 * Agent Task Processor
 *
 * Picks up queued agent tasks from the DB and processes them.
 * - Greenhouse jobs → dedicated greenhouse-submit service (React Select, AI Q&A, verification codes)
 * - Other ATS → generic AgentApplyService (Playwright browser automation)
 *
 * Invoked by GitHub Actions every 5 minutes.
 *
 * Usage:
 *   npx tsx scripts/process-agent-tasks.ts
 */

import { storage } from '../server/storage.js';
import { agentApplyService } from '../server/services/agent-apply.service.js';
import { parseGreenhouseUrl, submitToGreenhouse, type CandidateSubmission, type GreenhouseSubmitResult } from '../server/services/greenhouse-submit.service.js';
import { getFreshResumeUrl } from '../server/lib/resume-url.js';
import { db } from '../server/db.js';
import { jobApplications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail as sendTransactionalEmail } from '../server/lib/email.js';

const BATCH_SIZE = 5;

interface ProcessResult {
  success: boolean;
  log?: any[];
  error?: string;
  verificationRequired?: boolean;
}

/**
 * Route Greenhouse tasks to the dedicated service.
 * Returns null if the URL is not Greenhouse (caller should use generic flow).
 */
async function processGreenhouseTask(task: any): Promise<ProcessResult | null> {
  const ghParsed = parseGreenhouseUrl(task.externalUrl);
  if (!ghParsed) return null;

  console.log(`[agent-worker] Task #${task.id} — Greenhouse detected (board: ${ghParsed.boardToken}, job: ${ghParsed.jobId})`);

  const candidateData = task.candidateData as any;

  // Get a fresh signed resume URL
  const freshResumeUrl = await getFreshResumeUrl(task.resumeUrl || candidateData?.resumeUrl);
  if (!freshResumeUrl) {
    return { success: false, error: 'Could not resolve resume URL — signed URL may have expired' };
  }

  // Map task candidateData → CandidateSubmission
  const candidate: CandidateSubmission = {
    firstName: candidateData?.firstName || '',
    lastName: candidateData?.lastName || '',
    email: candidateData?.email || '',
    phone: candidateData?.phone || undefined,
    linkedinUrl: candidateData?.linkedinUrl || undefined,
    portfolioUrl: candidateData?.portfolioUrl || undefined,
    githubUrl: candidateData?.githubUrl || undefined,
    personalWebsite: candidateData?.personalWebsite || undefined,
    resumeUrl: freshResumeUrl,
    resumeText: candidateData?.resumeText || undefined,
    location: candidateData?.location || undefined,
    workAuthorized: true,
    needsSponsorship: false,
    skills: candidateData?.skills || undefined,
    experience: candidateData?.experience || undefined,
    experienceLevel: candidateData?.experienceLevel || undefined,
    summary: candidateData?.summary || undefined,
  };

  try {
    const ghResult: GreenhouseSubmitResult = await submitToGreenhouse(
      ghParsed.boardToken,
      ghParsed.jobId,
      candidate,
      // No verification callback — will handle via awaiting_verification status
    );

    // Map GreenhouseSubmitResult → ProcessResult
    return {
      success: ghResult.success,
      error: ghResult.error,
      verificationRequired: ghResult.verificationRequired,
      log: [{
        timestamp: new Date().toISOString(),
        action: 'greenhouse_submit',
        result: ghResult.success
          ? `Submitted (${ghResult.questionsAnswered} questions answered, ${ghResult.questionsSkipped} skipped)`
          : `Failed: ${ghResult.error}`,
      }],
    };
  } catch (err: any) {
    return { success: false, error: `Greenhouse submit exception: ${err.message}` };
  }
}

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

      // Route to the right service based on ATS type
      let result: ProcessResult;
      const ghResult = await processGreenhouseTask(task);
      if (ghResult) {
        result = ghResult;
      } else {
        // Non-Greenhouse: use generic Playwright automation
        console.log(`[agent-worker] Task #${task.id} — using generic agent apply`);
        result = await agentApplyService.processTask(task);
      }

      const candidateData = task.candidateData as any;
      const candidateEmail = candidateData?.email || '';
      const candidateName = [candidateData?.firstName, candidateData?.lastName].filter(Boolean).join(' ') || 'there';
      const job = await storage.getJobPosting(task.jobId);
      const dashboardUrl = (process.env.FRONTEND_URL || 'https://www.recrutas.ai') + '/candidate-dashboard';

      // Handle verification required (Greenhouse email verification)
      if (result.verificationRequired) {
        console.log(`[agent-worker] Task #${task.id} — verification code required`);
        await storage.updateAgentTaskStatus(task.id, 'awaiting_verification', undefined, {
          timestamp: new Date().toISOString(),
          action: 'awaiting_verification',
          result: 'Greenhouse requires email verification code',
          log: result.log,
        });

        // Email the candidate to enter their verification code
        if (candidateEmail && job) {
          sendTransactionalEmail({
            to: candidateEmail,
            subject: `Action needed: Verify your application for ${job.title} at ${job.company}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:#f59e0b;color:#000;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                  <h1 style="margin:0;font-size:20px;">Verification Code Needed</h1>
                </div>
                <div style="padding:24px;background:#f9f9f9;">
                  <p>Hi ${candidateName},</p>
                  <p>Your application for <strong>${job.title}</strong> at <strong>${job.company}</strong> is almost submitted!</p>
                  <p>${job.company} sent a verification code to your email. Please check your inbox and enter the code on your dashboard to complete the submission.</p>
                  <div style="text-align:center;margin:20px 0;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 30px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">Enter Verification Code</a>
                  </div>
                </div>
                <div style="text-align:center;padding:15px;color:#666;font-size:13px;">Recrutas &mdash; No ghosting, guaranteed.</div>
              </div>`,
          }).catch((err: any) => console.error(`[agent-worker] Verification email failed for task #${task.id}:`, err?.message));
        }
        continue; // Don't process as success or failure
      }

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
