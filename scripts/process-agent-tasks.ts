/**
 * Agent Task Processor
 *
 * Picks up queued agent tasks from the DB and processes them
 * via Browser Use (Python) + Groq/Gemini LLM.
 *
 * Invoked by GitHub Actions every 5 minutes.
 *
 * Usage:
 *   npx tsx scripts/process-agent-tasks.ts
 */

import { storage } from '../server/storage.js';
import { db } from '../server/db.js';
import { jobApplications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail as sendTransactionalEmail } from '../server/lib/email.js';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { getFreshResumeUrl } from '../server/lib/resume-url.js';

const BATCH_SIZE = 3; // Lower than before — Browser Use takes longer per task

interface BrowserUseResult {
  success: boolean;
  is_done?: boolean;
  final_result?: string | null;
  errors?: string[];
  steps?: number;
  duration_seconds?: number;
  error?: string;
}

/**
 * Run the Browser Use Python agent for a single task.
 * Spawns: python3 python/apply.py --url "..." --candidate '{...}' [--resume-path ...]
 */
async function runBrowserUseAgent(
  externalUrl: string,
  candidateData: Record<string, any>,
  resumePath: string | null,
): Promise<BrowserUseResult> {
  const scriptPath = path.resolve(__dirname, '../python/apply.py');

  if (!fs.existsSync(scriptPath)) {
    return { success: false, error: `Python script not found: ${scriptPath}`, steps: 0 };
  }

  const args = [
    scriptPath,
    '--url', externalUrl,
    '--candidate', JSON.stringify(candidateData),
  ];
  if (resumePath) {
    args.push('--resume-path', resumePath);
  }

  return new Promise((resolve) => {
    const proc = spawn('python3', args, {
      timeout: 8 * 60 * 1000, // 8 min per task
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      // Stream logs to console for GitHub Actions visibility
      process.stdout.write(text);
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on('close', (code) => {
      try {
        // Browser Use prints JSON on the last line of stdout
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const result: BrowserUseResult = JSON.parse(lastLine);
        resolve(result);
      } catch {
        resolve({
          success: false,
          error: `Process exited ${code}. No JSON output. stderr: ${stderr.slice(-500)}`,
          steps: 0,
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to spawn python3: ${err.message}`,
        steps: 0,
      });
    });
  });
}

/**
 * Download resume to a temp file for Browser Use to upload.
 */
async function downloadResume(resumeUrl: string): Promise<string | null> {
  try {
    const freshUrl = await getFreshResumeUrl(resumeUrl);
    if (!freshUrl) return null;

    const res = await fetch(freshUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null; // Too small — likely an error page

    const tmpPath = `/tmp/resume-${Date.now()}.pdf`;
    fs.writeFileSync(tmpPath, buf);
    console.log(`[agent-worker] Resume downloaded: ${buf.length} bytes → ${tmpPath}`);
    return tmpPath;
  } catch (e: any) {
    console.error(`[agent-worker] Resume download failed: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('[agent-worker] Starting agent task processor (Browser Use)...');

  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error('[agent-worker] ERROR: Missing DATABASE_URL or POSTGRES_URL');
    process.exit(1);
  }

  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error('[agent-worker] ERROR: Missing GROQ_API_KEY or GEMINI_API_KEY');
    process.exit(1);
  }

  const tasks = await storage.getPendingAgentTasks(BATCH_SIZE);
  console.log(`[agent-worker] Found ${tasks.length} queued tasks`);

  if (tasks.length === 0) {
    console.log('[agent-worker] No tasks to process. Exiting.');
    return;
  }

  for (const task of tasks) {
    console.log(`[agent-worker] Processing task #${task.id} for job ${task.jobId} (attempt ${task.attempts + 1}/${task.maxAttempts})`);

    let resumeTmpPath: string | null = null;

    try {
      await storage.updateAgentTaskStatus(task.id, 'processing', undefined, {
        timestamp: new Date().toISOString(),
        action: 'start_processing',
        result: `Attempt ${task.attempts + 1}`,
      });

      // Download resume
      if (task.resumeUrl) {
        resumeTmpPath = await downloadResume(task.resumeUrl);
      }

      const candidateData = task.candidateData as Record<string, any>;

      // Run Browser Use agent
      const result = await runBrowserUseAgent(
        task.externalUrl,
        candidateData,
        resumeTmpPath,
      );

      const candidateEmail = candidateData?.email || '';
      const candidateName = [candidateData?.firstName, candidateData?.lastName].filter(Boolean).join(' ') || 'there';
      const job = await storage.getJobPosting(task.jobId);
      const dashboardUrl = (process.env.FRONTEND_URL || 'https://www.recrutas.ai') + '/candidate-dashboard';

      if (result.success) {
        console.log(`[agent-worker] Task #${task.id} — SUCCESS (${result.steps} steps, ${result.duration_seconds}s)`);
        await storage.updateAgentTaskStatus(task.id, 'submitted', undefined, {
          timestamp: new Date().toISOString(),
          action: 'completed',
          result: result.final_result || 'Application submitted successfully',
          steps: result.steps,
          duration: result.duration_seconds,
        });

        await db.update(jobApplications).set({
          status: 'submitted' as any,
          metadata: { agentApply: true, browserUse: true, submittedAt: new Date().toISOString() },
          updatedAt: new Date(),
          lastStatusUpdate: new Date(),
        }).where(eq(jobApplications.id, task.applicationId));

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
        const errorMsg = result.error || result.errors?.join('; ') || 'Unknown error';

        console.log(`[agent-worker] Task #${task.id} — FAILED: ${errorMsg.substring(0, 200)} (${maxed ? 'max attempts reached' : 'will retry'})`);
        await storage.updateAgentTaskStatus(task.id, newStatus, errorMsg, {
          timestamp: new Date().toISOString(),
          action: 'attempt_failed',
          result: errorMsg,
          steps: result.steps,
          duration: result.duration_seconds,
        });

        if (maxed) {
          await db.update(jobApplications).set({
            status: 'rejected' as any,
            metadata: { agentApply: true, browserUse: true, failedAt: new Date().toISOString(), error: errorMsg.substring(0, 500) },
            updatedAt: new Date(),
            lastStatusUpdate: new Date(),
          }).where(eq(jobApplications.id, task.applicationId));

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
    } finally {
      // Cleanup temp resume
      if (resumeTmpPath) {
        try { fs.unlinkSync(resumeTmpPath); } catch {}
      }
    }
  }

  console.log('[agent-worker] Done processing batch.');
}

main().catch((error) => {
  console.error('[agent-worker] Fatal error:', error);
  process.exit(1);
});
