/**
 * Agent Apply Service
 *
 * Playwright-based browser automation that navigates to career pages,
 * fills application forms using rule-based field mapping + Ollama AI fallback,
 * and submits applications on behalf of candidates.
 */

import { chromium, type Page, type Browser, type BrowserContext, type BrowserContextOptions, type LaunchOptions } from 'rebrowser-playwright';
import type { AgentTask } from '../../shared/schema';
import { isCaptchaSolverAvailable, solveRecaptchaV2, solveRecaptchaV3, solveHCaptcha } from '../lib/captcha-solver';
import { solveRecaptchaViaAudio } from '../lib/audio-captcha-solver';

// ==========================================
// TYPES
// ==========================================

interface CandidateData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  skills: string[];
  experience: string;
  location: string;
}

interface FieldMapping {
  matched: Record<string, string>;
  unmatched: string[];
  fileUploadSelector?: string;
}

interface AgentLogEntry {
  timestamp: string;
  action: string;
  result: string;
  screenshot?: string;
}

interface ProcessResult {
  success: boolean;
  log: AgentLogEntry[];
  error?: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

// Proxy rotation - can be configured via environment variables
// Format: PROXY_LIST = "ip:port:username:password,ip:port:username:password"
// Or use residential proxy services like Bright Data, SmartProxy
const PROXY_LIST = (process.env.PROXY_LIST || '').split(',').filter(Boolean);
let proxyIndex = 0;

function getNextProxy(): { server: string; username?: string; password?: string } | null {
  if (PROXY_LIST.length === 0) {return null;}
  
  const proxy = PROXY_LIST[proxyIndex % PROXY_LIST.length];
  proxyIndex++;
  
  const parts = proxy.split(':');
  if (parts.length >= 2) {
    return {
      server: `http://${parts[0]}:${parts[1]}`,
      username: parts[2],
      password: parts[3],
    };
  }
  return null;
}

/** Pattern dictionary: regex → candidate data field */
const FIELD_PATTERNS: Array<{ pattern: RegExp; field: keyof CandidateData | 'fullName' | 'resume' | 'coverLetter' }> = [
  { pattern: /first.?name|fname|given.?name/i, field: 'firstName' },
  { pattern: /last.?name|lname|surname|family.?name/i, field: 'lastName' },
  { pattern: /^name$|full.?name|your.?name|candidate.?name/i, field: 'fullName' },
  { pattern: /email|e-mail|email.?address/i, field: 'email' },
  { pattern: /phone|telephone|mobile|cell|tel\b/i, field: 'phone' },
  { pattern: /linkedin|linked.?in/i, field: 'linkedinUrl' },
  { pattern: /github/i, field: 'githubUrl' },
  { pattern: /portfolio|website|personal.?url|your.?url/i, field: 'portfolioUrl' },
  { pattern: /resume|cv|attachment/i, field: 'resume' },
  { pattern: /cover.?letter/i, field: 'coverLetter' },
  { pattern: /location|city|address/i, field: 'location' },
];

/** ATS-specific selectors */
const ATS_SELECTORS = {
  greenhouse: {
    firstName: '#first_name, #s_firstname, [name="job_application[first_name]"]',
    lastName: '#last_name, #s_lastname, [name="job_application[last_name]"]',
    email: '#email, #s_email, [name="job_application[email]"]',
    phone: '#phone, #s_phone, [name="job_application[phone]"]',
    resume: '#resume, #s_resume, input[type="file"][name*="resume"]',
    linkedin: '[name="job_application[urls][LinkedIn]"], [placeholder*="LinkedIn"]',
    submitBtn: '#submit_app, button[type="submit"]',
  },
  lever: {
    firstName: '[name="name"]',
    email: '[name="email"]',
    phone: '[name="phone"]',
    resume: '[name="resume"], input[type="file"]',
    linkedin: '[name="urls[LinkedIn]"], [placeholder*="LinkedIn"]',
    submitBtn: 'button[type="submit"], .postings-btn-submit',
  },
  workday: {
    iframeSelector: 'iframe[src*="myworkday"], iframe[src*="workday"]',
  },
  linkedin: {
    // LinkedIn Easy Apply selectors
    firstName: '#first-name, input[name="firstName"]',
    lastName: '#last-name, input[name="lastName"]',
    email: '#email, input[name="emailAddress"]',
    phone: '#phone-number, input[name="phoneNumber"]',
    resume: 'input[type="file"][name*="resume"], input[type="file"][id*="resume"]',
    linkedin: 'input[name="linkedinUrl"], input[id="linkedin"]',
    submitBtn: 'button[aria-label="Submit application"], button[data-control-name="submit_unnamed"]',
    easyApplyBtn: 'button[aria-label="Easy Apply to this job"], button[data-control-name="EasyApply"]',
    nextBtn: 'button[aria-label="Continue to next step"], button[data-control-name="continue"]',
  },
};

// ==========================================
// AGENT APPLY SERVICE
// ==========================================

export class AgentApplyService {
  /**
   * Main entry point: process a single agent task
   */
  async processTask(task: AgentTask): Promise<ProcessResult> {
    const log: AgentLogEntry[] = [];
    let browser: Browser | null = null;

    const addLog = (action: string, result: string, screenshot?: string) => {
      log.push({ timestamp: new Date().toISOString(), action, result, screenshot });
    };

    // Try to use proxy with fallback to no proxy
    const proxy = getNextProxy();
    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
      ],
    };

    // Add proxy if available
    if (proxy) {
      launchOptions.proxy = {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
      };
      addLog('proxy', `Using proxy: ${proxy.server}`);
    } else {
      addLog('proxy', 'No proxy configured, using direct connection');
    }

    try {
      addLog('launch_browser', 'Starting Playwright chromium (stealth mode)');
      browser = await chromium.launch(launchOptions);

      const context = await browser.newContext({
        userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      // Fix 1: Stealth — patch navigator.webdriver and remove CDP fingerprints
      // Using string form to avoid TypeScript errors (this runs in browser context)
      await context.addInitScript(`
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        // Remove Chrome DevTools Protocol automation artifacts
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        // Make chrome object look real
        if (!window.chrome) {
          window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
        }
      `);

      const page = await context.newPage();
      const candidateData = task.candidateData as CandidateData;

      // Fix 3: Resolve a fresh resume URL at execution time (stored URL may be expired)
      const resumeUrl = await this.getFreshResumeUrl(task.resumeUrl);
      if (resumeUrl) {
        addLog('resume_url', `Resume URL resolved (${resumeUrl.substring(0, 60)}...)`);
      } else {
        addLog('resume_url', `WARNING: Could not resolve resume URL from stored key: ${task.resumeUrl}`);
      }

      // Navigate to career page
      addLog('navigate', `Navigating to ${task.externalUrl}`);
      await page.goto(task.externalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const initialUrl = page.url();

      // Fix 2: Wait for network to settle (SPAs render forms after domcontentloaded)
      // networkidle timeout is normal for SPAs — intentionally non-fatal
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForSelector('input, textarea, select, button', { timeout: 8000 })
        .catch(() => { addLog('wait_fields', 'No interactive fields found within 8s after initial load — page may not be fully rendered'); });
      await this.randomDelay(800, 1500);

      // Check for CAPTCHA after initial load
      // Invisible reCAPTCHA (Enterprise or v3) doesn't block form interaction —
      // it scores on submit. Only block on visible CAPTCHAs (hcaptcha, cloudflare, etc.)
      const captcha = await this.detectCaptcha(page);
      if (captcha.detected) {
        const isInvisible = await this.isInvisibleRecaptcha(page);
        if (isInvisible) {
          addLog('captcha_detected', `Invisible reCAPTCHA detected — proceeding (scores on submit)`);
        } else {
          addLog('captcha_detected', `CAPTCHA detected: ${captcha.type}`);
          const solved = await this.solveCaptcha(page, captcha.type, task.externalUrl, addLog);
          if (!solved) {
            const screenshot = await this.takeScreenshot(page);
            addLog('captcha_blocked', `Failed to solve ${captcha.type}`, screenshot);
            return { success: false, log, error: `captcha_blocked_${captcha.type}` };
          }
          addLog('captcha_solved', `Successfully solved ${captcha.type}`);
        }
      }

      // Fix 5: Dismiss cookie banners/consent overlays before interacting
      await this.dismissCookieBanners(page);

      // Detect application form or find apply button
      let formFound = await this.detectForm(page);
      if (!formFound) {
        addLog('find_apply_button', 'No form found, looking for Apply button');
        const clicked = await this.clickApplyButton(page);
        if (clicked) {
          // Wait for SPA navigation to complete after clicking Apply
          // networkidle timeout is normal for SPAs — intentionally non-fatal
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await page.waitForSelector('input, textarea', { timeout: 8000 })
            .catch(() => { addLog('wait_fields', 'No form fields found within 8s after clicking Apply button'); });
          await this.randomDelay(1000, 2000);
          await this.dismissCookieBanners(page);
          formFound = await this.detectForm(page);
        }
      }

      if (!formFound) {
        addLog('form_not_found', 'Could not find application form');
        const screenshot = await this.takeScreenshot(page);
        addLog('screenshot', 'Captured page state', screenshot);
        return { success: false, log, error: 'form_not_found' };
      }
      addLog('form_detected', 'Application form found');

      // Detect ATS type
      const atsType = await this.detectATS(page);
      addLog('ats_detection', `Detected ATS: ${atsType || 'unknown'}`);

      // Handle Workday iframe — wait for it to fully load
      let activePage: Page | any = page;
      if (atsType === 'workday') {
        await page.waitForSelector(ATS_SELECTORS.workday.iframeSelector, { timeout: 10000 })
          .catch(() => { addLog('workday_iframe_wait', 'Workday iframe selector not found within 10s — may affect form detection'); });
        const iframe = await page.$(ATS_SELECTORS.workday.iframeSelector);
        if (iframe) {
          const frame = await iframe.contentFrame();
          if (frame) {
            // networkidle timeout is normal for SPAs — intentionally non-fatal
            await frame.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            activePage = frame;
            addLog('workday_iframe', 'Switched to Workday iframe context');
          }
        }
      }

      // Fix 4: Multi-step form loop — keep filling and advancing until submitted or confirmed
      let stepCount = 0;
      const MAX_STEPS = 6;
      let finalSubmitted = false;
      let previousUrl = initialUrl;

      while (stepCount < MAX_STEPS) {
        stepCount++;

        // On first step, check for initial "Apply for this role" button and click it first
        if (stepCount === 1) {
          const initialApplyBtn = await activePage.$('button:has-text("Apply for this role"), a:has-text("Apply for this role")');
          if (initialApplyBtn && await initialApplyBtn.isVisible()) {
            addLog('step_0_initial_apply', 'Clicking initial "Apply for this role" button');
            await initialApplyBtn.click();
            // Wait for the actual form to load
            // networkidle timeout is normal for SPAs — intentionally non-fatal
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            await page.waitForSelector('form input, form textarea, form select', { timeout: 8000 })
              .catch(() => { addLog('wait_fields', 'No form fields found within 8s after clicking "Apply for this role"'); });
            await this.randomDelay(1000, 2000);
            // Restart the loop with the loaded form
            continue;
          }
        }

        // Analyse and fill the current page/step
        const fieldMap = await this.analyzeFormRuleBased(activePage, candidateData, atsType);
        addLog(`step_${stepCount}_analysis`, `Matched ${Object.keys(fieldMap.matched).length} fields, ${fieldMap.unmatched.length} unmatched`);

        if (fieldMap.unmatched.length > 0) {
          const ollamaMap = await this.analyzeFormOllama(activePage, fieldMap.unmatched, candidateData);
          Object.assign(fieldMap.matched, ollamaMap);
          if (Object.keys(ollamaMap).length > 0) {
            addLog(`step_${stepCount}_ollama`, `Ollama resolved ${Object.keys(ollamaMap).length} additional fields`);
          }
        }

        if (Object.keys(fieldMap.matched).length > 0) {
          addLog(`step_${stepCount}_fill`, 'Filling form fields');
          await this.fillForm(activePage, fieldMap.matched);
        }

        if (fieldMap.fileUploadSelector && resumeUrl) {
          addLog(`step_${stepCount}_resume`, 'Uploading resume');
          await this.handleResumeUpload(activePage, fieldMap.fileUploadSelector, resumeUrl);
        } else if (fieldMap.fileUploadSelector && !resumeUrl) {
          addLog(`step_${stepCount}_resume_skip`, 'Resume upload selector found but no resume URL available — submission may fail');
        }

        // Handle screening questions (knockout questions)
        await this.handleScreeningQuestions(activePage, addLog);

        // Click Next or Submit
        addLog(`step_${stepCount}_advance`, 'Advancing form (Next/Submit)');
        
        // Wait for form to be ready — domcontentloaded is fast; timeout unlikely but non-fatal
        await activePage.waitForLoadState('domcontentloaded').catch(() => {});
        await this.randomDelay(500, 1000);

        const advanced = await this.advanceForm(activePage, atsType);
        if (!advanced) {
          addLog(`step_${stepCount}_no_button`, 'No Next/Submit button found');
          break;
        }

        // Wait for the result of the click — networkidle timeout is normal for SPAs
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.randomDelay(1500, 2500);

        // Check for CAPTCHA that appears after clicking submit
        // Skip invisible reCAPTCHA — it scored silently during submit
        const postSubmitCaptcha = await this.detectCaptcha(page);
        if (postSubmitCaptcha.detected && !(await this.isInvisibleRecaptcha(page))) {
          addLog(`step_${stepCount}_captcha`, `CAPTCHA appeared after submit: ${postSubmitCaptcha.type}`);
          const solved = await this.solveCaptcha(page, postSubmitCaptcha.type, page.url(), addLog);
          if (solved) {
            addLog(`step_${stepCount}_captcha_solved`, 'Post-submit CAPTCHA solved, re-submitting');
            // Re-click submit after CAPTCHA solve
            await this.advanceForm(activePage, atsType);
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            await this.randomDelay(1500, 2500);
          } else {
            const screenshot = await this.takeScreenshot(page);
            addLog(`step_${stepCount}_captcha_failed`, `Could not solve ${postSubmitCaptcha.type}`, screenshot);
            return { success: false, log, error: `captcha_blocked_${postSubmitCaptcha.type}` };
          }
        }

        // Check URL change - some forms navigate to a new page on submit
        const currentUrl = page.url();
        if (currentUrl !== initialUrl) {
          addLog(`step_${stepCount}_url_change`, `URL changed: ${currentUrl.substring(0, 50)}...`);
        }

        // Check if we've reached a confirmation page (submitted)
        if (await this.verifySubmission(page)) {
          finalSubmitted = true;
          addLog(`step_${stepCount}_confirmed`, 'Submission confirmed on this step');
          break;
        }

        // Check if the form is gone (likely navigated away post-submit)
        const stillOnForm = await this.detectForm(activePage);
        if (!stillOnForm) {
          finalSubmitted = true;
          addLog(`step_${stepCount}_form_gone`, 'Form no longer present — likely submitted');
          break;
        }

        addLog(`step_${stepCount}_next_page`, 'Form still present, advancing to next step');
        
        // Track URL progression - if URL changed, we're making progress
        if (page.url() !== previousUrl) {
          previousUrl = page.url();
          addLog(`step_${stepCount}_progress`, 'URL changed - form is progressing');
        }
      }

      if (!finalSubmitted && stepCount >= MAX_STEPS) {
        const screenshot = await this.takeScreenshot(page);
        addLog('max_steps_reached', `Reached ${MAX_STEPS} steps without confirmation`, screenshot);
        return { success: false, log, error: 'max_steps_reached' };
      }

      if (!finalSubmitted) {
        const screenshot = await this.takeScreenshot(page);
        addLog('submit_failed', 'Could not complete submission', screenshot);
        return { success: false, log, error: 'submission_failed' };
      }

      const screenshot = await this.takeScreenshot(page);
      addLog('complete', 'Application submitted successfully', screenshot);
      return { success: true, log };

    } catch (error: any) {
      addLog('error', error.message);
      return { success: false, log, error: error.message };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Fix 3: Generate a fresh Supabase signed URL for the resume.
   * The stored URL may have an expired token (signed URLs have short TTLs).
   */
  private async getFreshResumeUrl(storedUrl: string | null | undefined): Promise<string | null> {
    if (!storedUrl) {return null;}

    try {
      const { getSupabaseAdmin } = await import('../lib/supabase-admin.js');
      const supabase = getSupabaseAdmin();

      // Case 1: Full URL — extract storage path from it
      // Format: .../storage/v1/object/(sign|public)/resumes/<path>
      const match = storedUrl.match(/\/object\/(?:sign|public)\/([^?]+)/);
      if (match) {
        const fullPath = match[1]; // e.g. "resumes/user-id/resume.pdf"
        const [bucket, ...pathParts] = fullPath.split('/');
        const filePath = pathParts.join('/');
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 300);
        if (!error && data?.signedUrl) return data.signedUrl;
        console.log(`[AgentApply] getFreshResumeUrl Case 1 error: ${error?.message}`);
        return storedUrl; // Fall back to original URL
      }

      // Case 2: Storage key only (e.g. "resume-1773728149253-mtkql4a73f")
      // Try the "resumes" bucket with the key as the file path
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(storedUrl, 300);
      if (!error && data?.signedUrl) return data.signedUrl;
      console.log(`[AgentApply] getFreshResumeUrl Case 2 error: ${error?.message}`);

      return null;
    } catch (e: any) {
      console.error(`[AgentApply] getFreshResumeUrl exception: ${e.message}`);
      return null;
    }
  }

  // ==========================================
  // CAPTCHA DETECTION
  // ==========================================

  private async detectCaptcha(page: Page): Promise<{ type: string; detected: boolean }> {
    const html = await page.content();
    
    // Check for various CAPTCHA types
    const captchaChecks = [
      { type: 'hcaptcha', pattern: /hcaptcha|data-sitekey.*hcaptcha|h-captcha/i },
      { type: 'recaptcha', pattern: /google\.com\/recaptcha|recaptcha|v2.*invisible|data-sitekey.*recaptcha/i },
      { type: 'cloudflare', pattern: /cloudflare|challenge|checking your browser before accessing/i },
      { type: 'akamai', pattern: /akamai|bot detection|security check/i },
      { type: 'perimeterx', pattern: /perimeterx|px-auth/i },
      { type: 'cf_challenge', pattern: /cf_challenge|__cf_challenge_js|Cloudflare/i },
    ];

    for (const check of captchaChecks) {
      if (check.pattern.test(html)) {
        return { type: check.type, detected: true };
      }
    }

    // Also check for specific elements
    const captchaSelectors = [
      '[data-sitekey]',
      '.g-recaptcha',
      '#recaptcha',
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.hcaptcha',
      '[id*="captcha"]',
      '[class*="captcha"]',
    ];

    for (const selector of captchaSelectors) {
      const el = await page.$(selector);
      if (el && await el.isVisible()) {
        const type = selector.includes('hcaptcha') ? 'hcaptcha' : 'recaptcha';
        return { type, detected: true };
      }
    }

    return { type: 'none', detected: false };
  }

  /**
   * Check if the reCAPTCHA on the page is invisible (Enterprise/v3/invisible v2).
   * Invisible reCAPTCHA doesn't block form interaction — it scores on submit.
   */
  private async isInvisibleRecaptcha(page: Page): Promise<boolean> {
    return page.evaluate(() => {
      // Check for grecaptcha-badge (invisible reCAPTCHA indicator)
      if (document.querySelector('.grecaptcha-badge')) return true;
      // Check for invisible iframe (size=invisible in src)
      const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
      for (const f of iframes) {
        if ((f as HTMLIFrameElement).src.includes('size=invisible') ||
            (f as HTMLIFrameElement).src.includes('size=invisibl')) return true;
      }
      // Check for reCAPTCHA Enterprise script (render= mode is always invisible)
      const scripts = document.querySelectorAll('script[src*="recaptcha/enterprise"]');
      if (scripts.length > 0) return true;
      // Check data-size="invisible" on g-recaptcha element
      const el = document.querySelector('.g-recaptcha[data-size="invisible"]');
      if (el) return true;
      return false;
    });
  }

  // ==========================================
  // CAPTCHA SOLVING
  // ==========================================

  private async solveCaptcha(
    page: Page,
    captchaType: string,
    pageUrl: string,
    addLog: (action: string, result: string, screenshot?: string) => void,
  ): Promise<boolean> {
    // Strategy 1: Free audio solver for reCAPTCHA v2 (Wit.ai — $0)
    if (captchaType === 'recaptcha') {
      const { isAudioSolverAvailable } = await import('../lib/audio-captcha-solver');
      if (isAudioSolverAvailable()) {
        addLog('captcha_solver', 'Trying free audio solver (Wit.ai)...');
        const audioResult = await solveRecaptchaViaAudio(page, addLog);
        if (audioResult.success) return true;
        addLog('captcha_solver', `Audio solver failed: ${audioResult.error} — trying next strategy`);
      }
    }

    // Strategy 2: Paid 2Captcha fallback (if configured)
    if (!isCaptchaSolverAvailable()) {
      addLog('captcha_solver', 'No TWOCAPTCHA_API_KEY configured and audio solver unavailable');
      return false;
    }

    try {
      // Extract sitekey from the page
      const sitekey = await page.evaluate(() => {
        // Check data-sitekey attribute (used by both reCAPTCHA and hCaptcha)
        const el = document.querySelector('[data-sitekey]');
        if (el) return el.getAttribute('data-sitekey');

        // Check reCAPTCHA iframe src for sitekey
        const recaptchaIframe = document.querySelector('iframe[src*="recaptcha"]') as HTMLIFrameElement;
        if (recaptchaIframe) {
          const match = recaptchaIframe.src.match(/[?&]k=([^&]+)/);
          if (match) return match[1];
        }

        // Check hCaptcha iframe src
        const hcaptchaIframe = document.querySelector('iframe[src*="hcaptcha"]') as HTMLIFrameElement;
        if (hcaptchaIframe) {
          const match = hcaptchaIframe.src.match(/sitekey=([^&]+)/);
          if (match) return match[1];
        }

        // Check for grecaptcha.enterprise or grecaptcha render params in scripts
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          const match = text.match(/sitekey['":\s]+['"]([a-zA-Z0-9_-]{40})['"]/);
          if (match) return match[1];
        }

        return null;
      });

      if (!sitekey) {
        addLog('captcha_solver', 'Could not extract sitekey from page');
        return false;
      }

      addLog('captcha_solver', `Extracted sitekey: ${sitekey.substring(0, 20)}... — sending to 2Captcha`);

      // Solve based on type
      let result;
      if (captchaType === 'hcaptcha') {
        result = await solveHCaptcha(sitekey, pageUrl);
      } else {
        // Try v2 first (most common on ATS forms)
        result = await solveRecaptchaV2(sitekey, pageUrl);
      }

      if (!result.success || !result.token) {
        addLog('captcha_solver', `Solve failed: ${result.error}`);
        return false;
      }

      // Inject the solution token into the page
      if (captchaType === 'hcaptcha') {
        await page.evaluate((token: string) => {
          // Set the hCaptcha response textarea
          const textarea = document.querySelector('[name="h-captcha-response"]') as HTMLTextAreaElement
            || document.querySelector('textarea[name*="hcaptcha"]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.value = token;
            textarea.style.display = 'block';
          }
          // Also set data attribute and trigger callback
          const el = document.querySelector('.h-captcha') || document.querySelector('[data-sitekey]');
          if (el) el.setAttribute('data-hcaptcha-response', token);
          // Trigger hCaptcha callback if registered
          if ((window as any).hcaptcha) {
            try { (window as any).hcaptcha.execute(); } catch { /* best-effort */ }
          }
        }, result.token);
      } else {
        // reCAPTCHA v2 — inject into g-recaptcha-response textarea and trigger callback
        await page.evaluate((token: string) => {
          // Set the response textarea (reCAPTCHA creates a hidden one)
          const textarea = document.querySelector('#g-recaptcha-response') as HTMLTextAreaElement
            || document.querySelector('[name="g-recaptcha-response"]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.value = token;
            textarea.style.display = 'block';
          }

          // Also set any additional response textareas (some forms have multiple)
          document.querySelectorAll('textarea[name="g-recaptcha-response"]').forEach((el) => {
            (el as HTMLTextAreaElement).value = token;
          });

          // Trigger the reCAPTCHA callback if one is registered
          if ((window as any).___grecaptcha_cfg?.clients) {
            const clients = (window as any).___grecaptcha_cfg.clients;
            for (const key of Object.keys(clients)) {
              const client = clients[key];
              // Walk the client object to find the callback
              const walk = (obj: any, depth: number): void => {
                if (depth > 5 || !obj) return;
                for (const k of Object.keys(obj)) {
                  if (typeof obj[k] === 'function' && k.length < 3) {
                    try { obj[k](token); } catch { /* best-effort */ }
                  }
                  if (typeof obj[k] === 'object') walk(obj[k], depth + 1);
                }
              };
              walk(client, 0);
            }
          }

          // Also try the global grecaptcha callback
          if ((window as any).grecaptcha) {
            try {
              const response = (window as any).grecaptcha.getResponse();
              if (!response) {
                // Callback-based approach
                const cb = document.querySelector('.g-recaptcha')?.getAttribute('data-callback');
                if (cb && typeof (window as any)[cb] === 'function') {
                  (window as any)[cb](token);
                }
              }
            } catch { /* best-effort */ }
          }
        }, result.token);
      }

      // Wait a moment for the form to react to the solved CAPTCHA
      await this.randomDelay(1000, 2000);

      // Verify CAPTCHA is no longer blocking
      const recheck = await this.detectCaptcha(page);
      // Even if CAPTCHA elements are still in DOM, the token is injected — proceed
      addLog('captcha_solver', `Token injected. CAPTCHA elements still visible: ${recheck.detected}`);
      return true;
    } catch (err: any) {
      addLog('captcha_solver', `Exception: ${err.message}`);
      return false;
    }
  }

  // ==========================================
  // FORM DETECTION
  // ==========================================

  private async detectForm(page: Page): Promise<boolean> {
    const formSelectors = [
      'form[action*="apply"]',
      'form[action*="application"]',
      'form[id*="apply"]',
      'form[id*="application"]',
      'form[class*="apply"]',
      'form[class*="application"]',
      '#application-form',
      '.application-form',
      'form:has(input[type="file"])',
      'form:has(input[name*="email"])',
    ];

    for (const selector of formSelectors) {
      const el = await page.$(selector);
      if (el) {return true;}
    }

    // Fallback: look for a form with multiple inputs
    const forms = await page.$$('form');
    for (const form of forms) {
      const inputs = await form.$$('input, textarea, select');
      if (inputs.length >= 3) {return true;}
    }
    return false;
  }

  private async clickApplyButton(page: Page): Promise<boolean> {
    const applySelectors = [
      'a[href*="apply"]',
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      '[data-qa="apply-button"]',
      '.apply-button',
      '#apply-button',
    ];

    for (const selector of applySelectors) {
      try {
        const el = await page.$(selector);
        if (el && await el.isVisible()) {
          await el.click();
          // domcontentloaded timeout is unlikely but non-fatal — page may already be loaded
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
          return true;
        }
      } catch { /* continue */ }
    }
    return false;
  }

  // ==========================================
  // SCREENING QUESTIONS HANDLING
  // ==========================================

  /**
   * Handle screening questions / knockout questions
   * These are typically yes/no or multiple choice questions that can disqualify you
   */
  private async handleScreeningQuestions(
    page: Page,
    addLog: (action: string, result: string, screenshot?: string) => void
  ): Promise<boolean> {
    // Look for common screening question patterns
    const questionSelectors = [
      'label:has(input[type="radio"])',
      'label:has(input[type="checkbox"])',
      '.screening-question',
      '[data-screening]',
      '.knockout-question',
    ];

    const radioGroups = await page.$$('fieldset, .question-group, [role="group"]');
    
    for (const group of radioGroups) {
      try {
        // Get question text
        const questionText = await group.textContent();
        if (!questionText) {continue;}

        // Check if it's a knockout question
        const isRequired = await group.$('input[required], input[aria-required="true"]');
        
        // Look for radio buttons or checkboxes
        const options = await group.$$('input[type="radio"], input[type="checkbox"]');
        
        if (options.length > 0 && questionText.length < 500) {
          // Try to find the "safe" answer
          const lowerText = questionText.toLowerCase();
          
          // Common screening questions - try to answer yes/true where it helps
          const preferredAnswers: Array<[RegExp, number]> = [
            // Work authorization - say yes
            [/authorized|work.*(to )?(work)|legally.*(to )?(work)/i, 0], // First option usually "Yes"
            // Require sponsorship - say no
            [/sponsorship|require.*sponsor/i, 1], // Second option usually "No"
            // Remote - say yes
            [/remote|work.*from.*home/i, 0],
            // Relocation - say yes
            [/relocat/i, 0],
            // Background check - say yes
            [/background|check.*(criminal|background)/i, 0],
            // Drug test - say yes
            [/drug.*test/i, 0],
          ];

          let selected = false;
          for (const [pattern, preferredIndex] of preferredAnswers) {
            if (pattern.test(lowerText)) {
              // Try to click the preferred option
              const inputs = await group.$$('input[type="radio"], input[type="checkbox"]');
              if (inputs[preferredIndex]) {
                await inputs[preferredIndex].click();
                addLog('screening_question', `Answered: ${questionText.substring(0, 50)}...`);
                selected = true;
                break;
              }
            }
          }

          // If no preferred answer found, select first option (usually "Yes"/"I agree")
          if (!selected && isRequired) {
            const inputs = await group.$$('input[type="radio"], input[type="checkbox"]');
            if (inputs[0]) {
              await inputs[0].click();
              addLog('screening_question', `Default answered: ${questionText.substring(0, 50)}...`);
            }
          }
        }
      } catch (e) {
        // Continue to next question
      }
    }

    return true;
  }

  // ==========================================
  // ATS DETECTION
  // ==========================================

  private async detectATS(page: Page): Promise<'greenhouse' | 'lever' | 'workday' | 'linkedin' | null> {
    const url = page.url();
    const html = await page.content();

    if (url.includes('linkedin.com')) {
      return 'linkedin';
    }
    if (url.includes('greenhouse.io') || url.includes('boards.greenhouse') || html.includes('greenhouse')) {
      return 'greenhouse';
    }
    if (url.includes('lever.co') || url.includes('jobs.lever') || html.includes('lever.co')) {
      return 'lever';
    }
    if (url.includes('workday.com') || url.includes('myworkday') || html.includes('workday')) {
      return 'workday';
    }
    return null;
  }

  // ==========================================
  // RULE-BASED FORM ANALYSIS
  // ==========================================

  async analyzeFormRuleBased(
    page: Page | any,
    candidateData: CandidateData,
    atsType: string | null
  ): Promise<FieldMapping> {
    const matched: Record<string, string> = {};
    const unmatched: string[] = [];
    let fileUploadSelector: string | undefined;

    // ATS-specific fast path
    if (atsType === 'greenhouse') {
      const ats = ATS_SELECTORS.greenhouse;
      matched[ats.firstName] = candidateData.firstName;
      matched[ats.lastName] = candidateData.lastName;
      matched[ats.email] = candidateData.email;
      if (candidateData.phone) {matched[ats.phone] = candidateData.phone;}
      if (candidateData.linkedinUrl) {matched[ats.linkedin] = candidateData.linkedinUrl;}
      fileUploadSelector = ats.resume;
      return { matched, unmatched, fileUploadSelector };
    }

    if (atsType === 'lever') {
      const ats = ATS_SELECTORS.lever;
      matched[ats.firstName] = `${candidateData.firstName} ${candidateData.lastName}`;
      matched[ats.email] = candidateData.email;
      if (candidateData.phone) {matched[ats.phone] = candidateData.phone;}
      if (candidateData.linkedinUrl) {matched[ats.linkedin] = candidateData.linkedinUrl;}
      fileUploadSelector = ats.resume;
      return { matched, unmatched, fileUploadSelector };
    }

    // LinkedIn Easy Apply
    if (atsType === 'linkedin') {
      const ats = ATS_SELECTORS.linkedin;
      // LinkedIn combines first/last name
      matched[ats.firstName] = candidateData.firstName;
      matched[ats.lastName] = candidateData.lastName;
      matched[ats.email] = candidateData.email;
      if (candidateData.phone) {matched[ats.phone] = candidateData.phone;}
      if (candidateData.linkedinUrl) {matched[ats.linkedin] = candidateData.linkedinUrl;}
      fileUploadSelector = ats.resume;
      return { matched, unmatched, fileUploadSelector };
    }

    // Generic form analysis via pattern matching
    const inputs = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');

    for (const input of inputs) {
      const name = (await input.getAttribute('name')) || '';
      const id = (await input.getAttribute('id')) || '';
      const placeholder = (await input.getAttribute('placeholder')) || '';
      const type = (await input.getAttribute('type')) || 'text';
      const ariaLabel = (await input.getAttribute('aria-label')) || '';

      // Get associated label text
      let labelText = '';
      if (id) {
        try {
          const label = await page.$(`label[for="${id}"]`);
          if (label) {labelText = (await label.textContent()) || '';}
        } catch { /* no label */ }
      }

      const identifiers = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText}`.toLowerCase();

      // Check for file upload
      if (type === 'file') {
        const selector = id ? `#${id}` : (name ? `input[name="${name}"]` : 'input[type="file"]');
        if (/resume|cv|attachment/i.test(identifiers)) {
          fileUploadSelector = selector;
        } else {
          fileUploadSelector = fileUploadSelector || selector;
        }
        continue;
      }

      // Match against pattern dictionary
      let fieldMatched = false;
      for (const { pattern, field } of FIELD_PATTERNS) {
        if (pattern.test(identifiers)) {
          const selector = id ? `#${id}` : (name ? `[name="${name}"]` : `[placeholder="${placeholder}"]`);

          if (field === 'fullName') {
            matched[selector] = `${candidateData.firstName} ${candidateData.lastName}`;
          } else if (field === 'resume' || field === 'coverLetter') {
            // Skip non-file inputs for resume/cover letter
          } else {
            const value = candidateData[field];
            if (value && typeof value === 'string') {
              matched[selector] = value;
            }
          }
          fieldMatched = true;
          break;
        }
      }

      if (!fieldMatched && type !== 'checkbox' && type !== 'radio') {
        const selector = id ? `#${id}` : (name ? `[name="${name}"]` : `[placeholder="${placeholder}"]`);
        if (selector && selector !== '[]' && selector !== '[placeholder=""]') {
          unmatched.push(selector);
        }
      }
    }

    return { matched, unmatched, fileUploadSelector };
  }

  // ==========================================
  // OLLAMA FALLBACK
  // ==========================================

  async analyzeFormOllama(
    page: Page | any,
    unmatchedSelectors: string[],
    candidateData: CandidateData
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL || 'llama3.2';

      // Gather context about unmatched fields
      const fieldDescriptions: string[] = [];
      for (const selector of unmatchedSelectors) {
        try {
          const el = await page.$(selector);
          if (!el) {continue;}
          const name = (await el.getAttribute('name')) || '';
          const placeholder = (await el.getAttribute('placeholder')) || '';
          const id = (await el.getAttribute('id')) || '';
          fieldDescriptions.push(`selector="${selector}" name="${name}" id="${id}" placeholder="${placeholder}"`);
        } catch { /* skip */ }
      }

      if (fieldDescriptions.length === 0) {return result;}

      const prompt = `You are a form-filling assistant. Map form fields to candidate data.

Candidate data:
- firstName: ${candidateData.firstName}
- lastName: ${candidateData.lastName}
- email: ${candidateData.email}
- phone: ${candidateData.phone}
- linkedinUrl: ${candidateData.linkedinUrl}
- githubUrl: ${candidateData.githubUrl}
- portfolioUrl: ${candidateData.portfolioUrl}
- location: ${candidateData.location}

Unmatched form fields:
${fieldDescriptions.join('\n')}

Return ONLY a JSON object mapping selectors to values. Skip fields you can't map. Example:
{"#field1": "value1", "[name=\\"field2\\"]": "value2"}`;

      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json() as { response?: string };
        const text = data.response || '';
        // Extract JSON from response
        const jsonMatch = text.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          Object.assign(result, parsed);
        }
      }
    } catch {
      // Ollama unavailable — graceful degradation
    }

    return result;
  }

  // ==========================================
  // FORM FILLING
  // ==========================================

  async fillForm(page: Page | any, fieldMap: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(fieldMap)) {
      if (!value) {continue;}

      try {
        // Try multiple selector formats
        let el = await page.$(selector);
        if (!el) {
          // Try comma-separated selectors individually
          for (const s of selector.split(',').map(s => s.trim())) {
            el = await page.$(s);
            if (el) {break;}
          }
        }
        if (!el) {continue;}

        const tagName = await el.evaluate((e: unknown) => (e as { tagName: string }).tagName.toLowerCase());

        if (tagName === 'select') {
          // Try matching option by label first, then by value; log if neither matches
          await el.selectOption({ label: value }).catch(() =>
            el.selectOption({ value }).catch(() => {
              console.warn(`[AgentApply] Could not select option for value "${value}" — no matching label or value in <select>`);
            })
          );
        } else if (tagName === 'input' || tagName === 'textarea') {
          const inputType = (await el.getAttribute('type')) || 'text';
          if (inputType === 'checkbox') {
            const checked = await el.isChecked();
            if (!checked) {await el.check();}
          } else {
            await el.click();
            await this.randomDelay(50, 150);
            await el.fill(value);
          }
        }

        await this.randomDelay(200, 500);
      } catch {
        // Skip fields that can't be filled
      }
    }
  }

  // ==========================================
  // RESUME UPLOAD
  // ==========================================

  private async handleResumeUpload(page: Page | any, selector: string, resumeUrl: string): Promise<void> {
    if (!resumeUrl) {return;}
    
    try {
      // Determine file type from URL or default to PDF
      const isPdf = resumeUrl.toLowerCase().endsWith('.pdf');
      const isDocx = resumeUrl.toLowerCase().includes('.docx') || resumeUrl.toLowerCase().includes('.doc');
      const extension = isPdf ? '.pdf' : isDocx ? '.docx' : '.pdf';
      const mimeType = isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';

      // Download resume to temp location
      const response = await fetch(resumeUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        console.log('[AgentApply] Failed to fetch resume:', response.status);
        return;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const tmpPath = `/tmp/resume-${Date.now()}${extension}`;
      const fs = await import('fs/promises');
      await fs.writeFile(tmpPath, buffer);

      // Try multiple selectors for file input
      const selectors = [
        selector,
        'input[type="file"]',
        'input[name*="resume"]',
        'input[name*="cv"]',
        'input[id*="resume"]',
        'input[class*="resume"]',
        'input[accept*="pdf"]',
        'input[accept*="doc"]',
      ].filter(Boolean);

      for (const s of selectors) {
        try {
          const fileInput = await page.$(s);
          if (fileInput) {
            await fileInput.setInputFiles(tmpPath);
            console.log(`[AgentApply] Uploaded resume to: ${s}`);
            break;
          }
        } catch (e) {
          console.log(`[AgentApply] Selector ${s} failed:`, e);
        }
      }

      // Cleanup
      await fs.unlink(tmpPath).catch(() => {});
    } catch (e) {
      console.log('[AgentApply] Resume upload error:', e);
    }
  }

  // ==========================================
  // FORM ADVANCEMENT (Next / Submit)
  // Fix 4: Handles multi-step forms by preferring "Next" over "Submit"
  // when both are present, so we don't skip form pages.
  // ==========================================

  private async advanceForm(page: Page | any, atsType: string | null): Promise<boolean> {
    // Only check iframes for Workday (where form lives inside an iframe)
    // Skip for other ATS — their iframes are usually reCAPTCHA/analytics, not forms
    if (atsType === 'workday') {
      try {
        const frames = page.frames();
        if (frames.length > 1) {
          for (const frame of frames) {
            try {
              const frameUrl = frame.url();
              if (frameUrl && !frameUrl.startsWith('about:') && !frameUrl.includes('recaptcha') && !frameUrl.includes('google.com')) {
                const frameButtons = await frame.$$('button, a, [role="button"], input[type="submit"]');
                for (const btn of frameButtons) {
                  try {
                    const text = await btn.textContent();
                    const isVisible = await btn.isVisible();
                    if (isVisible && text && text.trim()) {
                      const lower = text.toLowerCase();
                      if (lower.includes('next') || lower.includes('continue') ||
                          lower.includes('submit') || lower.includes('send')) {
                        console.log(`[AgentApply] Found button in Workday frame: "${text.trim()}"`);
                        await this.randomDelay(400, 800);
                        await btn.click();
                        return true;
                      }
                    }
                  } catch { continue; }
                }
              }
            } catch { continue; }
          }
        }
      } catch (e) {
        console.log('[AgentApply] Frame detection error:', e);
      }
    }

    // "Next" buttons come first — prefer advancing over submitting prematurely
    const nextSelectors = [
      // Text-based selectors
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Next Step")',
      'button:has-text("Next Page")',
      'button:has-text("Continue to next step")',
      'a:has-text("Next")',
      'a:has-text("Continue")',
      // Data attributes
      '[data-qa="next-button"]',
      '[data-testid="next-button"]',
      '[data-test="next-button"]',
      '[data-tracking="next-button"]',
      // Class-based
      '.next-button',
      '.btn-next',
      '.button-next',
      // Form actions
      'button[formaction*="next"]',
      'input[value*="Next"]',
      // Greenhouse specific
      '.gh-button-next',
      'button:has-text("Save & Next")',
      // Generic form submit buttons that might be "Next"
      'button.primary',
      'button:not([type="cancel"]):not([type="button"])',
    ];

    for (const selector of nextSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && await btn.isVisible()) {
          const isDisabled = await btn.isDisabled();
          if (isDisabled) {
            continue; // Skip disabled buttons
          }
          await this.randomDelay(400, 800);
          await btn.click();
          return true;
        }
      } catch { /* try next */ }
    }

    // No "Next" found — try submit
    const submitSelectors = [
      ...(atsType === 'greenhouse' ? [ATS_SELECTORS.greenhouse.submitBtn] : []),
      ...(atsType === 'lever' ? [ATS_SELECTORS.lever.submitBtn] : []),
      // Standard submit buttons
      'button[type="submit"]',
      'input[type="submit"]',
      // Text-based
      'button:has-text("Submit")',
      'button:has-text("Submit Application")',
      'button:has-text("Submit your application")',
      'button:has-text("Apply")',
      'button:has-text("Send Application")',
      'button:has-text("Send")',
      'button:has-text("Apply Now")',
      'button:has-text("Complete Application")',
      // ID/Class based
      '#submit',
      '.submit-button',
      '.btn-submit',
      '.application-submit',
      // Data attributes
      '[data-qa="submit-button"]',
      '[data-testid="submit-button"]',
      '[data-test="submit"]',
      '[data-tracking="submit"]',
      // Form footer buttons
      'div.form-footer button',
      'div.submit-wrapper button',
      // Greenhouse specific
      '.submit-application-button',
      'button:has-text("Submit Job Application")',
      // Generic last button in form
      'form button:last-of-type',
      'form button:last-child',
    ];

    for (const selector of submitSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && await btn.isVisible()) {
          const isDisabled = await btn.isDisabled();
          if (isDisabled) {
            continue;
          }
          await this.randomDelay(500, 1000);
          await btn.click();
          return true;
        }
      } catch { /* try next */ }
    }

    // Try clicking any button in the form that looks like an action button
    try {
      const formButtons = await page.$$('form button, form a, div[role="button"]');
      const buttonTexts: string[] = [];
      for (const btn of formButtons) {
        try {
          const text = await btn.textContent();
          const isVisible = await btn.isVisible();
          const isDisabled = await btn.isDisabled();
          const type = await btn.getAttribute('type');
          const role = await btn.getAttribute('role');
          
          if (text && text.trim()) {
            buttonTexts.push(`"${text.trim()}" (visible:${isVisible}, disabled:${isDisabled}, type:${type}, role:${role})`);
          }
          
          if (isVisible && !isDisabled && text && text.trim() && type !== 'cancel') {
            const lowerText = text.toLowerCase();
            if (lowerText.includes('next') || lowerText.includes('continue') || 
                lowerText.includes('submit') || lowerText.includes('apply') ||
                lowerText.includes('send') || lowerText.includes('complete')) {
              await this.randomDelay(400, 800);
              await btn.click();
              return true;
            }
          }
        } catch { /* try next button */ }
      }
      // Log what buttons were found for debugging
      console.log('[AgentApply] Found buttons:', buttonTexts.slice(0, 10).join(', '));
    } catch (e: any) { 
      console.log('[AgentApply] Button detection error:', e.message);
    }

    return false;
  }

  // ==========================================
  // COOKIE BANNER DISMISSAL
  // Fix 5: Dismiss consent overlays that block form interaction
  // ==========================================

  private async dismissCookieBanners(page: Page): Promise<void> {
    const acceptSelectors = [
      'button:has-text("Accept All")',
      'button:has-text("Accept all")',
      'button:has-text("Accept Cookies")',
      'button:has-text("Accept")',
      'button:has-text("I Accept")',
      'button:has-text("OK")',
      'button:has-text("Got it")',
      'button:has-text("Agree")',
      'button:has-text("I Agree")',
      '[aria-label="Accept cookies"]',
      '[aria-label="accept cookies"]',
      '#onetrust-accept-btn-handler',
      '.cookie-accept',
      '.accept-cookies',
      '[data-testid="cookie-accept"]',
      '[data-testid="accept-button"]',
    ];

    for (const selector of acceptSelectors) {
      try {
        const el = await page.$(selector);
        if (el && await el.isVisible()) {
          await el.click();
          await this.randomDelay(400, 800);
          return; // One banner at a time
        }
      } catch { /* continue */ }
    }
  }

  // ==========================================
  // VERIFICATION
  // ==========================================

  private async verifySubmission(page: Page): Promise<boolean> {
    // First, check for validation errors — if the form shows errors, it was NOT submitted
    const validationErrorIndicators = [
      '.field-error',
      '.error-message',
      '.form-error',
      '[class*="error"]:visible',
      'text=is required',
      'text=Please fill',
      'text=This field is required',
      'text=can\'t be blank',
      // Greenhouse specific validation
      '#s_alert',
      '.field--error',
    ];
    for (const indicator of validationErrorIndicators) {
      try {
        const el = await page.$(indicator);
        if (el && await el.isVisible()) {return false;}
      } catch { /* continue */ }
    }

    const successIndicators = [
      // Greenhouse specific (check these first — more specific)
      'text=Your application was submitted successfully',
      'text=Application submitted',
      'text=Thanks for applying',
      'text=We have received your application',
      '#application_confirmation',
      // General
      'text=application received',
      'text=successfully submitted',
      'text=application has been submitted',
      'text=we received your application',
      // Common
      '.confirmation',
      '#confirmation',
      '[data-qa="success-message"]',
    ];

    for (const indicator of successIndicators) {
      try {
        const el = await page.$(indicator);
        if (el && await el.isVisible()) {return true;}
      } catch { /* continue */ }
    }

    // Check URL for confirmation patterns
    const url = page.url();
    if (/confirm|thank.*you|success|submitted/i.test(url)) {return true;}

    // Check page body for strong confirmation signals (require specific phrases, not loose matches)
    try {
      const bodyText = await page.textContent('body');
      if (bodyText) {
        const lowerText = bodyText.toLowerCase();
        // Only match if the confirmation phrase appears as a standalone message
        // (not as part of a job description that happens to contain these words)
        const strongConfirmations = [
          'your application has been submitted',
          'application submitted successfully',
          'we received your application',
          'thanks for applying',
          'thank you for applying',
          'your application was submitted',
        ];
        for (const phrase of strongConfirmations) {
          if (lowerText.includes(phrase)) {return true;}
        }
      }
    } catch { /* ignore */ }

    return false;
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private async takeScreenshot(page: Page): Promise<string> {
    try {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 50, fullPage: false });
      return buffer.toString('base64').substring(0, 50000); // Cap at ~50KB
    } catch {
      return '';
    }
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const ms = min + Math.random() * (max - min);
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const agentApplyService = new AgentApplyService();
