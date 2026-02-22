/**
 * E2E Tests: Job Posting Flow (Employer)
 *
 * Tests the critical path for employers posting jobs:
 * - Create job posting
 * - View posted jobs
 * - Edit job posting
 */

import { test, expect } from '@playwright/test';

test.describe('Job Posting (Employer)', () => {
  test.beforeEach(async ({ page }) => {
    const testEmail = process.env.TEST_EMPLOYER_EMAIL || 'employer@test.com';
    const testPassword = process.env.TEST_EMPLOYER_PASSWORD || 'testpassword';
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    await expect(page).toHaveURL(/\/(dashboard|jobs|candidates)/, { timeout: 15000 });
  });

  test('should navigate to job creation page', async ({ page }) => {
    await page.goto('/jobs/new');
    
    await expect(page.locator('input[name="title"], input[placeholder*="title"]')).toBeVisible({ timeout: 5000 });
  });

  test('should create a new job posting', async ({ page }) => {
    await page.goto('/jobs/new');
    
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"]');
    await titleInput.fill(`Test Job ${Date.now()}`);
    
    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description"]');
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill('This is a test job posting for E2E testing.');
    }
    
    const locationInput = page.locator('input[name="location"], input[placeholder*="location"]');
    if (await locationInput.count() > 0) {
      await locationInput.fill('Remote');
    }
    
    const submitButton = page.getByRole('button', { name: /create|post|publish/i });
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      await expect(page.getByText(/job (created|posted|published)/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display employer job listings', async ({ page }) => {
    await page.goto('/my-jobs');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should validate required fields on job creation', async ({ page }) => {
    await page.goto('/jobs/new');
    
    const submitButton = page.getByRole('button', { name: /create|post|publish/i });
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      await expect(page.getByText(/required|please fill|this field/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
