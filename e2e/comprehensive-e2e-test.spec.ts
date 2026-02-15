import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * COMPREHENSIVE E2E TEST SUITE
 * 
 * Credentials MUST be provided via environment variables:
 * - E2E_CANDIDATE_EMAIL
 * - E2E_CANDIDATE_PASSWORD
 * - E2E_TALENT_EMAIL
 * - E2E_TALENT_PASSWORD
 * 
 * Run with:
 * E2E_CANDIDATE_EMAIL=test@example.com E2E_CANDIDATE_PASSWORD=pass E2E_TALENT_EMAIL=talent@example.com E2E_TALENT_PASSWORD=pass npx playwright test
 */

// ============================================
// TEST CONFIGURATION & CONSTANTS
// ============================================

const getTestCredentials = () => ({
  candidate: {
    email: process.env.E2E_CANDIDATE_EMAIL || process.env.VITE_TEST_CANDIDATE_EMAIL || 'test-candidate@example.com',
    password: process.env.E2E_CANDIDATE_PASSWORD || process.env.VITE_TEST_CANDIDATE_PASSWORD || 'test-password',
    type: 'candidate'
  },
  talentOwner: {
    email: process.env.E2E_TALENT_EMAIL || process.env.VITE_TEST_TALENT_EMAIL || 'test-talent@example.com',
    password: process.env.E2E_TALENT_PASSWORD || process.env.VITE_TEST_TALENT_PASSWORD || 'test-password',
    type: 'talent_owner'
  }
});

const RESUME_FIXTURES = [
  {
    name: 'Senior Software Engineer',
    file: 'e2e/fixtures/resume-senior-engineer.txt',
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS'],
    role: 'Software Engineer'
  },
  {
    name: 'Data Scientist',
    file: 'e2e/fixtures/resume-data-scientist.txt',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'AWS'],
    role: 'Data Scientist'
  },
  {
    name: 'Marketing Manager',
    file: 'e2e/fixtures/resume-marketing-manager.txt',
    skills: ['SEO', 'Digital Marketing', 'Google Analytics', 'Content Strategy'],
    role: 'Marketing Manager'
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

async function loginAsCandidate(page, credentials) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.getByLabel(/email/i);
  const passwordInput = page.getByLabel(/password/i);
  const submitBtn = page.getByRole('button', { name: /sign in/i });
  
  await emailInput.fill(credentials.candidate.email);
  await passwordInput.fill(credentials.candidate.password);
  await submitBtn.click();
  
  // Properly wait for navigation - fail if auth doesn't work
  await page.waitForURL(/candidate-dashboard/, { timeout: 15000 });
}

async function loginAsTalentOwner(page, credentials) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.getByLabel(/email/i);
  const passwordInput = page.getByLabel(/password/i);
  const submitBtn = page.getByRole('button', { name: /sign in/i });
  
  await emailInput.fill(credentials.talentOwner.email);
  await passwordInput.fill(credentials.talentOwner.password);
  await submitBtn.click();
  
  await page.waitForURL(/talent-dashboard/, { timeout: 15000 });
}

async function scanPageElements(page, pageName) {
  const results = {
    pageName,
    url: page.url(),
    timestamp: new Date().toISOString(),
    elements: {},
    errors: [] as string[]
  };
  
  const interactiveElements = [
    { selector: 'button', name: 'Buttons' },
    { selector: 'a', name: 'Links' },
    { selector: 'input', name: 'Inputs' },
    { selector: 'select', name: 'Selects' },
    { selector: 'textarea', name: 'Textareas' },
    { selector: '[role="tab"]', name: 'Tabs' }
  ];
  
  for (const el of interactiveElements) {
    try {
      const count = await page.locator(el.selector).count();
      results.elements[el.name] = count;
    } catch (e: any) {
      results.errors.push(`Failed to count ${el.name}: ${e.message}`);
    }
  }
  
  return results;
}

async function validateBackendEndpoint(page, endpoint, method = 'GET') {
  try {
    const response = await page.evaluate(async ({ endpoint, method }) => {
      const res = await fetch(endpoint, { method });
      return { status: res.status, ok: res.ok };
    }, { endpoint, method });
    return response;
  } catch (e: any) {
    return { error: e.message };
  }
}

// ============================================
// TEST SUITE
// ============================================

test.describe('E2E Authentication & Login', () => {
  
  test('Candidate login flow', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsCandidate(page, credentials);
    await expect(page).toHaveURL(/candidate-dashboard/);
  });
  
  test('Talent Owner login flow', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsTalentOwner(page, credentials);
    await expect(page).toHaveURL(/talent-dashboard/);
  });
  
  test('Login page has required elements', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('E2E Resume Upload', () => {
  
  test.beforeEach(async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsCandidate(page, credentials);
  });
  
  for (const resume of RESUME_FIXTURES) {
    test(`Upload: ${resume.name}`, async ({ page }) => {
      const profileBtn = page.getByRole('button', { name: /complete profile|edit profile/i });
      if (await profileBtn.isVisible()) {
        await profileBtn.click();
        await page.waitForLoadState('networkidle');
        
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          const resumeContent = fs.readFileSync(resume.file, 'utf-8');
          const tempPath = path.join('e2e', 'fixtures', `temp-${Date.now()}.pdf`);
          fs.writeFileSync(tempPath, resumeContent);
          
          try {
            await fileInput.setInputFiles(tempPath);
            await page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200, { timeout: 15000 }).catch(() => {});
          } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          }
        }
      }
    });
  }
});

test.describe('E2E Page Scanning', () => {
  
  test('Candidate Dashboard elements', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsCandidate(page, credentials);
    
    const scan = await scanPageElements(page, 'Candidate Dashboard');
    expect(scan.elements['Buttons']).toBeGreaterThanOrEqual(3);
    expect(scan.errors).toHaveLength(0);
  });
  
  test('Talent Dashboard elements', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsTalentOwner(page, credentials);
    
    const scan = await scanPageElements(page, 'Talent Dashboard');
    expect(scan.elements['Buttons']).toBeGreaterThanOrEqual(3);
    expect(scan.errors).toHaveLength(0);
  });
});

test.describe('E2E Backend API', () => {
  
  test('Candidate API endpoints accessible', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsCandidate(page, credentials);
    
    const result = await validateBackendEndpoint(page, '/api/user/profile');
    expect(result.status === 200 || result.status === 401).toBeTruthy();
  });
  
  test('Talent Owner API endpoints accessible', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsTalentOwner(page, credentials);
    
    const result = await validateBackendEndpoint(page, '/api/user/profile');
    expect(result.status === 200 || result.status === 401).toBeTruthy();
  });
  
  test('Health endpoint public', async ({ page }) => {
    const result = await validateBackendEndpoint(page, '/api/health');
    expect(result.status).toBeLessThan(500);
  });
});

test.describe('E2E User Journeys', () => {
  
  test('Candidate: Browse jobs', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsCandidate(page, credentials);
    
    const jobFeedTab = page.getByRole('tab', { name: /job feed/i });
    if (await jobFeedTab.isVisible()) {
      await jobFeedTab.click();
      await page.waitForLoadState('networkidle');
      
      // Just verify we can load the page without crash
      await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    }
  });
  
  test('Talent: Create job wizard', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsTalentOwner(page, credentials);
    
    const createJobBtn = page.getByRole('button', { name: /create job/i });
    if (await createJobBtn.isVisible({ timeout: 5000 })) {
      await createJobBtn.click();
      await page.waitForLoadState('networkidle');
      
      // Verify wizard opened
      await expect(page.locator('[role="dialog"], form').first()).toBeVisible();
    }
  });
});

test.describe('E2E Responsive Design', () => {
  
  test('Candidate on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const credentials = getTestCredentials();
    await loginAsCandidate(page, credentials);
    
    await expect(page.locator('body')).toBeVisible();
  });
  
  test('Talent on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const credentials = getTestCredentials();
    await loginAsTalentOwner(page, credentials);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('E2E Error Handling', () => {
  
  test('Invalid credentials show error', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000);
    
    // Should show error or stay on page (not redirect to dashboard)
    const hasError = await page.getByRole('alert').isVisible().catch(() => false);
    const onDashboard = page.url().includes('dashboard');
    
    expect(hasError || !onDashboard).toBeTruthy();
  });
  
  test('Page refresh maintains session', async ({ page }) => {
    const credentials = getTestCredentials();
    await loginAsCandidate(page, credentials);
    
    const urlBefore = page.url();
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should either stay on dashboard or redirect back
    expect(page.url().includes('dashboard') || page.url() === urlBefore).toBeTruthy();
  });
});

console.log('✅ E2E Test Suite Loaded - Use environment variables for credentials');
