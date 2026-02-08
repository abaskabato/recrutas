import { test, expect } from '@playwright/test';
import { loginAsRecruiter } from './auth.spec';

test('capture recruiter dashboard details', async ({ page }) => {
  await loginAsRecruiter(page);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/screenshots/recruiter-dashboard-detailed.png', fullPage: true });
  console.log('Recruiter dashboard captured');
});
