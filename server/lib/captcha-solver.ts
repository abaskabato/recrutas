/**
 * CAPTCHA Solver — 2Captcha integration
 *
 * Solves reCAPTCHA v2, reCAPTCHA v3, and hCaptcha via the 2Captcha API.
 * API docs: https://2captcha.com/2captcha-api
 *
 * Env: TWOCAPTCHA_API_KEY
 */

const API_KEY = process.env.TWOCAPTCHA_API_KEY || '';
const API_BASE = 'https://2captcha.com';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 5s * 60 = 5 minutes max wait

export function isCaptchaSolverAvailable(): boolean {
  return API_KEY.length > 0;
}

interface SolveResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Solve reCAPTCHA v2 (visible checkbox or invisible)
 */
export async function solveRecaptchaV2(sitekey: string, pageUrl: string): Promise<SolveResult> {
  if (!API_KEY) return { success: false, error: 'TWOCAPTCHA_API_KEY not configured' };

  try {
    // Step 1: Submit task
    const submitUrl = `${API_BASE}/in.php?key=${API_KEY}&method=userrecaptcha&googlekey=${encodeURIComponent(sitekey)}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const submitRes = await fetch(submitUrl);
    const submitData = await submitRes.json() as { status: number; request: string };

    if (submitData.status !== 1) {
      return { success: false, error: `Submit failed: ${submitData.request}` };
    }

    const taskId = submitData.request;
    console.log(`[captcha-solver] Task submitted: ${taskId}`);

    // Step 2: Poll for result
    return await pollResult(taskId);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Solve reCAPTCHA v3
 */
export async function solveRecaptchaV3(sitekey: string, pageUrl: string, action = 'submit', minScore = 0.3): Promise<SolveResult> {
  if (!API_KEY) return { success: false, error: 'TWOCAPTCHA_API_KEY not configured' };

  try {
    const submitUrl = `${API_BASE}/in.php?key=${API_KEY}&method=userrecaptcha&googlekey=${encodeURIComponent(sitekey)}&pageurl=${encodeURIComponent(pageUrl)}&version=v3&action=${encodeURIComponent(action)}&min_score=${minScore}&json=1`;
    const submitRes = await fetch(submitUrl);
    const submitData = await submitRes.json() as { status: number; request: string };

    if (submitData.status !== 1) {
      return { success: false, error: `Submit failed: ${submitData.request}` };
    }

    const taskId = submitData.request;
    console.log(`[captcha-solver] reCAPTCHA v3 task submitted: ${taskId}`);

    return await pollResult(taskId);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Solve hCaptcha
 */
export async function solveHCaptcha(sitekey: string, pageUrl: string): Promise<SolveResult> {
  if (!API_KEY) return { success: false, error: 'TWOCAPTCHA_API_KEY not configured' };

  try {
    const submitUrl = `${API_BASE}/in.php?key=${API_KEY}&method=hcaptcha&sitekey=${encodeURIComponent(sitekey)}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const submitRes = await fetch(submitUrl);
    const submitData = await submitRes.json() as { status: number; request: string };

    if (submitData.status !== 1) {
      return { success: false, error: `Submit failed: ${submitData.request}` };
    }

    const taskId = submitData.request;
    console.log(`[captcha-solver] hCaptcha task submitted: ${taskId}`);

    return await pollResult(taskId);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Poll 2Captcha for task result
 */
async function pollResult(taskId: string): Promise<SolveResult> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const resultUrl = `${API_BASE}/res.php?key=${API_KEY}&action=get&id=${taskId}&json=1`;
    const res = await fetch(resultUrl);
    const data = await res.json() as { status: number; request: string };

    if (data.status === 1) {
      console.log(`[captcha-solver] Solved in ${(i + 1) * POLL_INTERVAL_MS / 1000}s`);
      return { success: true, token: data.request };
    }

    if (data.request !== 'CAPCHA_NOT_READY') {
      return { success: false, error: `Solve failed: ${data.request}` };
    }
  }

  return { success: false, error: 'Timeout waiting for CAPTCHA solution' };
}
