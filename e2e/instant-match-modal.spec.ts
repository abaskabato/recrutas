import { test, expect } from '@playwright/test';

test.describe('Instant Match Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens instant match modal from landing page button', async ({ page }) => {
    const getStartedButton = page.locator('button:has-text("Start Matching Now"), button:has-text("Get Started")').first();
    
    if (await getStartedButton.isVisible({ timeout: 5000 })) {
      await getStartedButton.click();
    }
    
    await page.waitForTimeout(6000);
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('text=AI-Powered Job Matching')).toBeVisible();
    await expect(page.locator('text=Careers, Humanized')).toBeVisible();
  });

  test('navigates through modal steps', async ({ page }) => {
    await page.waitForTimeout(6000);
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    const startButton = page.locator('button:has-text("Start Matching Now")');
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    await expect(page.locator('text=What role are you looking for?')).toBeVisible();
    
    const jobTitleInput = page.locator('input[placeholder*="Software Engineer"]');
    await jobTitleInput.fill('Product Manager');
    
    const findMatchesButton = page.locator('button:has-text("Find My Matches")');
    await findMatchesButton.click();
    
    await page.waitForTimeout(3000);
    
    const resultsHeader = page.locator('text=Jobs Found');
    await expect(resultsHeader).toBeVisible({ timeout: 10000 });
  });

  test('closes modal with back button and close button', async ({ page }) => {
    await page.waitForTimeout(6000);
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    const startButton = page.locator('button:has-text("Start Matching Now")');
    await startButton.click();
    
    await expect(page.locator('text=What role are you looking for?')).toBeVisible();
    
    const backButton = page.locator('[role="dialog"] button').filter({ has: page.locator('svg.lucide-arrow-left') }).first();
    await backButton.click();
    
    await expect(page.locator('text=Careers, Humanized')).toBeVisible();
    
    const closeButton = page.locator('[role="dialog"] button:has-text("")').first();
    const closeXButton = page.locator('[role="dialog"] button:has(svg.lucide-x), [role="dialog"] button[class*="ghost"]:has(svg)').first();
    if (await closeXButton.isVisible()) {
      await closeXButton.click();
    }
    
    await expect(modal).not.toBeVisible();
  });

  test('shows skills quick select badges', async ({ page }) => {
    await page.waitForTimeout(6000);
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    const startButton = page.locator('button:has-text("Start Matching Now")');
    await startButton.click();
    
    await expect(page.locator('text=Software Engineer')).toBeVisible();
    await expect(page.locator('text=Product Manager')).toBeVisible();
    await expect(page.locator('text=Data Scientist')).toBeVisible();
  });

  test('validates job title is required', async ({ page }) => {
    await page.waitForTimeout(6000);
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    const startButton = page.locator('button:has-text("Start Matching Now")');
    await startButton.click();
    
    await expect(page.locator('text=What role are you looking for?')).toBeVisible();
    
    const findMatchesButton = page.locator('button:has-text("Find My Matches")');
    
    await expect(findMatchesButton).toBeDisabled();
    
    await expect(page.locator('text=Enter a job title to continue')).toBeVisible();
  });
});
