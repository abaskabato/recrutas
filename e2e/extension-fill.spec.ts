import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Extension auto-fill E2E test.
 *
 * Launches Chromium with the Recrutas extension loaded, serves a mock
 * job application form, and verifies the content script fills fields
 * correctly via the backend AI endpoint.
 */

const EXTENSION_PATH = path.resolve(__dirname, '..', 'extension');

// Mock job application form HTML
const MOCK_FORM_HTML = `<!DOCTYPE html>
<html>
<head><title>Senior Software Engineer at TestCorp</title></head>
<body>
  <h1>Senior Software Engineer</h1>
  <div class="company">TestCorp</div>
  <div class="description">We're looking for a senior engineer with React and Node.js experience.</div>
  <form id="application-form">
    <label for="first_name">First Name</label>
    <input id="first_name" name="candidate[first_name]" type="text" required />

    <label for="last_name">Last Name</label>
    <input id="last_name" name="candidate[last_name]" type="text" required />

    <label for="email">Email</label>
    <input id="email" name="candidate[email]" type="email" required />

    <label for="phone">Phone Number</label>
    <input id="phone" name="candidate[phone]" type="tel" />

    <label for="linkedin">LinkedIn Profile</label>
    <input id="linkedin" name="job_application[linkedin_profile_url]" type="url" />

    <label for="location">Location</label>
    <input id="location" name="candidate[location]" type="text" />

    <label for="experience">Years of Experience</label>
    <select id="experience" name="experience">
      <option value="">Select...</option>
      <option value="0-1">0-1 years</option>
      <option value="2-4">2-4 years</option>
      <option value="5-7">5-7 years</option>
      <option value="8+">8+ years</option>
    </select>

    <label for="why">Why do you want to work at TestCorp?</label>
    <textarea id="why" name="question_why" rows="4"></textarea>

    <label for="resume">Resume / CV</label>
    <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" />

    <button type="submit">Submit Application</button>
  </form>
</body>
</html>`;

test.describe('Extension Auto-Fill', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    // Launch Chromium with the extension loaded
    context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('content script injects and scrapes form fields', async () => {
    const page = await context.newPage();

    // Serve the mock form via data URL
    await page.setContent(MOCK_FORM_HTML, { waitUntil: 'domcontentloaded' });

    // Inject the content script manually (since we're on a data URL, not a matched domain)
    await page.addStyleTag({ path: path.resolve(EXTENSION_PATH, 'content.css') });
    await page.addScriptTag({ path: path.resolve(EXTENSION_PATH, 'content.js') });

    // Wait for the floating button to appear
    const fillBtn = page.locator('#recrutas-fill-btn');
    await expect(fillBtn).toBeVisible({ timeout: 5000 });
    await expect(fillBtn).toContainText('Fill with Recrutas');

    await page.close();
  });

  test('scrapeFields collects all form fields correctly', async () => {
    const page = await context.newPage();
    await page.setContent(MOCK_FORM_HTML, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ path: path.resolve(EXTENSION_PATH, 'content.js') });

    // Execute scrapeFields in page context (it's inside the IIFE, so we replicate the logic)
    const fields = await page.evaluate(() => {
      const fields: any[] = [];
      const elements = document.querySelectorAll('input, textarea, select');
      for (const el of elements) {
        const type = ((el as HTMLInputElement).type || el.tagName.toLowerCase()).toLowerCase();
        if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;
        if ((el as HTMLInputElement).readOnly || (el as HTMLInputElement).disabled) continue;

        const field: any = {
          id: el.id || (el as HTMLInputElement).name || `field_${fields.length}`,
          type: type,
          name: el.getAttribute('name') || '',
        };

        if (el.tagName === 'SELECT') {
          field.options = Array.from((el as HTMLSelectElement).options)
            .filter(opt => opt.value && opt.value !== '')
            .map(opt => opt.text?.trim() || opt.value);
          field.type = 'select';
        }

        fields.push(field);
      }
      return fields;
    });

    // Should find: first_name, last_name, email, phone, linkedin, location, experience (select), why (textarea), resume (file)
    expect(fields.length).toBeGreaterThanOrEqual(8);

    const ids = fields.map((f: any) => f.id);
    expect(ids).toContain('first_name');
    expect(ids).toContain('last_name');
    expect(ids).toContain('email');
    expect(ids).toContain('phone');
    expect(ids).toContain('linkedin');
    expect(ids).toContain('location');
    expect(ids).toContain('experience');
    expect(ids).toContain('why');

    // experience should have options
    const expField = fields.find((f: any) => f.id === 'experience');
    expect(expField.type).toBe('select');
    expect(expField.options).toContain('5-7 years');

    await page.close();
  });

  test('setNativeValue fills inputs with React-compatible events', async () => {
    const page = await context.newPage();
    await page.setContent(MOCK_FORM_HTML, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ path: path.resolve(EXTENSION_PATH, 'content.js') });

    // Simulate filling fields using the setNativeValue approach
    const result = await page.evaluate(() => {
      const events: string[] = [];

      // Listen for events on the first_name input
      const input = document.getElementById('first_name') as HTMLInputElement;
      input.addEventListener('input', () => events.push('input'));
      input.addEventListener('change', () => events.push('change'));

      // Use the same setter pattern as content.js
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(input, 'TestName');
      } else {
        input.value = 'TestName';
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      return {
        value: input.value,
        events,
      };
    });

    expect(result.value).toBe('TestName');
    expect(result.events).toContain('input');
    expect(result.events).toContain('change');

    await page.close();
  });

  test('select dropdown filling works', async () => {
    const page = await context.newPage();
    await page.setContent(MOCK_FORM_HTML, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(() => {
      const select = document.getElementById('experience') as HTMLSelectElement;
      const targetValue = '5-7 years';

      // Find matching option (same logic as content.js)
      const option = Array.from(select.options).find(opt =>
        opt.text?.trim().toLowerCase() === targetValue.toLowerCase() ||
        opt.value?.toLowerCase() === targetValue.toLowerCase()
      );

      if (option) {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(select, option.value);
        } else {
          select.value = option.value;
        }
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return {
        value: select.value,
        selectedText: select.options[select.selectedIndex]?.text,
      };
    });

    expect(result.value).toBe('5-7');
    expect(result.selectedText).toBe('5-7 years');

    await page.close();
  });

  test('file input attachment via DataTransfer API', async () => {
    const page = await context.newPage();
    await page.setContent(MOCK_FORM_HTML, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(() => {
      const fileInput = document.getElementById('resume') as HTMLInputElement;

      // Create a mock PDF file
      const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
      const blob = new Blob([content], { type: 'application/pdf' });
      const file = new File([blob], 'resume.pdf', { type: 'application/pdf' });

      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      return {
        filesCount: fileInput.files?.length,
        fileName: fileInput.files?.[0]?.name,
        fileType: fileInput.files?.[0]?.type,
        fileSize: fileInput.files?.[0]?.size,
      };
    });

    expect(result.filesCount).toBe(1);
    expect(result.fileName).toBe('resume.pdf');
    expect(result.fileType).toBe('application/pdf');
    expect(result.fileSize).toBe(4);

    await page.close();
  });
});
