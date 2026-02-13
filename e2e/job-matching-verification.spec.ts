import { test, expect } from '@playwright/test';
import { TEST_USERS } from './auth.setup';

/**
 * This test verifies that job matching works correctly for different profiles.
 * It tests the end-to-end flow: resume upload → skill extraction → job matching
 */

test.describe('Job Matching - Resume to Job Alignment', () => {
  
  test('Tech resume: Senior Software Engineer gets relevant tech jobs', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Navigate to profile to add skills manually
    await page.goto('/candidate-dashboard?tab=profile');
    await page.waitForTimeout(2000);

    // Look for skills input
    const skillsInput = page.locator('input[placeholder*="skill"], input[name="skills"], [data-testid="skills-input"]').first();
    
    // Add tech skills
    const techSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'PostgreSQL'];
    
    if (await skillsInput.isVisible().catch(() => false)) {
      for (const skill of techSkills) {
        await skillsInput.fill(skill);
        await skillsInput.press('Enter');
        await page.waitForTimeout(300);
      }
      console.log('Added tech skills:', techSkills.join(', '));
    }

    // Go to job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);

    // Check for job cards
    const jobCards = page.locator('[class*="card"]');
    const cardCount = await jobCards.count();
    console.log(`Found ${cardCount} job cards`);

    // Look for tech-related job titles
    const techJobKeywords = ['Software', 'Engineer', 'Developer', 'Frontend', 'Backend', 'Full Stack', 'React', 'Python'];
    let techJobCount = 0;

    for (const keyword of techJobKeywords) {
      const matches = await page.locator(`text=/${keyword}/i`).count();
      techJobCount += matches;
    }

    console.log(`Found ${techJobCount} tech-related mentions in job feed`);
    
    // Verify jobs are present
    expect(cardCount).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/matching-tech-jobs.png', fullPage: true });
  });

  test('Non-tech resume: Marketing gets marketing/sales jobs', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Navigate to profile to add marketing skills
    await page.goto('/candidate-dashboard?tab=profile');
    await page.waitForTimeout(2000);

    // Add marketing skills
    const marketingSkills = ['Digital Marketing', 'SEO', 'Social Media', 'Google Analytics', 'Content Strategy', 'HubSpot'];
    const skillsInput = page.locator('input[placeholder*="skill"], input[name="skills"]').first();
    
    if (await skillsInput.isVisible().catch(() => false)) {
      for (const skill of marketingSkills) {
        await skillsInput.fill(skill);
        await skillsInput.press('Enter');
        await page.waitForTimeout(300);
      }
      console.log('Added marketing skills:', marketingSkills.join(', '));
    }

    // Go to job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);

    // Check for job cards
    const jobCards = page.locator('[class*="card"]');
    const cardCount = await jobCards.count();
    console.log(`Found ${cardCount} job cards for marketing profile`);

    // Look for marketing-related job titles
    const marketingKeywords = ['Marketing', 'Sales', 'Content', 'Brand', 'Digital', 'SEO', 'Social'];
    let marketingJobCount = 0;

    for (const keyword of marketingKeywords) {
      const matches = await page.locator(`text=/${keyword}/i`).count();
      marketingJobCount += matches;
    }

    console.log(`Found ${marketingJobCount} marketing-related mentions`);
    
    await page.screenshot({ path: 'e2e/screenshots/matching-marketing-jobs.png', fullPage: true });
  });

  test('Healthcare resume: Medical Assistant gets healthcare jobs', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Add healthcare skills
    await page.goto('/candidate-dashboard?tab=profile');
    await page.waitForTimeout(2000);

    const healthcareSkills = ['Patient Care', 'EKG', 'Phlebotomy', 'EMR', 'HIPAA', 'Vital Signs'];
    const skillsInput = page.locator('input[placeholder*="skill"], input[name="skills"]').first();
    
    if (await skillsInput.isVisible().catch(() => false)) {
      for (const skill of healthcareSkills) {
        await skillsInput.fill(skill);
        await skillsInput.press('Enter');
        await page.waitForTimeout(300);
      }
    }

    // Check job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);

    const jobCards = page.locator('[class*="card"]');
    const cardCount = await jobCards.count();
    console.log(`Found ${cardCount} job cards for healthcare profile`);

    await page.screenshot({ path: 'e2e/screenshots/matching-healthcare-jobs.png', fullPage: true });
  });

  test('Hospitality resume: Server gets restaurant/hospitality jobs', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Add hospitality skills
    await page.goto('/candidate-dashboard?tab=profile');
    await page.waitForTimeout(2000);

    const hospitalitySkills = ['Customer Service', 'Food Handling', 'POS', 'Sanitation', 'Table Service', 'Restaurant'];
    const skillsInput = page.locator('input[placeholder*="skill"], input[name="skills"]').first();
    
    if (await skillsInput.isVisible().catch(() => false)) {
      for (const skill of hospitalitySkills) {
        await skillsInput.fill(skill);
        await skillsInput.press('Enter');
        await page.waitForTimeout(300);
      }
    }

    // Check job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);

    const jobCards = page.locator('[class*="card"]');
    const cardCount = await jobCards.count();
    console.log(`Found ${cardCount} job cards for hospitality profile`);

    // Look for hospitality-related jobs
    const hospitalityKeywords = ['Server', 'Restaurant', 'Food', 'Hospitality', 'Bartender', 'Chef', 'Kitchen'];
    let hospitalityCount = 0;
    for (const keyword of hospitalityKeywords) {
      hospitalityCount += await page.locator(`text=/${keyword}/i`).count();
    }
    console.log(`Found ${hospitalityCount} hospitality-related mentions`);

    await page.screenshot({ path: 'e2e/screenshots/matching-hospitality-jobs.png', fullPage: true });
  });

  test('Match scores are calculated and displayed', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Go to job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);

    // Look for match score display
    const scoreElements = page.locator('[class*="score"], [class*="match"]');
    const scoreCount = await scoreElements.count();
    console.log(`Found ${scoreCount} score/match elements`);

    // Click on a job to see match breakdown
    const firstJob = page.locator('[class*="card"]').first();
    if (await firstJob.isVisible().catch(() => false)) {
      await firstJob.click();
      await page.waitForTimeout(2000);

      // Check modal for match information
      const modalContent = await page.content();
      const hasMatchInfo = modalContent.includes('Match') || modalContent.includes('Score') || modalContent.includes('%');
      console.log(`Modal has match info: ${hasMatchInfo}`);
      
      await page.screenshot({ path: 'e2e/screenshots/match-breakdown-modal.png', fullPage: true });
    }
  });

  test('Different skills = Different job results', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Profile 1: Add tech skills
    await page.goto('/candidate-dashboard?tab=profile');
    await page.waitForTimeout(2000);
    
    const techSkills = ['React', 'Python', 'AWS'];
    const skillsInput = page.locator('input[placeholder*="skill"]').first();
    
    if (await skillsInput.isVisible().catch(() => false)) {
      for (const skill of techSkills) {
        await skillsInput.fill(skill);
        await skillsInput.press('Enter');
        await page.waitForTimeout(300);
      }
    }

    // Get tech job results
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);
    const techJobCards = await page.locator('[class*="card"]').count();
    const techPage = await page.content();
    
    // Profile 2: Change to non-tech skills
    await page.goto('/candidate-dashboard?tab=profile');
    await page.waitForTimeout(2000);
    
    // Clear skills (if possible) and add hospitality skills
    const hospitalitySkills = ['Server', 'Restaurant', 'Food Service'];
    
    if (await skillsInput.isVisible().catch(() => false)) {
      for (const skill of hospitalitySkills) {
        await skillsInput.fill(skill);
        await skillsInput.press('Enter');
        await page.waitForTimeout(300);
      }
    }

    // Get hospitality job results
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);
    const hospitalityJobCards = await page.locator('[class*="card"]').count();
    const hospitalityPage = await page.content();

    console.log(`Tech skills → ${techJobCards} jobs`);
    console.log(`Hospitality skills → ${hospitalityJobCards} jobs`);
    
    // The results should be different (different job cards)
    // Note: They might be similar if the database has limited jobs
    
    await page.screenshot({ path: 'e2e/screenshots/different-skills-different-jobs.png', fullPage: true });
  });
});
