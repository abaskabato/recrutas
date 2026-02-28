import { test, expect } from '@playwright/test';

test('candidate login - should navigate to dashboard or role-selection, not 404', async ({ page }) => {
  await page.goto('http://localhost:5173/auth');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  
  await page.locator('input[type="email"]').fill('abaskabato@gmail.com');
  await page.locator('input[type="password"]').fill('123456');
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
  await page.goto('http://localhost:5173/auth');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  
  await page.locator('input[type="email"]').fill('rainierit@proton.me');
  await page.locator('input[type="password"]').fill('rainierit08');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  
  await page.waitForTimeout(3000);
  
  const url = page.url();
  console.log('Final URL:', url);
  
  expect(url).not.toContain('404');
  expect(url).not.toContain('/auth');
  
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).not.toContain('404');
});
