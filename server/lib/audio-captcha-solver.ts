/**
 * Free reCAPTCHA v2 Audio Solver
 *
 * Solves reCAPTCHA v2 by:
 * 1. Switching to the audio challenge
 * 2. Downloading the audio clip
 * 3. Transcribing via Groq Whisper (open-source, uses existing GROQ_API_KEY)
 * 4. Typing the answer and verifying
 *
 * Env: GROQ_API_KEY (already set for other services)
 */

import type { Page, Frame } from 'rebrowser-playwright';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export function isAudioSolverAvailable(): boolean {
  return GROQ_API_KEY.length > 0;
}

interface AudioSolveResult {
  success: boolean;
  error?: string;
}

/**
 * Solve reCAPTCHA v2 on a page using the audio challenge + Groq Whisper
 */
export async function solveRecaptchaViaAudio(
  page: Page,
  addLog?: (action: string, result: string) => void,
): Promise<AudioSolveResult> {
  const log = addLog || (() => {});

  if (!GROQ_API_KEY) {
    return { success: false, error: 'GROQ_API_KEY not configured' };
  }

  try {
    // Find the reCAPTCHA iframe (the checkbox one)
    const recaptchaFrame = await findRecaptchaFrame(page);
    if (!recaptchaFrame) {
      return { success: false, error: 'Could not find reCAPTCHA iframe' };
    }

    // Click the checkbox to trigger the challenge
    const checkbox = await recaptchaFrame.$('#recaptcha-anchor');
    if (checkbox) {
      await checkbox.click();
      log('audio_solver', 'Clicked reCAPTCHA checkbox');
      await page.waitForTimeout(2000);
    }

    // Check if it was solved immediately (low-risk score)
    const alreadySolved = await recaptchaFrame.$('.recaptcha-checkbox-checked');
    if (alreadySolved) {
      log('audio_solver', 'reCAPTCHA solved without challenge (low risk score)');
      return { success: true };
    }

    // Find the challenge iframe (opens after clicking checkbox)
    const challengeFrame = await findChallengeFrame(page);
    if (!challengeFrame) {
      return { success: false, error: 'Could not find reCAPTCHA challenge iframe' };
    }

    // Switch to audio challenge
    const audioButton = await challengeFrame.$('#recaptcha-audio-button');
    if (!audioButton) {
      return { success: false, error: 'Audio challenge button not found' };
    }
    await audioButton.click();
    log('audio_solver', 'Switched to audio challenge');
    await page.waitForTimeout(2000);

    // Check for rate limit / "try again later"
    const errorMsg = await challengeFrame.$('.rc-audiochallenge-error-message');
    if (errorMsg) {
      const text = await errorMsg.textContent();
      if (text && text.includes('Try again later')) {
        return { success: false, error: 'reCAPTCHA rate limited: "Try again later"' };
      }
    }

    // Get the audio download link
    const downloadLink = await challengeFrame.$('.rc-audiochallenge-tdownload-link');
    if (!downloadLink) {
      return { success: false, error: 'Audio download link not found' };
    }
    const audioUrl = await downloadLink.getAttribute('href');
    if (!audioUrl) {
      return { success: false, error: 'Audio URL is empty' };
    }
    log('audio_solver', 'Got audio challenge URL');

    // Download the audio
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return { success: false, error: `Failed to download audio: ${audioResponse.status}` };
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    log('audio_solver', `Downloaded audio: ${audioBuffer.length} bytes`);

    // Transcribe via Groq Whisper
    const transcript = await transcribeWithGroqWhisper(audioBuffer);
    if (!transcript) {
      return { success: false, error: 'Groq Whisper returned empty transcription' };
    }
    log('audio_solver', `Transcribed: "${transcript}"`);

    // Type the answer
    const responseInput = await challengeFrame.$('#audio-response');
    if (!responseInput) {
      return { success: false, error: 'Audio response input field not found' };
    }
    await responseInput.click();
    // Type like a human — with small delays between characters
    await responseInput.type(transcript, { delay: 50 + Math.random() * 80 });
    await page.waitForTimeout(500);

    // Click verify
    const verifyButton = await challengeFrame.$('#recaptcha-verify-button');
    if (!verifyButton) {
      return { success: false, error: 'Verify button not found' };
    }
    await verifyButton.click();
    log('audio_solver', 'Clicked verify');
    await page.waitForTimeout(3000);

    // Check result — the checkbox frame should now show checked
    const solvedCheck = await recaptchaFrame.$('.recaptcha-checkbox-checked');
    if (solvedCheck) {
      log('audio_solver', 'reCAPTCHA solved successfully');
      return { success: true };
    }

    // Check if there's a new challenge (wrong answer)
    const newChallenge = await challengeFrame.$('.rc-audiochallenge-error-message');
    if (newChallenge) {
      const text = await newChallenge.textContent();
      return { success: false, error: `Verification failed: ${text}` };
    }

    // Might still be processing — give it another moment
    await page.waitForTimeout(2000);
    const finalCheck = await recaptchaFrame.$('.recaptcha-checkbox-checked');
    if (finalCheck) {
      log('audio_solver', 'reCAPTCHA solved successfully (delayed)');
      return { success: true };
    }

    return { success: false, error: 'Could not verify solution' };
  } catch (err: any) {
    return { success: false, error: `Audio solver exception: ${err.message}` };
  }
}

/**
 * Find the reCAPTCHA anchor iframe (contains the checkbox)
 */
async function findRecaptchaFrame(page: Page): Promise<Frame | null> {
  const frames = page.frames();
  for (const frame of frames) {
    const url = frame.url();
    if (url.includes('google.com/recaptcha') && url.includes('anchor')) {
      return frame;
    }
  }
  return null;
}

/**
 * Find the reCAPTCHA challenge iframe (contains audio/image challenge)
 */
async function findChallengeFrame(page: Page): Promise<Frame | null> {
  // Wait a moment for the challenge frame to appear
  await new Promise(r => setTimeout(r, 1000));
  const frames = page.frames();
  for (const frame of frames) {
    const url = frame.url();
    if (url.includes('google.com/recaptcha') && url.includes('bframe')) {
      return frame;
    }
  }
  return null;
}

/**
 * Transcribe audio using Groq Whisper API (open-source model, free tier)
 */
async function transcribeWithGroqWhisper(audioBuffer: Buffer): Promise<string | null> {
  // Groq's audio transcription endpoint expects multipart/form-data
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/mp3' }), 'audio.mp3');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  formData.append('language', 'en');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    console.error(`[audio-solver] Groq Whisper error: ${response.status} ${await response.text()}`);
    return null;
  }

  const result = await response.json() as { text?: string };
  if (result.text) {
    // Clean up: reCAPTCHA expects digits/words, remove punctuation
    return result.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  }

  return null;
}
