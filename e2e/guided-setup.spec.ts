import { test, expect } from '@playwright/test';

const CANDIDATE_EMAIL = process.env.TEST_CANDIDATE_EMAIL || '';
const CANDIDATE_PASSWORD = process.env.TEST_CANDIDATE_PASSWORD || '';
const TALENT_EMAIL = process.env.TEST_TALENT_EMAIL || '';
const TALENT_PASSWORD = process.env.TEST_TALENT_PASSWORD || '';

test('candidate login - should navigate to dashboard or role-selection, not 404', async ({ page }) => {
  test.skip(!CANDIDATE_EMAIL || !CANDIDATE_PASSWORD, 'TEST_CANDIDATE_EMAIL / TEST_CANDIDATE_PASSWORD not set');

  await page.goto('http://localhost:5173/auth');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  await page.locator('input[type="email"]').fill(CANDIDATE_EMAIL);
  await page.locator('input[type="password"]').fill(CANDIDATE_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  await page.waitForTimeout(3000);

  const url = page.url();
  console.log('Final URL:', url);

  expect(url).not.toContain('404');
  expect(url).not.toContain('/auth');

  const bodyText = await page.locator('body').textContent();
  expect(bodyText).not.toContain('404');
});

test('talent login - should navigate to dashboard or role-selection, not 404', async ({ page }) => {
  test.skip(!TALENT_EMAIL || !TALENT_PASSWORD, 'TEST_TALENT_EMAIL / TEST_TALENT_PASSWORD not set');

  await page.goto('http://localhost:5173/auth');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  await page.locator('input[type="email"]').fill(TALENT_EMAIL);
  await page.locator('input[type="password"]').fill(TALENT_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  await page.waitForTimeout(3000);

  const url = page.url();
  console.log('Final URL:', url);

  expect(url).not.toContain('404');
  expect(url).not.toContain('/auth');

  const bodyText = await page.locator('body').textContent();
  expect(bodyText).not.toContain('404');
});
