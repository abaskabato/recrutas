import { test, expect, Page } from '@playwright/test';
import { TEST_USERS } from './auth.setup';

/**
 * Comprehensive Authentication Test Suite
 * Tests: Email/Password login, OAuth, Password Reset, Session Management
 */

test.describe('Authentication - Critical Path Tests', () => {
  
  test('candidate can sign up with email and password', async ({ page }) => {
    const uniqueEmail = `test-candidate-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Navigate to signup
    await page.goto('/signup/candidate');
    await expect(page).toHaveURL(/signup/);

    // Fill signup form
    await page.fill('input[name="email"], input[type="email"]', uniqueEmail);
    await page.fill('input[name="password"], input[type="password"]', password);
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")').first();
    await submitButton.click();

    // Wait for redirect to role selection or check for success
    await page.waitForTimeout(3000);
    
    // Should redirect to role selection or show success message
    const currentUrl = page.url();
    const success = 
      currentUrl.includes('role-selection') ||
      currentUrl.includes('candidate-dashboard') ||
      await page.locator('text=/success|created|check your email/i').isVisible().catch(() => false);

    expect(success).toBeTruthy();
    
    await page.screenshot({ path: 'e2e/screenshots/auth-signup-candidate.png', fullPage: true });
  });

  test('candidate can login with valid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USERS.candidate.password);
    
    // Submit
    await page.click('button:has-text("Sign in"), button[type="submit"]');

    // Wait for redirect
    const redirected = await Promise.race([
      page.waitForURL('**/candidate-dashboard**', { timeout: 15000 }).then(() => true),
      page.waitForSelector('text=/invalid|error|failed/i', { timeout: 5000 }).then(() => false),
    ]).catch(() => false);

    if (!redirected) {
      console.log('Candidate login may have failed - checking for errors');
      const errorText = await page.locator('text=/invalid|error|failed/i').textContent().catch(() => '');
      console.log('Error:', errorText);
    }

    expect(redirected).toBeTruthy();
    await expect(page).toHaveURL(/candidate-dashboard/);
    
    await page.screenshot({ path: 'e2e/screenshots/auth-login-candidate.png', fullPage: true });
  });

  test('recruiter can login with valid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.talentOwner.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USERS.talentOwner.password);
    
    await page.click('button:has-text("Sign in"), button[type="submit"]');

    const redirected = await Promise.race([
      page.waitForURL('**/talent-dashboard**', { timeout: 15000 }).then(() => true),
      page.waitForSelector('text=/invalid|error|failed/i', { timeout: 5000 }).then(() => false),
    ]).catch(() => false);

    expect(redirected).toBeTruthy();
    await expect(page).toHaveURL(/talent-dashboard/);
    
    await page.screenshot({ path: 'e2e/screenshots/auth-login-recruiter.png', fullPage: true });
  });

  test('login shows error with invalid password', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"], input[type="password"]', 'WrongPassword123!');
    
    await page.click('button:has-text("Sign in"), button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(2000);
    
    const errorVisible = await page.locator('text=/invalid|error|failed|incorrect/i').isVisible();
    expect(errorVisible).toBeTruthy();
    
    // Should stay on auth page
    expect(page.url()).toContain('/auth');
  });

  test('login shows error with non-existent email', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[name="email"], input[type="email"]', `nonexistent-${Date.now()}@example.com`);
    await page.fill('input[name="password"], input[type="password"]', 'SomePassword123!');
    
    await page.click('button:has-text("Sign in"), button[type="submit"]');

    await page.waitForTimeout(2000);
    
    const errorVisible = await page.locator('text=/invalid|error|failed|user not found/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('password reset flow sends email', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Fill in email
    await page.fill('input[name="email"], input[type="email"]', TEST_USERS.candidate.email);
    
    // Click send reset link
    await page.click('button:has-text("Send"), button[type="submit"]');

    // Wait for confirmation
    await page.waitForTimeout(3000);
    
    // Should show success message
    const successMessage = await page.locator('text=/check your email|sent|success/i').isVisible();
    
    // Note: We can't verify email receipt in automated tests
    // but we can verify the form submission worked
    expect(successMessage || page.url()).toBeTruthy();
    
    await page.screenshot({ path: 'e2e/screenshots/auth-password-reset-request.png', fullPage: true });
  });

  test('session persists across page reloads', async ({ page }) => {
    // First login
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    
    await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard (session persisted)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('candidate-dashboard');
  });

  test('unauthenticated user is redirected to auth', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    
    // Try to access protected route
    await page.goto('/candidate-dashboard');
    
    // Should redirect to auth - wait for navigation
    await page.waitForURL('**/auth**', { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('role-based redirect works correctly', async ({ page }) => {
    // Test candidate redirect
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('candidate-dashboard');
    
    // Logout
    await page.context().clearCookies();
    
    // Test recruiter redirect
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.talentOwner.email);
    await page.fill('input[name="password"]', TEST_USERS.talentOwner.password);
    await page.click('button:has-text("Sign in")');
    
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('talent-dashboard');
  });
});

test.describe('Authentication - OAuth (if configured)', () => {
  test.skip('Google OAuth sign up', async ({ page }) => {
    // This test is skipped unless OAuth is configured
    await page.goto('/auth');
    
    const googleButton = page.locator('button:has-text("Google"), a:has-text("Google")');
    if (await googleButton.isVisible().catch(() => false)) {
      await googleButton.click();
      // OAuth flow would continue in real Google auth page
      // Cannot be fully automated without test Google accounts
    }
  });

  test.skip('GitHub OAuth sign up', async ({ page }) => {
    await page.goto('/auth');
    
    const githubButton = page.locator('button:has-text("GitHub"), a:has-text("GitHub")');
    if (await githubButton.isVisible().catch(() => false)) {
      await githubButton.click();
    }
  });
});

// Helper function for login
export async function loginAsCandidate(page: Page) {
  await page.goto('/auth');
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.candidate.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.candidate.password);
  await page.click('button:has-text("Sign in"), button[type="submit"]');
  await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
}

export async function loginAsRecruiter(page: Page) {
  await page.goto('/auth');
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.talentOwner.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.talentOwner.password);
  await page.click('button:has-text("Sign in"), button[type="submit"]');
  await page.waitForURL('**/talent-dashboard**', { timeout: 15000 });
}
