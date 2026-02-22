/**
 * E2E Tests: Authentication Flow
 *
 * Tests critical authentication paths:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Logout
 * - Protected route access
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';
    
    await page.goto('/login');
    
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    await expect(page).toHaveURL(/\/(dashboard|jobs|candidates)/, { timeout: 15000 });
  });

  test('should prevent access to protected routes when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    await expect(page).toHaveURL(/\/(dashboard|jobs|candidates)/, { timeout: 15000 });
    
    await page.getByRole('button', { name: /logout|sign out/i }).or(
      page.locator('[data-testid="logout-button"]')
    ).click();
    
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
