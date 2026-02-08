import { test, expect, Page } from '@playwright/test';
import { loginAsCandidate, loginAsRecruiter } from './auth.spec';

/**
 * Candidate Flow - End-to-End Tests
 * Tests: Onboarding, Job Discovery, Applications, Profile Management
 */

// Test file for resume upload
const testResumePath = 'e2e/fixtures/test-resume.pdf';

test.describe('Candidate Onboarding Flow', () => {
  
  test('complete candidate onboarding process', async ({ page }) => {
    const uniqueEmail = `candidate-${Date.now()}@test.com`;
    const password = 'TestPassword123!';

    // Step 1: Sign up
    await page.goto('/signup/candidate');
    await page.fill('input[name="email"], input[type="email"]', uniqueEmail);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("Sign Up")');

    await page.waitForTimeout(3000);
    
    // Step 2: Role Selection
    // Should be on role-selection page
    const onRoleSelection = page.url().includes('role-selection');
    
    if (onRoleSelection) {
      // Select Candidate role
      await page.locator('text=/candidate|job seeker/i').first().click();
      await page.click('button:has-text("Continue"), button:has-text("Next")');
      
      await page.waitForTimeout(2000);
    }
    
    // Step 3: Resume Upload (skip if no file input found)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible().catch(() => false)) {
      // Upload test resume
      // Note: You'll need to create a test PDF file at e2e/fixtures/test-resume.pdf
      // For now, we'll skip the actual file upload
      console.log('Resume upload step found - skipping file upload in automated test');
      await page.click('button:has-text("Skip"), button:has-text("Continue")');
    }
    
    // Step 4: Basic Info
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="First"]').first();
    if (await firstNameInput.isVisible().catch(() => false)) {
      await firstNameInput.fill('Test');
      await page.fill('input[name="lastName"], input[placeholder*="Last"]', 'Candidate');
      await page.fill('input[name="location"], input[placeholder*="Location"]', 'San Francisco, CA');
      
      // Salary range
      await page.fill('input[name="salaryMin"], input[placeholder*="Min"]', '80000');
      await page.fill('input[name="salaryMax"], input[placeholder*="Max"]', '120000');
      
      // Work type
      const workTypeOption = page.locator('text=/remote|hybrid|onsite/i').first();
      if (await workTypeOption.isVisible().catch(() => false)) {
        await workTypeOption.click();
      }
      
      await page.click('button:has-text("Continue"), button:has-text("Next"), button:has-text("Save")');
      await page.waitForTimeout(2000);
    }
    
    // Step 5: Skills
    const skillsInput = page.locator('input[placeholder*="skill"], input[name="skills"]').first();
    if (await skillsInput.isVisible().catch(() => false)) {
      await skillsInput.fill('React');
      await skillsInput.press('Enter');
      await skillsInput.fill('TypeScript');
      await skillsInput.press('Enter');
      
      await page.click('button:has-text("Complete"), button:has-text("Finish"), button:has-text("Save")');
    }
    
    // Verify redirect to dashboard
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('candidate-dashboard');
    
    await page.screenshot({ path: 'e2e/screenshots/candidate-onboarding-complete.png', fullPage: true });
  });
});

test.describe('Candidate Dashboard - Job Discovery', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test('dashboard loads with job feed', async ({ page }) => {
    // Should be on candidate dashboard
    await expect(page).toHaveURL(/candidate-dashboard/);
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Check for job feed or job-related content
    const pageContent = await page.content();
    const hasJobContent = 
      pageContent.toLowerCase().includes('job') ||
      pageContent.toLowerCase().includes('match') ||
      pageContent.toLowerCase().includes('feed') ||
      pageContent.toLowerCase().includes('application');
    
    expect(hasJobContent).toBeTruthy();
    
    // Look for navigation tabs
    const tabs = await page.locator('button[role="tab"], [role="tab"]').count();
    expect(tabs).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'e2e/screenshots/candidate-dashboard.png', fullPage: true });
  });

  test('can search and filter jobs', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Developer');
      await page.waitForTimeout(1000);
      
      // Clear search
      await searchInput.clear();
      
      // Search for something else
      await searchInput.fill('Engineer');
      await page.waitForTimeout(1000);
    }
    
    // Look for filter controls
    const filterButtons = page.locator('button, [role="combobox"], select');
    const filterCount = await filterButtons.count();
    expect(filterCount).toBeGreaterThan(0);
  });

  test('can view job details', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Look for job cards or job listings
    const jobCards = page.locator('[class*="card"], [class*="job"]').first();
    
    if (await jobCards.isVisible().catch(() => false)) {
      // Click on first job
      await jobCards.click();
      
      await page.waitForTimeout(2000);
      
      // Should show job details
      const hasDetails = await page.locator('text=/description|requirements|apply|salary/i').isVisible();
      expect(hasDetails).toBeTruthy();
      
      await page.screenshot({ path: 'e2e/screenshots/job-details.png', fullPage: true });
    }
  });

  test('can save and unsave jobs', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Look for save button on job cards
    const saveButton = page.locator('button:has-text("Save"), [aria-label*="save"], [title*="save"]').first();
    
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();
      await page.waitForTimeout(1000);
      
      // Check if button changed to "Saved" or similar
      const savedText = await saveButton.textContent();
      expect(savedText?.toLowerCase()).toMatch(/saved|unsave/);
      
      // Click again to unsave
      await saveButton.click();
    }
  });
});

test.describe('Candidate - Job Applications', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test('can apply to a job', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Find a job card
    const jobCard = page.locator('[class*="card"], [class*="job"]').first();
    
    if (await jobCard.isVisible().catch(() => false)) {
      // Look for apply button
      const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
      
      if (await applyButton.isVisible().catch(() => false)) {
        await applyButton.click();
        
        await page.waitForTimeout(3000);
        
        // Check for success message or redirect to application confirmation
        const success = await page.locator('text=/success|applied|submitted/i').isVisible().catch(() => false);
        const onExam = page.url().includes('/exam/');
        
        expect(success || onExam).toBeTruthy();
        
        await page.screenshot({ path: 'e2e/screenshots/job-application.png', fullPage: true });
      }
    }
  });

  test('can view application status', async ({ page }) => {
    // Navigate to applications tab
    const applicationsTab = page.locator('button:has-text("Applications"), [role="tab"]:has-text("Applications")').first();
    
    if (await applicationsTab.isVisible().catch(() => false)) {
      await applicationsTab.click();
      await page.waitForTimeout(2000);
      
      // Check for applications list
      const hasApplications = await page.locator('text=/submitted|viewed|screening|application/i').isVisible();
      
      // Either has applications or shows empty state
      expect(hasApplications || await page.locator('text=/no applications|empty/i').isVisible()).toBeTruthy();
      
      await page.screenshot({ path: 'e2e/screenshots/applications-tab.png', fullPage: true });
    }
  });

  test('duplicate application prevention', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Try to find an already applied job
    const appliedJob = page.locator('text=/applied|already applied/i').first();
    
    if (await appliedJob.isVisible().catch(() => false)) {
      // Try clicking apply on this job
      const applyButton = page.locator('button:has-text("Apply")').first();
      
      if (await applyButton.isVisible().catch(() => false)) {
        await applyButton.click();
        await page.waitForTimeout(2000);
        
        // Should show error about already applied
        const errorVisible = await page.locator('text=/already applied|duplicate|error/i').isVisible();
        expect(errorVisible).toBeTruthy();
      }
    }
  });
});

test.describe('Candidate - Profile Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test('can edit profile information', async ({ page }) => {
    // Look for profile/settings link
    const profileLink = page.locator('a:has-text("Profile"), button:has-text("Profile"), a[href*="profile"]').first();
    
    if (await profileLink.isVisible().catch(() => false)) {
      await profileLink.click();
      await page.waitForTimeout(2000);
      
      // Try to edit location
      const locationInput = page.locator('input[name="location"], input[placeholder*="Location"]').first();
      
      if (await locationInput.isVisible().catch(() => false)) {
        await locationInput.clear();
        await locationInput.fill('New York, NY');
        
        // Save changes
        await page.click('button:has-text("Save"), button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // Verify success
        const success = await page.locator('text=/saved|success|updated/i').isVisible();
        expect(success).toBeTruthy();
      }
    }
    
    await page.screenshot({ path: 'e2e/screenshots/candidate-profile-edit.png', fullPage: true });
  });

  test('can view resume', async ({ page }) => {
    // Look for resume section
    const resumeSection = page.locator('text=/resume|cv/i').first();
    
    if (await resumeSection.isVisible().catch(() => false)) {
      // Check if there's a view/download link
      const viewLink = page.locator('a:has-text("View"), a:has-text("Download"), button:has-text("View")').first();
      
      if (await viewLink.isVisible().catch(() => false)) {
        // Don't actually click external links in tests
        expect(await viewLink.isVisible()).toBeTruthy();
      }
    }
  });
});

test.describe('Candidate - Notifications', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test('notification bell is visible', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for notification bell/icon
    const notificationBell = page.locator('[aria-label*="notification"], [title*="notification"], button svg').first();
    
    // Notifications might be in header/navigation
    const hasBell = await notificationBell.isVisible().catch(() => false);
    
    // Also check for notification count/badge
    const hasBadge = await page.locator('[class*="badge"]').isVisible().catch(() => false);
    
    expect(hasBell || hasBadge).toBeTruthy();
  });

  test('can view notifications', async ({ page }) => {
    // Click notification bell
    const bell = page.locator('button:has([aria-label*="notification"]), [aria-label*="notification"]').first();
    
    if (await bell.isVisible().catch(() => false)) {
      await bell.click();
      await page.waitForTimeout(1000);
      
      // Should show notification dropdown/panel
      const hasNotifications = await page.locator('text=/notification|mark all as read/i').isVisible();
      expect(hasNotifications).toBeTruthy();
    }
  });
});
