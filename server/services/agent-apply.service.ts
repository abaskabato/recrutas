/**
 * Agent Apply Service
 *
 * Playwright-based browser automation that navigates to career pages,
 * fills application forms using rule-based field mapping + Ollama AI fallback,
 * and submits applications on behalf of candidates.
 */

import { chromium, type Page, type Browser, type BrowserContext, type BrowserContextOptions } from 'playwright';
import type { AgentTask } from '../../shared/schema';

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
];

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

    try {
      addLog('launch_browser', 'Starting Playwright chromium (stealth mode)');
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled', // hide automation flag
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080',
        ],
      });

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
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        // Remove Chrome DevTools Protocol automation artifacts
        const win = window as any;
        delete win.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete win.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete win.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        // Make chrome object look real
        if (!win.chrome) {
          win.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
        }
      });

      const page = await context.newPage();
      const candidateData = task.candidateData as CandidateData;

      // Fix 3: Resolve a fresh resume URL at execution time (stored URL may be expired)
      const resumeUrl = await this.getFreshResumeUrl(task.resumeUrl);

      // Navigate to career page
      addLog('navigate', `Navigating to ${task.externalUrl}`);
      await page.goto(task.externalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Fix 2: Wait for network to settle (SPAs render forms after domcontentloaded)
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForSelector('input, textarea, select, button', { timeout: 8000 }).catch(() => {});
      await this.randomDelay(800, 1500);

      // Fix 5: Dismiss cookie banners/consent overlays before interacting
      await this.dismissCookieBanners(page);

      // Detect application form or find apply button
      let formFound = await this.detectForm(page);
      if (!formFound) {
        addLog('find_apply_button', 'No form found, looking for Apply button');
        const clicked = await this.clickApplyButton(page);
        if (clicked) {
          // Wait for SPA navigation to complete after clicking Apply
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await page.waitForSelector('input, textarea', { timeout: 8000 }).catch(() => {});
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
        await page.waitForSelector(ATS_SELECTORS.workday.iframeSelector, { timeout: 10000 }).catch(() => {});
        const iframe = await page.$(ATS_SELECTORS.workday.iframeSelector);
        if (iframe) {
          const frame = await iframe.contentFrame();
          if (frame) {
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

      while (stepCount < MAX_STEPS) {
        stepCount++;

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
        }

        // Click Next or Submit
        addLog(`step_${stepCount}_advance`, 'Advancing form (Next/Submit)');
        const advanced = await this.advanceForm(activePage, atsType);
        if (!advanced) {
          addLog(`step_${stepCount}_no_button`, 'No Next/Submit button found');
          break;
        }

        // Wait for the result of the click
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.randomDelay(1500, 2500);

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
    if (!storedUrl) return null;

    try {
      // Extract storage path from the URL
      // Format: .../storage/v1/object/(sign|public)/resumes/<path>
      const match = storedUrl.match(/\/object\/(?:sign|public)\/([^?]+)/);
      if (!match) return storedUrl; // Can't parse — use as-is

      const fullPath = match[1]; // e.g. "resumes/user-id/resume.pdf"
      const [bucket, ...pathParts] = fullPath.split('/');
      const filePath = pathParts.join('/');

      const { getSupabaseAdmin } = await import('../lib/supabase-admin.js');
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 300); // 5 min TTL — enough for the automation

      if (error || !data?.signedUrl) {
        return storedUrl; // Fall back to original URL
      }
      return data.signedUrl;
    } catch {
      return storedUrl;
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
      if (el) return true;
    }

    // Fallback: look for a form with multiple inputs
    const forms = await page.$$('form');
    for (const form of forms) {
      const inputs = await form.$$('input, textarea, select');
      if (inputs.length >= 3) return true;
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
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
          return true;
        }
      } catch { /* continue */ }
    }
    return false;
  }

  // ==========================================
  // ATS DETECTION
  // ==========================================

  private async detectATS(page: Page): Promise<'greenhouse' | 'lever' | 'workday' | null> {
    const url = page.url();
    const html = await page.content();

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
      if (candidateData.phone) matched[ats.phone] = candidateData.phone;
      if (candidateData.linkedinUrl) matched[ats.linkedin] = candidateData.linkedinUrl;
      fileUploadSelector = ats.resume;
      return { matched, unmatched, fileUploadSelector };
    }

    if (atsType === 'lever') {
      const ats = ATS_SELECTORS.lever;
      matched[ats.firstName] = `${candidateData.firstName} ${candidateData.lastName}`;
      matched[ats.email] = candidateData.email;
      if (candidateData.phone) matched[ats.phone] = candidateData.phone;
      if (candidateData.linkedinUrl) matched[ats.linkedin] = candidateData.linkedinUrl;
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
          if (label) labelText = (await label.textContent()) || '';
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
          if (!el) continue;
          const name = (await el.getAttribute('name')) || '';
          const placeholder = (await el.getAttribute('placeholder')) || '';
          const id = (await el.getAttribute('id')) || '';
          fieldDescriptions.push(`selector="${selector}" name="${name}" id="${id}" placeholder="${placeholder}"`);
        } catch { /* skip */ }
      }

      if (fieldDescriptions.length === 0) return result;

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
        const data = await response.json();
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
      if (!value) continue;

      try {
        // Try multiple selector formats
        let el = await page.$(selector);
        if (!el) {
          // Try comma-separated selectors individually
          for (const s of selector.split(',').map(s => s.trim())) {
            el = await page.$(s);
            if (el) break;
          }
        }
        if (!el) continue;

        const tagName = await el.evaluate((e: Element) => e.tagName.toLowerCase());

        if (tagName === 'select') {
          // Try matching option by text
          await el.selectOption({ label: value }).catch(() =>
            el.selectOption({ value }).catch(() => {})
          );
        } else if (tagName === 'input' || tagName === 'textarea') {
          const inputType = (await el.getAttribute('type')) || 'text';
          if (inputType === 'checkbox') {
            const checked = await el.isChecked();
            if (!checked) await el.check();
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
    try {
      // Download resume to temp location
      const response = await fetch(resumeUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return;

      const buffer = Buffer.from(await response.arrayBuffer());
      const tmpPath = `/tmp/resume-${Date.now()}.pdf`;
      const fs = await import('fs/promises');
      await fs.writeFile(tmpPath, buffer);

      // Upload via file input
      for (const s of selector.split(',').map(s => s.trim())) {
        try {
          const fileInput = await page.$(s);
          if (fileInput) {
            await fileInput.setInputFiles(tmpPath);
            break;
          }
        } catch { /* try next */ }
      }

      // Cleanup
      await fs.unlink(tmpPath).catch(() => {});
    } catch {
      // Resume upload failed — not fatal for all ATS
    }
  }

  // ==========================================
  // FORM ADVANCEMENT (Next / Submit)
  // Fix 4: Handles multi-step forms by preferring "Next" over "Submit"
  // when both are present, so we don't skip form pages.
  // ==========================================

  private async advanceForm(page: Page | any, atsType: string | null): Promise<boolean> {
    // "Next" buttons come first — prefer advancing over submitting prematurely
    const nextSelectors = [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Next Step")',
      'button:has-text("Next Page")',
      'a:has-text("Next")',
      '[data-qa="next-button"]',
      '.next-button',
    ];

    for (const selector of nextSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && await btn.isVisible()) {
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
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Submit Application")',
      'button:has-text("Apply")',
      'button:has-text("Send Application")',
      '#submit',
    ];

    for (const selector of submitSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && await btn.isVisible()) {
          await this.randomDelay(500, 1000);
          await btn.click();
          return true;
        }
      } catch { /* try next */ }
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
    const successIndicators = [
      'text=thank you',
      'text=application received',
      'text=successfully submitted',
      'text=application has been submitted',
      'text=we received your application',
      '.confirmation',
      '#confirmation',
    ];

    for (const indicator of successIndicators) {
      try {
        const el = await page.$(indicator);
        if (el && await el.isVisible()) return true;
      } catch { /* continue */ }
    }

    // Check URL for confirmation patterns
    const url = page.url();
    if (/confirm|thank|success|submitted/i.test(url)) return true;

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
