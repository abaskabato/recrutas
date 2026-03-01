/**
 * Greenhouse Job Boards API — direct HTTP application submission.
 *
 * Uses the public Boards API endpoint (no auth, no CSRF tokens needed):
 *   POST https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}/applications
 *
 * Works on Vercel serverless — no Playwright/browser required.
 */

interface CandidateSubmission {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl: string; // Supabase signed URL
}

export interface GreenhouseSubmitResult {
  success: boolean;
  applicationId?: number;
  error?: string;
}

/**
 * Parse board token and job ID from a Greenhouse URL.
 * Handles formats:
 *   https://boards.greenhouse.io/{board_token}/jobs/{job_id}
 *   https://job-boards.greenhouse.io/{board_token}/jobs/{job_id}
 *   https://{company}.com/...?gh_jid={job_id}  → cannot parse board_token, returns null
 */
export function parseGreenhouseUrl(url: string): { boardToken: string; jobId: string } | null {
  try {
    const parsed = new URL(url);
    // Standard boards.greenhouse.io or job-boards.greenhouse.io
    if (parsed.hostname.endsWith('greenhouse.io')) {
      const match = parsed.pathname.match(/\/([^/]+)\/jobs\/(\d+)/);
      if (match) {
        return { boardToken: match[1], jobId: match[2] };
      }
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

/**
 * Submit an application to a Greenhouse job board via the public API.
 */
export async function submitToGreenhouse(
  boardToken: string,
  jobId: string,
  candidate: CandidateSubmission
): Promise<GreenhouseSubmitResult> {
  // Download the resume bytes so we can upload as a file
  let resumeBuffer: Buffer;
  let resumeFilename: string;
  try {
    const resumeRes = await fetch(candidate.resumeUrl);
    if (!resumeRes.ok) {
      return { success: false, error: `Failed to fetch resume: HTTP ${resumeRes.status}` };
    }
    resumeBuffer = Buffer.from(await resumeRes.arrayBuffer());
    // Try to infer filename from URL or default to resume.pdf
    const urlPath = candidate.resumeUrl.split('?')[0];
    resumeFilename = urlPath.split('/').pop() || 'resume.pdf';
  } catch (err) {
    return { success: false, error: `Failed to download resume: ${(err as Error).message}` };
  }

  // Build multipart form
  const form = new FormData();
  form.append('first_name', candidate.firstName);
  form.append('last_name', candidate.lastName);
  form.append('email', candidate.email);
  if (candidate.phone) form.append('phone', candidate.phone);
  if (candidate.linkedinUrl) form.append('website[linkedin]', candidate.linkedinUrl);
  if (candidate.portfolioUrl) form.append('website[portfolio]', candidate.portfolioUrl);

  // Attach resume as a Blob with proper MIME type
  const mimeType = resumeFilename.endsWith('.pdf') ? 'application/pdf'
    : resumeFilename.endsWith('.doc') ? 'application/msword'
    : 'application/octet-stream';
  form.append('resume', new Blob([resumeBuffer], { type: mimeType }), resumeFilename);

  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}/applications`;

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      body: form,
      headers: {
        // Do NOT set Content-Type manually — fetch sets it with the boundary automatically
        'User-Agent': 'Mozilla/5.0 (compatible; Recrutas/1.0)',
      },
    });
  } catch (err) {
    return { success: false, error: `Network error: ${(err as Error).message}` };
  }

  if (res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch { /* non-JSON response is fine */ }
    return { success: true, applicationId: body?.id };
  }

  // Parse error from Greenhouse
  let errText = '';
  try { errText = await res.text(); } catch { /* ignore */ }
  return {
    success: false,
    error: `Greenhouse API returned ${res.status}: ${errText.slice(0, 300)}`,
  };
}
