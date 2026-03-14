/**
 * Email utility using Resend.
 * No-op when RESEND_API_KEY is not set (dev/test environments).
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const FROM = 'Recrutas <hello@recrutas.ai>';

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email to', opts.to);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err.slice(0, 200)}`);
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

export function matchesReadyEmail(candidateName: string, matchCount: number): string {
  const greeting = candidateName ? `Hi ${candidateName.split(' ')[0]},` : 'Hi,';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: #059669; padding: 32px 40px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Recrutas</h1>
      <p style="color: #a7f3d0; margin: 4px 0 0; font-size: 14px;">Job Search Reinvented</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 40px;">
      <p style="color: #111827; font-size: 16px; margin: 0 0 8px;">${greeting}</p>
      <p style="color: #111827; font-size: 16px; margin: 0 0 24px;">
        Your resume has been analyzed and we found
        <strong>${matchCount} job${matchCount !== 1 ? 's' : ''}</strong> that match your skills and experience.
      </p>

      <a href="https://www.recrutas.ai/candidate"
         style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        View Your Matches →
      </a>

      <div style="margin: 32px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #059669;">
        <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">What makes Recrutas different</p>
        <p style="margin: 8px 0 0; color: #047857; font-size: 14px;">
          Every internal job comes with a guaranteed response within 24 hours. No ghosting.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin: 0;">
        You're receiving this because you uploaded a resume to Recrutas.<br>
        <a href="https://www.recrutas.ai" style="color: #059669;">recrutas.ai</a>
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}
