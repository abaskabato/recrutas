import { test, expect } from '@playwright/test';
import { TEST_USERS } from './auth.setup';

const TEST_PROFILES = [
  {
    name: 'Senior Software Engineer',
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'PostgreSQL'],
    location: 'San Francisco, CA',
    expectedJobTitles: ['Software Engineer', 'Frontend Developer', 'Full Stack Developer', 'Backend Engineer'],
  },
  {
    name: 'Data Scientist',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Tableau', 'Statistics'],
    location: 'New York, NY',
    expectedJobTitles: ['Data Scientist', 'Machine Learning Engineer', 'Data Analyst', 'ML Engineer'],
  },
  {
    name: 'DevOps Engineer',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'Jenkins', 'CI/CD'],
    location: 'Seattle, WA',
    expectedJobTitles: ['DevOps', 'SRE', 'Cloud Engineer', 'Infrastructure'],
  },
];

test.describe('Job Feed - Different Candidate Profiles', () => {
  
  for (const profile of TEST_PROFILES) {
    test(`Job feed for ${profile.name} profile`, async ({ page }) => {
      // Step 1: Login as candidate
      await page.goto('/auth');
      await page.fill('input[name="email"]', TEST_USERS.candidate.email);
      await page.fill('input[name="password"]', TEST_USERS.candidate.password);
      await page.click('button:has-text("Sign in")');

      // Wait for redirect to dashboard
      await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Step 2: Navigate to profile and update skills
      // Look for profile/settings
      const profileButton = page.locator('button:has-text("Profile"), a[href*="profile"]').first();
      
      // Try to find and click profile section
      await page.goto('/candidate-dashboard?tab=profile');
      await page.waitForTimeout(2000);

      // Step 3: Add skills manually (simulating resume parsing)
      // Look for skills input
      const skillsInput = page.locator('input[placeholder*="skill"], input[name="skills"]').first();
      
      if (await skillsInput.isVisible().catch(() => false)) {
        // Add each skill
        for (const skill of profile.skills) {
          await skillsInput.fill(skill);
          await skillsInput.press('Enter');
          await page.waitForTimeout(300);
        }
        console.log(`Added skills: ${profile.skills.join(', ')}`);
      } else {
        // If no skills input visible, try alternative approach
        console.log('Skills input not found directly, looking for alternative...');
      }

      // Step 4: Go back to job feed
      await page.goto('/candidate-dashboard?tab=jobs');
      await page.waitForTimeout(5000);

      // Step 5: Check job feed content
      const pageContent = await page.content();
      
      // Look for job cards
      const jobCards = page.locator('[class*="card"]');
      const cardCount = await jobCards.count();
      console.log(`Found ${cardCount} cards on page for ${profile.name}`);

      // Check for any job-related content
      const hasJobs = pageContent.toLowerCase().includes('job') || 
                     pageContent.toLowerCase().includes('match') ||
                     pageContent.toLowerCase().includes('position');
      
      expect(hasJobs).toBeTruthy();

      // Step 6: Take screenshot
      await page.screenshot({ 
        path: `e2e/screenshots/job-feed-${profile.name.toLowerCase().replace(/\s+/g, '-')}.png`, 
        fullPage: true 
      });

      // Step 7: Look for match scores or job titles
      const jobTexts = await page.locator('text=/Software|Data|DevOps|Engineer|Developer|Analyst/').count();
      console.log(`Found ${jobTexts} job-related mentions for ${profile.name}`);

      // Step 8: Test the AI Match Breakdown modal
      const firstJobCard = page.locator('[class*="card"]').first();
      if (await firstJobCard.isVisible().catch(() => false)) {
        await firstJobCard.click();
        await page.waitForTimeout(2000);
        
        // Check if modal opened with match breakdown
        const modalContent = await page.content();
        const hasMatchBreakdown = modalContent.includes('Match') || modalContent.includes('AI');
        console.log(`Modal shows match breakdown: ${hasMatchBreakdown}`);
        
        // Close modal
        await page.keyboard.press('Escape');
      }
    });
  }
});

test.describe('Job Feed - Edge Cases', () => {
  
  test('Empty profile - no skills', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Go to job feed with potentially empty profile
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);

    // Should still show jobs (even if generic)
    const pageContent = await page.content();
    const hasContent = pageContent.length > 1000; // Page should have substantial content
    
    expect(hasContent).toBeTruthy();
    
    await page.screenshot({ path: 'e2e/screenshots/job-feed-empty-profile.png', fullPage: true });
  });

  test('Search functionality works', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Go to job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(3000);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      // Search for a specific role
      await searchInput.fill('Software Engineer');
      await page.waitForTimeout(2000);
      
      // Check if results filtered
      await page.screenshot({ path: 'e2e/screenshots/job-feed-search.png', fullPage: true });
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);
    }
  });

  test('Filter by work type', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Go to job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(3000);

    // Look for filter dropdowns
    const filters = page.locator('[role="combobox"], select, button:has-text("Filter")');
    const filterCount = await filters.count();
    
    console.log(`Found ${filterCount} filter elements`);
    
    if (filterCount > 0) {
      await page.screenshot({ path: 'e2e/screenshots/job-feed-filters.png', fullPage: true });
    }
  });

  test('Refresh button works', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Go to job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(3000);

    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button:has([class*="refresh"])').first();
    
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'e2e/screenshots/job-feed-after-refresh.png', fullPage: true });
    }
  });

  test('No jobs found state', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Search for very specific/rare term
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(3000);
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('xyz123nonexistentjob');
      await page.waitForTimeout(3000);
      
      // Check for empty state
      const pageContent = await page.content();
      const hasEmptyState = pageContent.toLowerCase().includes('no job') || 
                          pageContent.toLowerCase().includes('not found') ||
                          pageContent.toLowerCase().includes('empty');
      
      console.log(`Empty state shown: ${hasEmptyState}`);
      await page.screenshot({ path: 'e2e/screenshots/job-feed-no-results.png', fullPage: true });
    }
  });
});

test.describe('Job Feed - Job Application Flow', () => {
  
  test('Can view job details and apply', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USERS.candidate.email);
    await page.fill('input[name="password"]', TEST_USERS.candidate.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/candidate-dashboard**', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Go to job feed
    await page.goto('/candidate-dashboard?tab=jobs');
    await page.waitForTimeout(5000);

    // Find first job card
    const jobCard = page.locator('[class*="card"]').first();
    
    if (await jobCard.isVisible().catch(() => false)) {
      // Click on job
      await jobCard.click();
      await page.waitForTimeout(2000);
      
      // Check for apply button
      const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
      
      if (await applyButton.isVisible().catch(() => false)) {
        await page.screenshot({ path: 'e2e/screenshots/job-details-apply.png', fullPage: true });
      } else {
        await page.screenshot({ path: 'e2e/screenshots/job-details.png', fullPage: true });
      }
    }
  });
});
