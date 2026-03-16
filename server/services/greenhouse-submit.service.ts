/**
 * Greenhouse Job Boards API — direct HTTP application submission.
 *
 * Uses the public Boards API endpoint (no auth, no CSRF tokens needed):
 *   POST https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}/applications
 *   GET  https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}?questions=true
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
  githubUrl?: string;
  personalWebsite?: string;
  resumeUrl: string; // Supabase signed URL
  location?: string;
  workAuthorized?: boolean; // US work authorization
  needsSponsorship?: boolean;
}

export interface GreenhouseSubmitResult {
  success: boolean;
  applicationId?: number;
  error?: string;
  questionsAnswered?: number;
  questionsSkipped?: number;
}

interface GreenhouseQuestion {
  label: string;
  fields: {
    name: string;
    type: string;
    required: boolean;
    values?: { label: string; value: number }[];
  }[];
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
 * Fetch custom questions for a Greenhouse job posting.
 */
async function fetchJobQuestions(boardToken: string, jobId: string): Promise<GreenhouseQuestion[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Recrutas/1.0)' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.questions || [];
  } catch {
    return [];
  }
}

/**
 * Pattern-match a question label to determine what it's asking.
 * Returns a category string or null if unrecognized.
 */
function classifyQuestion(label: string): string | null {
  const l = label.toLowerCase();

  if (/authorized.*work|legally.*authorized|eligible.*work|right to work|u\.s\..*work.*authorization/.test(l)) return 'work_auth';
  if (/sponsor|visa.*status|immigration.*sponsor/.test(l)) return 'sponsorship';
  if (/how did you hear|how.*find.*job|where.*hear|referral source/.test(l)) return 'source';
  if (/linkedin/.test(l) && !/why/.test(l)) return 'linkedin';
  if (/github/.test(l)) return 'github';
  if (/website|portfolio|personal.*site|other website/.test(l)) return 'website';
  if (/currently.*located|currently.*reside|where.*located|city.*state|current.*location|located in/.test(l)) return 'location';
  if (/willing.*relocate|open.*relocat|open to working|able to work.*on.?site/.test(l)) return 'relocate';
  if (/18.*years|age/.test(l)) return 'age_confirm';
  if (/previously.*employed|worked.*before|former.*employee|ever been employed|history with/.test(l)) return 'previous_employee';
  if (/pronouns/.test(l)) return 'pronouns';
  if (/salary|compensation|pay.*expect|hourly.*rate.*expect/.test(l)) return 'salary';
  if (/acknowledge|privacy.*policy|consent|agree|i understand/.test(l)) return 'acknowledge';
  if (/if other|please specify|additional info/i.test(l)) return 'skip_optional';
  if (/conflict of interest/.test(l)) return 'conflict_of_interest';
  if (/current.*employer|previous.*employer/.test(l)) return 'current_employer';
  if (/current.*job.*title|previous.*job.*title/.test(l)) return 'current_title';

  return null;
}

/**
 * Auto-answer a classified question using candidate profile data.
 * Returns the answer value or null if we can't/shouldn't answer.
 */
function autoAnswer(
  category: string,
  field: GreenhouseQuestion['fields'][0],
  candidate: CandidateSubmission
): string | number | null {
  const selectOption = (options: { label: string; value: number }[], match: RegExp): number | null => {
    const found = options.find(o => match.test(o.label.toLowerCase()));
    return found ? found.value : null;
  };

  switch (category) {
    case 'work_auth': {
      if (field.values?.length) {
        // If candidate has work_auth info, use it; default to "Yes"
        if (candidate.workAuthorized === false) return null; // Don't lie
        return selectOption(field.values, /^yes/) ?? selectOption(field.values, /citizen|authorized/);
      }
      return candidate.workAuthorized !== false ? 'Yes' : null;
    }

    case 'sponsorship': {
      if (field.values?.length) {
        if (candidate.needsSponsorship === true) return selectOption(field.values, /^yes/);
        return selectOption(field.values, /^no/);
      }
      return candidate.needsSponsorship ? 'Yes' : 'No';
    }

    case 'source': {
      if (field.values?.length) {
        // Prefer "Other" or "Website" options
        return selectOption(field.values, /other/) ?? selectOption(field.values, /website|job.*search|google/);
      }
      return 'Job board';
    }

    case 'linkedin':
      return candidate.linkedinUrl || null;

    case 'github':
      return candidate.githubUrl || null;

    case 'website':
      return candidate.personalWebsite || candidate.portfolioUrl || null;

    case 'location':
      return candidate.location || null;

    case 'relocate': {
      if (field.values?.length) {
        return selectOption(field.values, /^yes/);
      }
      return 'Yes';
    }

    case 'age_confirm': {
      if (field.values?.length) {
        return selectOption(field.values, /^yes/);
      }
      return 'Yes';
    }

    case 'previous_employee': {
      if (field.values?.length) {
        return selectOption(field.values, /^no/);
      }
      return 'No';
    }

    case 'acknowledge': {
      if (field.values?.length) {
        return selectOption(field.values, /^yes|^i agree|^i acknowledge|^i understand/);
      }
      return 'Yes';
    }

    case 'pronouns':
      return null; // Don't assume

    case 'salary':
      return null; // Don't auto-fill salary expectations

    case 'skip_optional':
      return null; // "If other, please specify" — leave blank

    case 'conflict_of_interest': {
      if (field.values?.length) {
        return selectOption(field.values, /^no/);
      }
      return 'No';
    }

    case 'current_employer':
      return null; // Could pull from resume but risky to auto-fill

    case 'current_title':
      return null; // Could pull from resume but risky to auto-fill

    default:
      return null;
  }
}

/**
 * Submit an application to a Greenhouse job board via the public API.
 * Fetches custom questions and auto-answers common ones (work auth, source, linkedin, etc.)
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

  // Build multipart form — standard fields
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

  // Fetch and auto-answer custom questions
  let questionsAnswered = 0;
  let questionsSkipped = 0;

  const questions = await fetchJobQuestions(boardToken, jobId);
  for (const q of questions) {
    for (const field of q.fields) {
      // Skip standard fields (already handled above)
      if (!field.name.startsWith('question_')) continue;

      const category = classifyQuestion(q.label);
      if (!category) {
        questionsSkipped++;
        continue;
      }

      const answer = autoAnswer(category, field, candidate);
      if (answer === null) {
        questionsSkipped++;
        continue;
      }

      form.append(field.name, String(answer));
      questionsAnswered++;
    }
  }

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
    return { success: true, applicationId: body?.id, questionsAnswered, questionsSkipped };
  }

  // Parse error from Greenhouse
  let errText = '';
  try { errText = await res.text(); } catch { /* ignore */ }
  return {
    success: false,
    error: `Greenhouse API returned ${res.status}: ${errText.slice(0, 300)}`,
    questionsAnswered,
    questionsSkipped,
  };
}
