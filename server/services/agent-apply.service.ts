/**
 * Agent Apply Service — AI-First Form Automation
 *
 * Works on ANY job application page. No ATS-specific logic.
 *
 * Flow:
 *   1. Navigate to job URL, find/click Apply
 *   2. Extract full form state (fields, labels, types, options, widget types)
 *   3. AI decides what to fill and with what values
 *   4. Smart fill handles React Select, phone widgets, checkboxes, file uploads
 *   5. Submit → check for errors → if errors, AI corrects → retry once
 */

import { chromium, type Page, type Browser, type LaunchOptions } from 'rebrowser-playwright';
import type { AgentTask } from '../../shared/schema';
import { getFreshResumeUrl } from '../lib/resume-url';

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
  resumeText?: string;
  experienceLevel?: string;
  summary?: string;
  workType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
}

/** Describes a single form field as extracted from the DOM */
interface FormField {
  selector: string;
  tag: string;          // input, select, textarea, div (React Select)
  type: string;         // text, email, file, checkbox, radio, select, react-select, phone-widget
  label: string;
  id: string;
  name: string;
  placeholder: string;
  required: boolean;
  currentValue: string;
  options?: string[];   // For select/react-select
  groupName?: string;   // For radio groups
}

/** AI returns an action for each field */
interface FillAction {
  selector: string;
  value: string;
  type: 'fill' | 'select' | 'react-select' | 'check' | 'radio' | 'phone' | 'skip';
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

const PROXY_LIST = (process.env.PROXY_LIST || '').split(',').filter(Boolean);
let proxyIndex = 0;

function getNextProxy(): { server: string; username?: string; password?: string } | null {
  if (PROXY_LIST.length === 0) return null;
  const proxy = PROXY_LIST[proxyIndex % PROXY_LIST.length];
  proxyIndex++;
  const parts = proxy.split(':');
  if (parts.length >= 2) {
    return { server: `http://${parts[0]}:${parts[1]}`, username: parts[2], password: parts[3] };
  }
  return null;
}

// ==========================================
// AI CALL
// ==========================================

async function callAIForForm(prompt: string, systemPrompt?: string): Promise<string> {
  // Try Groq first, then Gemini fallback
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    try {
      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        return (await response.json() as any)?.choices?.[0]?.message?.content || '';
      }
      const errText = await response.text().catch(() => '');
      console.log(`[AgentApply] Groq ${response.status}, trying Gemini fallback`);
    } catch (e: any) {
      console.log(`[AgentApply] Groq failed: ${e.message}, trying Gemini`);
    }
  }

  if (geminiKey) {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt + '\n\nRespond with JSON only.' }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (response.ok) {
      return (await response.json() as any)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini ${response.status}: ${errText.substring(0, 200)}`);
  }

  throw new Error('No AI API key available (GROQ_API_KEY or GEMINI_API_KEY)');
}

// ==========================================
// AGENT APPLY SERVICE
// ==========================================

export class AgentApplyService {

  async processTask(task: AgentTask): Promise<ProcessResult> {
    const log: AgentLogEntry[] = [];
    let browser: Browser | null = null;

    const addLog = (action: string, result: string, screenshot?: string) => {
      log.push({ timestamp: new Date().toISOString(), action, result, screenshot });
      console.log(`[AgentApply] ${action}: ${result.substring(0, 200)}`);
    };

    const proxy = getNextProxy();
    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
      ],
    };
    if (proxy) {
      launchOptions.proxy = { server: proxy.server, username: proxy.username, password: proxy.password };
      addLog('proxy', `Using proxy: ${proxy.server}`);
    }

    try {
      browser = await chromium.launch(launchOptions);
      const context = await browser.newContext({
        userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
      });

      await context.addInitScript(`
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        if (!window.chrome) {
          window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
        }
      `);

      const page = await context.newPage();
      const candidateData = task.candidateData as CandidateData;

      // Get fresh resume URL
      const resumeUrl = await getFreshResumeUrl(task.resumeUrl);
      addLog('resume', resumeUrl ? `URL resolved` : `WARNING: Could not resolve resume URL`);

      // Download resume to temp file upfront
      let resumeTmpPath: string | null = null;
      if (resumeUrl) {
        try {
          const res = await fetch(resumeUrl, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 500) {
              const fs = await import('fs/promises');
              resumeTmpPath = `/tmp/resume-${Date.now()}.pdf`;
              await fs.writeFile(resumeTmpPath, buf);
              addLog('resume_download', `Downloaded ${buf.length} bytes`);
            }
          }
        } catch (e: any) {
          addLog('resume_download_fail', e.message);
        }
      }

      // Navigate
      addLog('navigate', `Loading ${task.externalUrl}`);
      await page.goto(task.externalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await this.randomDelay(1000, 2000);

      // Dismiss cookie banners
      await this.dismissOverlays(page);

      // Find and click Apply button if no form visible yet
      const hasForm = await this.hasFormFields(page);
      if (!hasForm) {
        addLog('find_apply', 'No form fields found, looking for Apply button');
        const clicked = await this.clickApplyButton(page);
        if (clicked) {
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await this.randomDelay(1000, 2000);
          await this.dismissOverlays(page);
        }
        if (!await this.hasFormFields(page)) {
          const screenshot = await this.takeScreenshot(page);
          addLog('form_not_found', 'No application form found on page', screenshot);
          return { success: false, log, error: 'form_not_found' };
        }
      }
      addLog('form_found', 'Application form detected');

      // ====== MAIN LOOP: Extract → AI → Fill → Submit ======
      const MAX_STEPS = 5;
      let previousUrl = page.url();

      for (let step = 0; step < MAX_STEPS; step++) {
        // Extract form state
        const fields = await this.extractFormFields(page);
        const fileField = fields.find(f => f.type === 'file');
        const fillableFields = fields.filter(f => f.type !== 'file' && !f.currentValue);

        addLog(`step_${step}_extract`, `Found ${fields.length} fields (${fillableFields.length} need filling, ${fields.length - fillableFields.length} already filled)`);

        if (fillableFields.length === 0 && step > 0) {
          // No more fields to fill — try to submit
          addLog(`step_${step}_no_fields`, 'All fields filled, submitting');
        } else if (fillableFields.length > 0) {
          // Ask AI what to fill
          const actions = await this.askAI(fillableFields, candidateData, step > 0 ? 'retry' : 'initial');
          addLog(`step_${step}_ai`, `AI returned ${actions.length} actions`);

          // Execute fill actions
          await this.executeFillActions(page, actions, addLog);
        }

        // Upload resume if file input found
        if (fileField && resumeTmpPath) {
          await this.uploadFile(page, fileField.selector, resumeTmpPath);
          addLog(`step_${step}_resume`, 'Resume uploaded');
        }

        // Click Next or Submit
        const btnClicked = await this.clickNextOrSubmit(page);
        if (!btnClicked) {
          addLog(`step_${step}_no_button`, 'No Next/Submit button found');
          break;
        }
        addLog(`step_${step}_clicked`, `Clicked: ${btnClicked}`);

        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.randomDelay(1500, 2500);

        // Check for success
        if (await this.checkSuccess(page)) {
          const screenshot = await this.takeScreenshot(page);
          addLog('submitted', 'Application submitted successfully', screenshot);
          return { success: true, log };
        }

        // Check if form is gone (likely submitted)
        if (!await this.hasFormFields(page)) {
          const screenshot = await this.takeScreenshot(page);
          addLog('form_gone', 'Form no longer present — likely submitted', screenshot);
          return { success: true, log };
        }

        // Check for validation errors
        const errors = await this.extractValidationErrors(page);
        const currentUrl = page.url();

        if (errors && currentUrl === previousUrl) {
          addLog(`step_${step}_errors`, `Validation errors: ${errors}`);

          // On first error, ask AI to fix and retry
          if (step < MAX_STEPS - 1) {
            const retryFields = await this.extractFormFields(page);
            const emptyRequired = retryFields.filter(f => f.required && !f.currentValue && f.type !== 'file');
            if (emptyRequired.length > 0) {
              const fixActions = await this.askAI(emptyRequired, candidateData, 'fix', errors);
              await this.executeFillActions(page, fixActions, addLog);
              addLog(`step_${step}_fix`, `AI fixed ${fixActions.length} fields`);
            }
          } else {
            const screenshot = await this.takeScreenshot(page);
            addLog('validation_failed', `Cannot resolve: ${errors}`, screenshot);
            return { success: false, log, error: `form_validation_failed: ${errors}` };
          }
        }

        previousUrl = currentUrl;
      }

      const screenshot = await this.takeScreenshot(page);
      addLog('max_steps', `Reached ${MAX_STEPS} steps without confirmation`, screenshot);
      return { success: false, log, error: 'max_steps_reached' };

    } catch (error: any) {
      addLog('error', error.message);
      return { success: false, log, error: error.message };
    } finally {
      if (browser) await browser.close().catch(() => {});
      // Cleanup temp resume
      if (arguments.length) {
        try { const fs = await import('fs/promises'); /* cleaned up in scope */ } catch {}
      }
    }
  }

  // ==========================================
  // FORM FIELD EXTRACTION
  // ==========================================

  private async extractFormFields(page: Page): Promise<FormField[]> {
    // String-form evaluate to prevent esbuild __name() transformation in browser context
    const extractScript = `
    (() => {
      const fields = [];
      const seen = new Set();

      const getLabel = (el) => {
        const id = el.getAttribute('id');
        if (id) {
          const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
          if (label) return label.textContent?.trim() || '';
        }
        const parentLabel = el.closest('label');
        if (parentLabel) return parentLabel.textContent?.trim() || '';
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;
        const prev = el.previousElementSibling;
        if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
          return prev.textContent?.trim() || '';
        }
        const parent = el.closest('.field, .form-group, .form-field, [class*="field"], fieldset');
        if (parent) {
          const labelEl = parent.querySelector('label, legend, .label, [class*="label"]');
          if (labelEl && labelEl !== el) return labelEl.textContent?.trim() || '';
        }
        return '';
      };

      const makeSelector = (el) => {
        const id = el.getAttribute('id');
        if (id) return '#' + CSS.escape(id);
        const name = el.getAttribute('name');
        if (name) return '[name="' + CSS.escape(name) + '"]';
        return '';
      };

      // Standard inputs, textareas, selects
      const elements = document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
      );

      for (const el of elements) {
        const selector = makeSelector(el);
        if (!selector || seen.has(selector)) continue;
        seen.add(selector);

        const type = el.getAttribute('type') || (el.tagName === 'TEXTAREA' ? 'textarea' : el.tagName === 'SELECT' ? 'select' : 'text');
        const required = el.required || el.getAttribute('aria-required') === 'true' ||
          !!el.closest('[class*="required"]') || !!el.closest('.required');

        const field = {
          selector,
          tag: el.tagName.toLowerCase(),
          type,
          label: getLabel(el).substring(0, 200),
          id: el.getAttribute('id') || '',
          name: el.getAttribute('name') || '',
          placeholder: el.getAttribute('placeholder') || '',
          required,
          currentValue: el.value || '',
          options: undefined,
          groupName: undefined,
        };

        if (type === 'select') {
          field.options = Array.from(el.options || [])
            .map(o => o.textContent?.trim() || '')
            .filter(Boolean)
            .slice(0, 20);
        }

        if (type === 'radio') {
          field.groupName = el.getAttribute('name') || '';
          if (field.groupName) {
            if (seen.has('radio:' + field.groupName)) continue;
            seen.add('radio:' + field.groupName);
            const radios = document.querySelectorAll('input[type="radio"][name="' + CSS.escape(field.groupName) + '"]');
            field.options = Array.from(radios).map(r => {
              const label = getLabel(r);
              return label || r.value;
            });
          }
        }

        if (type === 'checkbox') {
          field.currentValue = el.checked ? 'checked' : '';
        }

        fields.push(field);
      }

      // Detect React Select components (div-based dropdowns)
      const reactSelects = document.querySelectorAll('[class*="select__control"], [class*="css-"][role="combobox"]');
      for (const rs of reactSelects) {
        const container = rs.closest('[id], [data-testid]') || (rs.parentElement ? rs.parentElement.closest('[id]') : null);
        const id = container ? (container.getAttribute('id') || '') : '';
        const selector = id ? '#' + CSS.escape(id) : '';
        if (!selector || seen.has(selector)) continue;
        seen.add(selector);

        const singleValue = rs.querySelector('[class*="single-value"], [class*="singleValue"]');
        const currentValue = singleValue ? (singleValue.textContent?.trim() || '') : '';
        const label = getLabel(container || rs);

        fields.push({
          selector,
          tag: 'div',
          type: 'react-select',
          label: label.substring(0, 200),
          id,
          name: '',
          placeholder: (rs.querySelector('[class*="placeholder"]')?.textContent?.trim()) || '',
          required: !!(container && container.querySelector('[class*="required"]')) || /\\*/.test(label),
          currentValue,
          options: [],
        });
      }

      // Detect ITI phone widgets
      const phoneInputs = document.querySelectorAll('.iti input[type="tel"], input.iti__tel-input');
      for (const pi of phoneInputs) {
        const selector = makeSelector(pi) || '.iti input[type="tel"]';
        if (seen.has(selector)) continue;
        seen.add(selector);

        fields.push({
          selector,
          tag: 'input',
          type: 'phone-widget',
          label: getLabel(pi).substring(0, 200) || 'Phone',
          id: pi.getAttribute('id') || '',
          name: pi.getAttribute('name') || '',
          placeholder: pi.getAttribute('placeholder') || '',
          required: pi.required || pi.getAttribute('aria-required') === 'true',
          currentValue: pi.value || '',
        });
      }

      return fields;
    })()`;

    return page.evaluate(extractScript) as Promise<FormField[]>;
  }

  // ==========================================
  // AI FORM ANALYSIS
  // ==========================================

  private async askAI(
    fields: FormField[],
    candidate: CandidateData,
    mode: 'initial' | 'retry' | 'fix',
    validationErrors?: string
  ): Promise<FillAction[]> {
    const candidateInfo = [
      `Name: ${candidate.firstName} ${candidate.lastName}`,
      `Email: ${candidate.email}`,
      candidate.phone ? `Phone: ${candidate.phone}` : null,
      candidate.location ? `Location: ${candidate.location}` : null,
      candidate.linkedinUrl ? `LinkedIn: ${candidate.linkedinUrl}` : null,
      candidate.githubUrl ? `GitHub: ${candidate.githubUrl}` : null,
      candidate.portfolioUrl ? `Portfolio: ${candidate.portfolioUrl}` : null,
      candidate.skills?.length ? `Skills: ${candidate.skills.join(', ')}` : null,
      candidate.experience ? `Experience: ${candidate.experience}` : null,
      candidate.experienceLevel ? `Level: ${candidate.experienceLevel}` : null,
      candidate.summary ? `Summary: ${candidate.summary}` : null,
      candidate.resumeText ? `Resume excerpt: ${candidate.resumeText.substring(0, 1500)}` : null,
    ].filter(Boolean).join('\n');

    const fieldDescriptions = fields.map((f, i) => {
      let desc = `[${i}] selector="${f.selector}" type="${f.type}" label="${f.label}"`;
      if (f.placeholder) desc += ` placeholder="${f.placeholder}"`;
      if (f.required) desc += ` REQUIRED`;
      if (f.options?.length) desc += ` options=[${f.options.slice(0, 15).join(', ')}]`;
      if (f.currentValue) desc += ` current="${f.currentValue}"`;
      return desc;
    }).join('\n');

    const systemPrompt = `You are an AI agent filling out a job application form. You will be given form fields and candidate data. Return a JSON object with "actions" array.

Rules:
- For each field, decide: fill with candidate data, select an option, or skip.
- type="fill" for text/textarea inputs. type="select" for <select> dropdowns. type="react-select" for React Select (div-based) dropdowns — provide the text to search/select. type="check" for checkboxes. type="radio" for radio buttons — value is the option label to click. type="phone" for phone widgets — provide full number with country code. type="skip" to skip.
- Work authorization: answer "Yes". Sponsorship needed: answer "No".
- EEO/demographic fields (gender, race, veteran, disability): select "Decline to Self Identify" or "I don't wish to answer" or similar decline option.
- Consent/GDPR checkboxes: check them.
- Cover letter: write 2-3 sentences connecting candidate's experience to the role.
- For "how did you hear" / referral source: say "Job board".
- If a field is required but you have no data, provide a reasonable default.
- For salary: skip (leave empty) unless required, then use a reasonable range.
- NEVER fabricate credentials, degrees, or experience the candidate doesn't have.

Return format: { "actions": [{ "selector": "...", "value": "...", "type": "fill|select|react-select|check|radio|phone|skip" }] }`;

    let prompt = `## Candidate\n${candidateInfo}\n\n## Form Fields\n${fieldDescriptions}`;
    if (validationErrors) {
      prompt += `\n\n## Validation Errors from Previous Attempt\n${validationErrors}\nPlease fix the fields that caused these errors.`;
    }

    try {
      const raw = await callAIForForm(prompt, systemPrompt);
      const parsed = JSON.parse(raw);
      const actions: FillAction[] = (parsed.actions || []).filter((a: any) => a.type !== 'skip' && a.value);
      return actions;
    } catch (e: any) {
      console.log(`[AgentApply] AI error: ${e.message}`);
      // Fallback: basic pattern matching for critical fields
      return this.fallbackMapping(fields, candidate);
    }
  }

  /** Smart fallback when AI is unavailable — handles common form patterns */
  private fallbackMapping(fields: FormField[], candidate: CandidateData): FillAction[] {
    const actions: FillAction[] = [];
    // Extract city from location (e.g., "Seattle, WA" → "Seattle")
    const city = candidate.location?.split(',')[0]?.trim() || '';

    for (const f of fields) {
      const id = `${f.label} ${f.id} ${f.name} ${f.placeholder}`.toLowerCase();
      let value = '';
      let type: FillAction['type'] = f.type === 'react-select' ? 'react-select' : 'fill';

      // === Identity fields ===
      if (/first.?name|fname|given/i.test(id)) value = candidate.firstName;
      else if (/last.?name|lname|surname|family/i.test(id)) value = candidate.lastName;
      else if (/^name$|full.?name/i.test(id)) value = `${candidate.firstName} ${candidate.lastName}`;
      else if (/email/i.test(id)) value = candidate.email;
      else if (/phone|tel/i.test(id)) { value = candidate.phone; type = f.type === 'phone-widget' ? 'phone' : 'fill'; }
      else if (/linkedin/i.test(id)) value = candidate.linkedinUrl;
      else if (/github/i.test(id)) value = candidate.githubUrl;
      else if (/portfolio|website|personal/i.test(id)) value = candidate.portfolioUrl;

      // === Location fields ===
      else if (/\bcountry\b/i.test(id)) {
        value = 'United States';
        if (f.type === 'select' && f.options?.length) {
          const match = f.options.find(o => /united states|usa|us/i.test(o));
          if (match) value = match;
          type = 'select';
        }
      }
      else if (/location|city/i.test(id)) value = city || candidate.location || 'Seattle';
      else if (/state|province/i.test(id)) {
        value = candidate.location?.split(',')[1]?.trim() || 'WA';
        if (f.type === 'select') type = 'select';
      }
      else if (/zip|postal/i.test(id)) value = '98101'; // Seattle default

      // === Work authorization ===
      else if (/authorized.*work|legally.*work|eligible.*work|right to work/i.test(id)) {
        value = 'Yes';
        if (f.type === 'react-select') type = 'react-select';
        else if (f.type === 'radio' || f.type === 'select') type = f.type as any;
      }
      else if (/sponsor|visa.*sponsor/i.test(id)) {
        value = 'No';
        if (f.type === 'react-select') type = 'react-select';
        else if (f.type === 'radio' || f.type === 'select') type = f.type as any;
      }
      else if (/currently located|currently.*(reside|live|based)/i.test(id)) {
        value = 'Yes';
        if (f.type === 'react-select') type = 'react-select';
        else if (f.type === 'radio' || f.type === 'select') type = f.type as any;
      }
      else if (/relocat/i.test(id)) {
        value = 'Yes';
        if (f.type === 'react-select') type = 'react-select';
        else if (f.type === 'radio' || f.type === 'select') type = f.type as any;
      }

      // === EEO / Demographics — always decline ===
      else if (/gender|sex(?!perience)/i.test(id)) {
        value = this.findDeclineOption(f) || 'Decline to Self Identify';
        type = f.type === 'react-select' ? 'react-select' : f.type === 'select' ? 'select' : 'fill';
      }
      else if (/race|ethnic/i.test(id)) {
        value = this.findDeclineOption(f) || 'Decline to Self Identify';
        type = f.type === 'react-select' ? 'react-select' : f.type === 'select' ? 'select' : 'fill';
      }
      else if (/veteran/i.test(id)) {
        value = this.findDeclineOption(f) || 'I am not a protected veteran';
        type = f.type === 'react-select' ? 'react-select' : f.type === 'select' ? 'select' : 'fill';
      }
      else if (/disabil/i.test(id)) {
        value = this.findDeclineOption(f) || "I don't wish to answer";
        type = f.type === 'react-select' ? 'react-select' : f.type === 'select' ? 'select' : 'fill';
      }

      // === Source / referral ===
      else if (/how.*hear|how.*find|where.*hear|referral.*source|source/i.test(id)) {
        if (f.options?.length) {
          const match = f.options.find(o => /job.?board|other|internet|online/i.test(o));
          value = match || f.options[f.options.length > 1 ? 1 : 0] || 'Job Board';
        } else {
          value = 'Job Board';
        }
        if (f.type === 'select') type = 'select';
        else if (f.type === 'react-select') type = 'react-select';
      }

      // === Textarea questions (cover letter, why this company, etc.) ===
      else if (f.tag === 'textarea' || f.type === 'textarea') {
        if (/cover.?letter/i.test(id)) {
          value = `I am excited to apply for this position. With my background in ${candidate.skills?.slice(0, 3).join(', ') || 'software engineering'} and ${candidate.experienceLevel || 'relevant'} experience, I believe I would be a strong addition to the team. I am eager to contribute my skills and grow with the organization.`;
        } else if (/why.*want.*work|why.*interest|why.*apply|why.*this.*role/i.test(id)) {
          value = `I am drawn to this opportunity because it aligns with my skills in ${candidate.skills?.slice(0, 3).join(', ') || 'technology'}. I am passionate about contributing to innovative work and believe my ${candidate.experienceLevel || 'professional'} experience would make me a valuable team member.`;
        } else if (f.required && !f.currentValue) {
          // Generic required textarea — provide a reasonable answer
          value = `I am interested in this opportunity and look forward to discussing how my experience can contribute to your team.`;
        }
        type = 'fill';
      }

      // === Consent / agree checkboxes ===
      else if (/consent|agree|accept|gdpr|privacy|terms/i.test(id) && f.type === 'checkbox') {
        type = 'check';
        value = 'true';
      }

      // === Salary ===
      else if (/salary|compensation|pay/i.test(id) && f.required) {
        if (candidate.salaryMin) value = String(candidate.salaryMin);
        else value = '0'; // Let company decide
      }

      else continue;

      if (value) {
        actions.push({ selector: f.selector, value, type });
      }
    }
    return actions;
  }

  /** Find a "decline" or "don't wish to answer" option in field's option list */
  private findDeclineOption(field: FormField): string {
    if (!field.options?.length) return '';
    const patterns = [/decline/i, /don.?t wish/i, /prefer not/i, /not.?specified/i, /choose not/i];
    for (const pattern of patterns) {
      const match = field.options.find(o => pattern.test(o));
      if (match) return match;
    }
    return '';
  }

  // ==========================================
  // FORM FILLING
  // ==========================================

  private async executeFillActions(
    page: Page,
    actions: FillAction[],
    addLog: (action: string, result: string) => void
  ): Promise<void> {
    for (const action of actions) {
      try {
        console.log(`[AgentApply] fill: type=${action.type} sel="${action.selector}" val="${action.value?.substring(0, 50)}"`);
        switch (action.type) {
          case 'fill':
            await this.fillTextField(page, action.selector, action.value);
            break;
          case 'select':
            await this.fillNativeSelect(page, action.selector, action.value);
            break;
          case 'react-select':
            await this.fillReactSelect(page, action.selector, action.value);
            break;
          case 'check':
            await this.fillCheckbox(page, action.selector);
            break;
          case 'radio':
            await this.fillRadio(page, action.selector, action.value);
            break;
          case 'phone':
            await this.fillPhone(page, action.selector, action.value);
            break;
        }
        await this.randomDelay(150, 400);
      } catch (e: any) {
        addLog('fill_error', `${action.selector}: ${e.message}`);
      }
    }
  }

  private async fillTextField(page: Page, selector: string, value: string): Promise<void> {
    const el = await page.$(selector);
    if (!el) return;
    await el.click();
    await el.fill('');
    await this.randomDelay(50, 100);
    await el.fill(value);
  }

  private async fillNativeSelect(page: Page, selector: string, value: string): Promise<void> {
    const el = await page.$(selector);
    if (!el) return;
    await el.selectOption({ label: value }).catch(() =>
      el.selectOption({ value }).catch(() =>
        el.selectOption({ index: 1 }).catch(() => {})
      )
    );
  }

  private async fillReactSelect(page: Page, selector: string, searchText: string): Promise<void> {
    console.log(`[AgentApply] fillReactSelect: selector="${selector}" text="${searchText}"`);

    // Strategy: find the React Select control and its input
    // Greenhouse uses containers with IDs like "s2id_...", or class-based selectors
    let input = await page.$(`${selector} input[role="combobox"]`);
    if (!input) input = await page.$(`${selector} input[class*="select__input"]`);
    if (!input) input = await page.$(`${selector} input:not([type="hidden"])`);

    if (!input) {
      // Try clicking the control area to activate the input
      const control = await page.$(`${selector} [class*="select__control"]`);
      if (!control) {
        const container = await page.$(selector);
        if (!container) {
          console.log(`[AgentApply] fillReactSelect: selector "${selector}" not found in DOM`);
          // Try broader search: find React Select by nearby label text
          input = await this.findReactSelectByLabel(page, searchText, selector);
          if (!input) return;
        } else {
          await container.click();
          await this.randomDelay(300, 500);
          input = await page.$(`${selector} input`);
        }
      } else {
        await control.click();
        await this.randomDelay(300, 500);
        input = await page.$(`${selector} input`) || await page.$('input:focus');
      }
    }

    if (input) {
      await input.click();
      await this.randomDelay(100, 200);
      await input.fill('');
      await page.keyboard.type(searchText.substring(0, 30), { delay: 40 });
      console.log(`[AgentApply] fillReactSelect: typed "${searchText.substring(0, 30)}" into input`);
    } else {
      console.log(`[AgentApply] fillReactSelect: no input found for "${selector}", trying keyboard.type`);
      const el = await page.$(selector);
      if (!el) return;
      await el.click();
      await this.randomDelay(200, 300);
      await page.keyboard.type(searchText.substring(0, 30), { delay: 40 });
    }

    // Wait for dropdown options
    await page.waitForSelector('[class*="select__option"], [class*="option"]', { timeout: 3000 }).catch(() => {});
    await this.randomDelay(300, 500);

    // Click matching option
    const options = await page.$$('[class*="select__option"]:not([class*="disabled"])');
    console.log(`[AgentApply] fillReactSelect: found ${options.length} options`);

    if (options.length > 0) {
      let best = options[0];
      const searchLower = searchText.toLowerCase();
      for (const opt of options) {
        const text = await opt.textContent();
        if (text?.toLowerCase().includes(searchLower)) {
          best = opt;
          break;
        }
      }
      const text = await best.textContent();
      await best.click();
      console.log(`[AgentApply] fillReactSelect: selected "${text?.trim()}"`);
    } else {
      await page.keyboard.press('Enter');
      console.log(`[AgentApply] fillReactSelect: no options visible, pressed Enter`);
    }
    await this.randomDelay(200, 400);
  }

  /** Find a React Select by searching for its label text in the DOM */
  private async findReactSelectByLabel(page: Page, labelHint: string, originalSelector: string): Promise<any> {
    // Dump all React Select containers for debugging
    const reactSelectInfo = await page.evaluate(() => {
      const selects = document.querySelectorAll('[class*="select__control"]');
      return Array.from(selects).map(s => {
        const container = s.closest('[id]');
        const label = container?.closest('.field, .form-group, [class*="field"]')?.querySelector('label');
        return {
          id: container?.getAttribute('id') || 'no-id',
          label: label?.textContent?.trim() || 'no-label',
          classes: s.className.substring(0, 100),
        };
      });
    });
    console.log(`[AgentApply] All React Selects on page: ${JSON.stringify(reactSelectInfo)}`);
    return null;
  }

  private async fillCheckbox(page: Page, selector: string): Promise<void> {
    const el = await page.$(selector);
    if (!el) return;
    const checked = await el.isChecked().catch(() => false);
    if (!checked) await el.check();
  }

  private async fillRadio(page: Page, selector: string, labelText: string): Promise<void> {
    // Find radio by group name and label text
    const name = selector.replace('[name="', '').replace('"]', '').replace('#', '');
    // Try finding radio by label text
    const radios = await page.$$(`input[type="radio"][name="${name}"], input[type="radio"][name*="${name}"]`);
    for (const radio of radios) {
      const id = await radio.getAttribute('id');
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        if (label) {
          const text = await label.textContent();
          if (text?.toLowerCase().includes(labelText.toLowerCase())) {
            await radio.click();
            return;
          }
        }
      }
    }
    // Fallback: click first radio
    if (radios.length > 0) await radios[0].click();
  }

  private async fillPhone(page: Page, selector: string, phone: string): Promise<void> {
    const digits = phone.replace(/[^\d]/g, '').replace(/^1/, '');
    const fullNumber = '+1' + digits;

    // Try ITI API first
    const success = await page.evaluate(({ sel, num }) => {
      const input = document.querySelector(sel) as HTMLInputElement & { iti?: any };
      if (!input) return false;
      if (input.iti && typeof input.iti.setCountry === 'function') {
        input.iti.setCountry('us');
        input.iti.setNumber(num);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      // Direct value set
      input.value = num;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return false;
    }, { sel: selector, num: fullNumber });

    if (!success) {
      // Fallback: click and type
      const el = await page.$(selector);
      if (el) { await el.click(); await el.fill(fullNumber); }
    }
    console.log(`[AgentApply] Phone ${selector}: ${fullNumber}`);
  }

  // ==========================================
  // FILE UPLOAD
  // ==========================================

  private async uploadFile(page: Page, selector: string, filePath: string): Promise<void> {
    const selectors = [
      selector,
      'input[type="file"]',
      'input[type="file"][name*="resume"]',
      'input[type="file"][id*="resume"]',
      'input[type="file"][accept*="pdf"]',
    ];
    for (const s of selectors) {
      try {
        const el = await page.$(s);
        if (el) { await el.setInputFiles(filePath); return; }
      } catch { /* try next */ }
    }
  }

  // ==========================================
  // NAVIGATION HELPERS
  // ==========================================

  private async hasFormFields(page: Page): Promise<boolean> {
    const count = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select');
      return inputs.length;
    });
    return count >= 2;
  }

  private async clickApplyButton(page: Page): Promise<boolean> {
    const selectors = [
      'button:has-text("Apply for this role")',
      'a:has-text("Apply for this role")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'a[href*="apply"]',
      '[data-qa="apply-button"]',
      '.apply-button',
      '#apply-button',
    ];
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          return true;
        }
      } catch { /* continue */ }
    }
    return false;
  }

  private async clickNextOrSubmit(page: Page): Promise<string | null> {
    // Prefer Next/Continue over Submit (multi-step forms)
    const nextSelectors = [
      { sel: 'button:has-text("Next")', label: 'Next' },
      { sel: 'button:has-text("Continue")', label: 'Continue' },
      { sel: 'button:has-text("Save & Next")', label: 'Save & Next' },
      { sel: 'a:has-text("Next")', label: 'Next' },
    ];
    for (const { sel, label } of nextSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible() && !await btn.isDisabled()) {
          await this.randomDelay(300, 600);
          await btn.click();
          return label;
        }
      } catch { /* try next */ }
    }

    // Submit buttons
    const submitSelectors = [
      { sel: 'button[type="submit"]', label: 'Submit' },
      { sel: 'input[type="submit"]', label: 'Submit' },
      { sel: 'button:has-text("Submit Application")', label: 'Submit Application' },
      { sel: 'button:has-text("Submit")', label: 'Submit' },
      { sel: 'button:has-text("Apply")', label: 'Apply' },
      { sel: 'button:has-text("Send")', label: 'Send' },
      { sel: 'button:has-text("Complete")', label: 'Complete' },
      { sel: '#submit_app', label: 'Submit' },
    ];
    for (const { sel, label } of submitSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible() && !await btn.isDisabled()) {
          await this.randomDelay(400, 800);
          await btn.click();
          return label;
        }
      } catch { /* try next */ }
    }

    return null;
  }

  // ==========================================
  // VERIFICATION
  // ==========================================

  private async checkSuccess(page: Page): Promise<boolean> {
    const bodyText = await page.textContent('body').catch(() => '') || '';
    const lowerText = bodyText.toLowerCase();
    const url = page.url();

    const successPhrases = [
      'your application has been submitted',
      'application submitted successfully',
      'we received your application',
      'thanks for applying',
      'thank you for applying',
      'your application was submitted',
      'application received',
      'successfully submitted',
    ];
    for (const phrase of successPhrases) {
      if (lowerText.includes(phrase)) return true;
    }
    if (/confirm|thank.*you|success|submitted/i.test(url)) return true;

    // Check for confirmation elements
    const confirmSelectors = ['#application_confirmation', '.confirmation', '#confirmation', '[data-qa="success-message"]'];
    for (const sel of confirmSelectors) {
      const el = await page.$(sel);
      if (el && await el.isVisible().catch(() => false)) return true;
    }

    return false;
  }

  private async extractValidationErrors(page: Page): Promise<string> {
    try {
      const errors = await page.evaluate(() => {
        const selectors = [
          '.field-error', '.error-message', '.form-error', '.field--error',
          '[role="alert"]', '.invalid-feedback', '#s_alert',
        ];
        const texts: string[] = [];
        for (const sel of selectors) {
          for (const el of document.querySelectorAll(sel)) {
            const text = el.textContent?.trim();
            if (text && text.length > 2 && text.length < 200) texts.push(text);
          }
        }
        // Also check for elements with "error" in class that are visible
        for (const el of document.querySelectorAll('[class*="error"]')) {
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 200 && !texts.includes(text)) texts.push(text);
        }
        return [...new Set(texts)].slice(0, 8);
      });
      return errors.join('; ');
    } catch {
      return '';
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private async dismissOverlays(page: Page): Promise<void> {
    const selectors = [
      'button:has-text("Accept All")', 'button:has-text("Accept")',
      'button:has-text("OK")', 'button:has-text("Got it")',
      'button:has-text("I Agree")', '#onetrust-accept-btn-handler',
      '[data-testid="cookie-accept"]',
    ];
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) { await el.click(); return; }
      } catch { /* continue */ }
    }
  }

  private async takeScreenshot(page: Page): Promise<string> {
    try {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 50, fullPage: false });
      return buffer.toString('base64').substring(0, 50000);
    } catch {
      return '';
    }
  }

  private randomDelay(min: number, max: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
  }
}

export const agentApplyService = new AgentApplyService();
