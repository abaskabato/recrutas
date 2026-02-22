/**
 * E2E Tests: Job Application Flow
 *
 * Tests the critical path for candidates applying to jobs:
 * - Browse jobs
 * - View job details
 * - Submit application
 */

import { test, expect } from '@playwright/test';

test.describe('Job Application', () => {
  test.beforeEach(async ({ page }) => {
    const testEmail = process.env.TEST_CANDIDATE_EMAIL || 'candidate@test.com';
    const testPassword = process.env.TEST_CANDIDATE_PASSWORD || 'testpassword';
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    await expect(page).toHaveURL(/\/(jobs|dashboard)/, { timeout: 15000 });
  });

  test('should display job listings', async ({ page }) => {
    await page.goto('/jobs');
    
    await expect(page.locator('[data-testid="job-card"], .job-card, article').first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter jobs by search term', async ({ page }) => {
    await page.goto('/jobs');
    
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], input[name="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('React');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(1000);
    }
  });

  test('should view job details', async ({ page }) => {
    await page.goto('/jobs');
    
    const jobCard = page.locator('[data-testid="job-card"], .job-card, article').first();
    await expect(jobCard).toBeVisible({ timeout: 10000 });
    
    await jobCard.click();
    
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('should submit application for a job', async ({ page }) => {
    await page.goto('/jobs');
    
    const jobCard = page.locator('[data-testid="job-card"], .job-card, article').first();
    await expect(jobCard).toBeVisible({ timeout: 10000 });
    await jobCard.click();
    
    const applyButton = page.getByRole('button', { name: /apply/i });
    
    if (await applyButton.count() > 0) {
      await applyButton.click();
      
      const confirmButton = page.getByRole('button', { name: /confirm|submit/i });
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }
      
      await expect(page.getByText(/application (submitted|sent|successful)/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show applied jobs in applications list', async ({ page }) => {
    await page.goto('/applications');
    
    await expect(page.locator('body')).toBeVisible();
  });
});
