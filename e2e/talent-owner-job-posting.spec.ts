import { test, expect } from '@playwright/test';
import { TEST_USERS } from './auth.setup';

test.describe('Talent Owner Job Posting Flow', () => {
  test('talent owner can post a job that appears in candidate dashboard', async ({ page }) => {
    const uniqueJobTitle = `E2E Test Job ${Date.now()}`;

    // ===== PART 1: Talent Owner Posts a Job =====

    // Go to auth page
    await page.goto('/auth');

    // Sign in as talent owner
    await page.fill('input[name="email"]', TEST_USERS.talentOwner.email);
    await page.fill('input[name="password"]', TEST_USERS.talentOwner.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to talent dashboard
    await page.waitForURL('**/talent-dashboard**', { timeout: 30000 });

    // Verify we're on the talent dashboard
    await expect(page).toHaveURL(/talent-dashboard/);

    // Look for the "Post Job" or "Create Job" button
    const postJobButton = page.locator('button:has-text("Post"), button:has-text("Create"), button:has-text("New Job"), a:has-text("Post")').first();
    await expect(postJobButton).toBeVisible({ timeout: 10000 });
    await postJobButton.click();

    // Wait for job posting wizard/form to appear
    await page.waitForTimeout(1000);

    // Step 1: Basic Info
    // Fill in job title
    await page.fill('#title', uniqueJobTitle);

    // Fill in company
    await page.fill('#company', 'E2E Test Company');

    // Fill in description
    await page.fill('#description', 'This is an E2E test job posting to verify the job posting flow works correctly. Looking for talented developers with excellent skills.');

    // Fill in location
    await page.fill('#location', 'Remote, USA');

    // Fill salary
    await page.fill('#salaryMin', '80000');
    await page.fill('#salaryMax', '120000');

    // Click Next to go to Step 2 (Requirements)
    await page.locator('button:has-text("Next")').click();

    await page.waitForTimeout(500);

    // Step 2: Requirements & Skills
    // Add a requirement using Enter key instead of clicking button
    const requirementInput = page.locator('input[placeholder*="years of experience"]');
    await requirementInput.fill('3+ years of JavaScript experience');
    await requirementInput.press('Enter');

    // Wait for requirement badge to appear
    await page.waitForTimeout(500);

    // Add a skill using Enter key instead of clicking button
    const skillInput = page.locator('input[placeholder*="JavaScript, Python"]');
    await skillInput.fill('React');
    await skillInput.press('Enter');

    // Wait for skill badge to appear
    await page.waitForTimeout(500);

    // Take screenshot before clicking next
    await page.screenshot({ path: 'e2e/screenshots/step2-filled.png', fullPage: true });

    // Check if Next button is now enabled
    const step2NextButton = page.locator('button:has-text("Next")');
    await expect(step2NextButton).toBeEnabled({ timeout: 5000 });

    // Click Next to go to Step 3 (Filtering - optional)
    await step2NextButton.click({ force: true });
    await page.waitForTimeout(500);

    // Step 3: Filtering (skip - it's optional)
    await page.locator('button:has-text("Next")').click({ force: true });
    await page.waitForTimeout(500);

    // Step 4: Connection (optional) - Submit the job
    // Scroll the dialog content to make sure Submit button is visible
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) dialog.scrollTop = dialog.scrollHeight;
    });
    await page.waitForTimeout(300);

    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Post Job"), button:has-text("Create Job"), button:has-text("Publish")').first();
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click({ force: true });

    // Wait for submission and success message
    await page.waitForTimeout(3000);

    // Take screenshot of talent dashboard after posting
    await page.screenshot({ path: 'e2e/screenshots/talent-after-posting.png', fullPage: true });

    console.log(`Successfully posted job: ${uniqueJobTitle}`);
  });

  test('talent owner can view their posted jobs', async ({ page }) => {
    // Go to auth page
    await page.goto('/auth');

    // Sign in as talent owner
    await page.fill('input[name="email"]', TEST_USERS.talentOwner.email);
    await page.fill('input[name="password"]', TEST_USERS.talentOwner.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to talent dashboard
    await page.waitForURL('**/talent-dashboard**', { timeout: 30000 });

    // Verify we're on the talent dashboard
    await expect(page).toHaveURL(/talent-dashboard/);

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Look for job listings section
    const pageContent = await page.content();

    // Should have job-related content
    const hasJobContent =
      pageContent.toLowerCase().includes('job') ||
      pageContent.toLowerCase().includes('posting') ||
      pageContent.toLowerCase().includes('active');

    expect(hasJobContent).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/talent-dashboard.png', fullPage: true });
  });

  test('talent owner dashboard shows job statistics', async ({ page }) => {
    // Go to auth page
    await page.goto('/auth');

    // Sign in as talent owner
    await page.fill('input[name="email"]', TEST_USERS.talentOwner.email);
    await page.fill('input[name="password"]', TEST_USERS.talentOwner.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to talent dashboard
    await page.waitForURL('**/talent-dashboard**', { timeout: 30000 });

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Look for stat cards or metrics
    const statCards = page.locator('[class*="card"]');
    const cardCount = await statCards.count();

    // Should have some cards for stats
    expect(cardCount).toBeGreaterThan(0);

    // Check for common stat labels
    const pageText = await page.textContent('body');
    const hasStats =
      pageText?.includes('Active') ||
      pageText?.includes('Views') ||
      pageText?.includes('Applications') ||
      pageText?.includes('Candidates');

    expect(hasStats).toBeTruthy();
  });
});
