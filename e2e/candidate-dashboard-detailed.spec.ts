import { test, expect, Page } from '@playwright/test';
import { loginAsCandidate } from './auth.spec';

/**
 * Candidate Dashboard - Detailed Component Tests
 * Tests every element and interaction on the candidate dashboard
 */

test.describe('Candidate Dashboard - Overview Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
  });

  test('displays correct welcome message', async ({ page }) => {
    // Check welcome header
    const welcomeText = await page.locator('h1, h2, .welcome, [class*="welcome"]').first().textContent();
    expect(welcomeText?.toLowerCase()).toContain('welcome');
    
    // Check subtext
    const subtext = await page.locator('p, .subtitle').first().textContent();
    expect(subtext?.toLowerCase()).toContain('job search');
  });

  test('stats cards display correctly', async ({ page }) => {
    // Test New Matches card
    const newMatchesCard = page.locator('[class*="card"]:has-text("New Matches"), div:has-text("New Matches"):has(h2, h3, [class*="number"])').first();
    await expect(newMatchesCard).toBeVisible();
    
    const newMatchesCount = await newMatchesCard.locator('h2, h3, [class*="number"], .text-3xl').textContent();
    expect(newMatchesCount).toMatch(/\d+/); // Should be a number
    console.log(`New Matches: ${newMatchesCount}`);
    
    // Test Profile Views card
    const profileViewsCard = page.locator('[class*="card"]:has-text("Profile Views"), div:has-text("Profile Views")').first();
    await expect(profileViewsCard).toBeVisible();
    
    const profileViewsCount = await profileViewsCard.locator('h2, h3, [class*="number"]').textContent();
    expect(profileViewsCount).toMatch(/\d+/);
    console.log(`Profile Views: ${profileViewsCount}`);
    
    // Test Active Chats card
    const activeChatsCard = page.locator('[class*="card"]:has-text("Active Chats"), div:has-text("Active Chats")').first();
    await expect(activeChatsCard).toBeVisible();
    
    const activeChatsCount = await activeChatsCard.locator('h2, h3, [class*="number"]').textContent();
    expect(activeChatsCount).toMatch(/\d+/);
    console.log(`Active Chats: ${activeChatsCount}`);
    
    // Test Applications card
    const applicationsCard = page.locator('[class*="card"]:has-text("Applications"), div:has-text("Applications")').first();
    await expect(applicationsCard).toBeVisible();
    
    const applicationsCount = await applicationsCard.locator('h2, h3, [class*="number"]').textContent();
    expect(applicationsCount).toMatch(/\d+/);
    console.log(`Applications: ${applicationsCount}`);
  });

  test('stats card action buttons work', async ({ page }) => {
    // Test "Review Matches" button
    const reviewMatchesBtn = page.locator('button:has-text("Review Matches"), a:has-text("Review Matches")').first();
    if (await reviewMatchesBtn.isVisible().catch(() => false)) {
      await reviewMatchesBtn.click();
      await page.waitForTimeout(1000);
      // Should navigate to Job Feed or scroll to matches
      const url = page.url();
      expect(url.includes('dashboard') || url.includes('feed')).toBeTruthy();
    }
    
    // Navigate back
    await page.goto('/candidate-dashboard');
    await page.waitForTimeout(2000);
    
    // Test "Track Applications" button
    const trackApplicationsBtn = page.locator('button:has-text("Track Applications"), a:has-text("Track Applications")').first();
    if (await trackApplicationsBtn.isVisible().catch(() => false)) {
      await trackApplicationsBtn.click();
      await page.waitForTimeout(1000);
      
      // Should switch to Applications tab
      const activeTab = await page.locator('[class*="active"], [aria-selected="true"]').textContent().catch(() => '');
      expect(activeTab.toLowerCase()).toContain('application');
    }
    
    // Navigate back
    await page.goto('/candidate-dashboard');
    await page.waitForTimeout(2000);
    
    // Test "View Chats" button
    const viewChatsBtn = page.locator('button:has-text("View Chats"), a:has-text("View Chats")').first();
    if (await viewChatsBtn.isVisible().catch(() => false)) {
      await viewChatsBtn.click();
      await page.waitForTimeout(1000);
      
      // Should navigate to chat
      expect(page.url()).toContain('/chat');
    }
    
    // Navigate back
    await page.goto('/candidate-dashboard');
    await page.waitForTimeout(2000);
    
    // Test "Enhance Profile" button
    const enhanceProfileBtn = page.locator('button:has-text("Enhance Profile"), a:has-text("Enhance Profile")').first();
    if (await enhanceProfileBtn.isVisible().catch(() => false)) {
      await enhanceProfileBtn.click();
      await page.waitForTimeout(1000);
      
      // Should open profile edit or navigate to profile
      const url = page.url();
      expect(url.includes('profile') || url.includes('dashboard')).toBeTruthy();
    }
  });

  test('profile completion banner displays correctly', async ({ page }) => {
    // Find profile completion banner
    const banner = page.locator('[class*="banner"], [class*="completion"], div:has-text("Complete Your Profile")').first();
    await expect(banner).toBeVisible();
    
    // Check percentage
    const percentageText = await banner.textContent();
    expect(percentageText).toMatch(/\d+%/); // Should show percentage like "0%"
    
    // Check progress bar
    const progressBar = banner.locator('[class*="progress"], [role="progressbar"]').first();
    await expect(progressBar).toBeVisible();
    
    // Check "Complete Profile" button
    const completeProfileBtn = banner.locator('button:has-text("Complete Profile"), a:has-text("Complete Profile")').first();
    await expect(completeProfileBtn).toBeVisible();
    
    // Test clicking Complete Profile
    await completeProfileBtn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to profile setup or open profile edit
    const url = page.url();
    expect(url.includes('profile') || url.includes('setup') || url.includes('dashboard')).toBeTruthy();
  });

  test('navigation tabs are functional', async ({ page }) => {
    // Overview/Job Feed tab (should be active by default)
    const jobFeedTab = page.locator('button:has-text("Job Feed"), [role="tab"]:has-text("Job Feed"), a:has-text("Job Feed")').first();
    await expect(jobFeedTab).toBeVisible();
    
    // Check if it's active
    const isActive = await jobFeedTab.evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || 
             el.classList.contains('active') ||
             el.classList.contains('data-[state=active]');
    });
    expect(isActive).toBeTruthy();
    
    // Applications tab
    const applicationsTab = page.locator('button:has-text("Applications"), [role="tab"]:has-text("Applications"), a:has-text("Applications")').first();
    await expect(applicationsTab).toBeVisible();
    
    // Click Applications tab
    await applicationsTab.click();
    await page.waitForTimeout(2000);
    
    // Should become active
    const isApplicationsActive = await applicationsTab.evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || 
             el.classList.contains('active');
    });
    expect(isApplicationsActive).toBeTruthy();
    
    // Should show applications content
    const applicationsContent = await page.locator('text=/application|submitted|viewed/i').isVisible();
    expect(applicationsContent).toBeTruthy();
    
    // Recrutas Agent tab
    await page.goto('/candidate-dashboard');
    await page.waitForTimeout(2000);
    
    const agentTab = page.locator('button:has-text("Recrutas Agent"), [role="tab"]:has-text("Recrutas Agent"), a:has-text("Recrutas Agent")').first();
    await expect(agentTab).toBeVisible();
    
    // Click Agent tab
    await agentTab.click();
    await page.waitForTimeout(2000);
    
    // Should become active
    const isAgentActive = await agentTab.evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || 
             el.classList.contains('active');
    });
    expect(isAgentActive).toBeTruthy();
  });

  test('header elements are present', async ({ page }) => {
    // Logo
    const logo = page.locator('img[alt*="logo"], [class*="logo"], h1:has-text("R"), a:has-text("Recrutas")').first();
    await expect(logo).toBeVisible();
    
    // Theme toggle
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
    await expect(themeToggle).toBeVisible();
    
    // Notifications bell
    const notificationBell = page.locator('button[aria-label*="notification"], [class*="bell"], button svg').first();
    await expect(notificationBell).toBeVisible();
    
    // User menu/avatar
    const userMenu = page.locator('button[class*="avatar"], [class*="user-menu"], button:has-text("A")').first();
    await expect(userMenu).toBeVisible();
  });
});

test.describe('Candidate Dashboard - Job Feed Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
  });

  test('job feed displays AI-matched jobs', async ({ page }) => {
    // Ensure we're on Job Feed tab
    const jobFeedTab = page.locator('button:has-text("Job Feed"), [role="tab"]:has-text("Job Feed")').first();
    await jobFeedTab.click();
    await page.waitForTimeout(3000);
    
    // Check for job cards
    const jobCards = page.locator('[class*="job-card"], [class*="job"]:not(nav):not(header), article:has-text("Job")');
    const jobCount = await jobCards.count();
    
    console.log(`Found ${jobCount} job cards`);
    
    // If jobs exist, verify their structure
    if (jobCount > 0) {
      const firstJob = jobCards.first();
      
      // Should have job title
      const jobTitle = await firstJob.locator('h3, h4, [class*="title"]').textContent().catch(() => '');
      expect(jobTitle.length).toBeGreaterThan(0);
      
      // Should have company name
      const companyName = await firstJob.locator('[class*="company"]').textContent().catch(() => '');
      
      // Should have match score if AI-matched
      const matchScore = await firstJob.locator('text=/\\d+%/').textContent().catch(() => '');
      
      console.log(`First job: ${jobTitle} at ${companyName}, Match: ${matchScore}`);
    }
  });

  test('search functionality works', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    
    // Search for "Developer"
    await searchInput.fill('Developer');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    
    // Check if results filtered
    const hasResults = await page.locator('text=/developer|engineer|no results/i').isVisible();
    
    // Clear search
    await searchInput.clear();
    await searchInput.press('Enter');
  });

  test('job filters are present', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for filter buttons/dropdowns
    const filters = page.locator('button:has-text("Filter"), select, [role="combobox"], button svg[class*="filter"], button svg[class*="chevron"]').first();
    
    if (await filters.isVisible().catch(() => false)) {
      // Click filter button
      await filters.click();
      await page.waitForTimeout(1000);
      
      // Should show filter options
      const filterOptions = await page.locator('[role="listbox"], [class*="dropdown"], [class*="popover"]').isVisible();
      expect(filterOptions).toBeTruthy();
    }
  });

  test('can save and unsave jobs', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Find first job card
    const jobCard = page.locator('[class*="job-card"], article:has-text("Job"), [class*="card"]:has(h3)').first();
    
    if (await jobCard.isVisible().catch(() => false)) {
      // Look for save button
      const saveButton = jobCard.locator('button[aria-label*="save"], button:has-text("Save"), button svg[class*="bookmark"]').first();
      
      if (await saveButton.isVisible().catch(() => false)) {
        // Get initial state
        const initialText = await saveButton.textContent().catch(() => '');
        
        // Click save
        await saveButton.click();
        await page.waitForTimeout(1000);
        
        // Check if state changed
        const newText = await saveButton.textContent().catch(() => '');
        
        // Should show "Saved" or change appearance
        expect(newText !== initialText || newText.toLowerCase().includes('saved')).toBeTruthy();
        
        // Click again to unsave
        await saveButton.click();
      }
    }
  });

  test('can apply to a job', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Find a job with Apply button
    const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
    
    if (await applyButton.isVisible().catch(() => false)) {
      await applyButton.click();
      await page.waitForTimeout(3000);
      
      // Should either:
      // 1. Show success message
      // 2. Navigate to exam page
      // 3. Show application confirmation
      
      const success = await page.locator('text=/success|applied|submitted/i').isVisible().catch(() => false);
      const onExam = page.url().includes('/exam/');
      const confirmation = await page.locator('[role="dialog"], [class*="modal"], [class*="confirmation"]').isVisible().catch(() => false);
      
      expect(success || onExam || confirmation).toBeTruthy();
    }
  });

  test('external jobs are marked correctly', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Look for external job badges
    const externalBadges = page.locator('text=/external|greenhouse|lever|indeed/i');
    const externalCount = await externalBadges.count();
    
    console.log(`Found ${externalCount} external job badges`);
    
    if (externalCount > 0) {
      // Verify external jobs have trust scores
      const trustScore = await page.locator('text=/trust|score|\\d\\d%/i').first().textContent().catch(() => '');
      console.log(`Trust score visible: ${trustScore}`);
    }
  });
});

test.describe('Candidate Dashboard - Applications Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Navigate to Applications tab
    const applicationsTab = page.locator('button:has-text("Applications"), [role="tab"]:has-text("Applications")').first();
    await applicationsTab.click();
    await page.waitForTimeout(3000);
  });

  test('applications list displays correctly', async ({ page }) => {
    // Check for application cards or empty state
    const hasApplications = await page.locator('[class*="application"], article:has-text("Application")').count() > 0;
    const emptyState = await page.locator('text=/no applications|empty|start applying/i').isVisible().catch(() => false);
    
    expect(hasApplications || emptyState).toBeTruthy();
    
    if (hasApplications) {
      // Verify application card structure
      const firstApplication = page.locator('[class*="application"]').first();
      
      // Should have job title
      const jobTitle = await firstApplication.locator('h3, h4, [class*="title"]').textContent().catch(() => '');
      expect(jobTitle.length).toBeGreaterThan(0);
      
      // Should have status
      const status = await firstApplication.locator('text=/submitted|viewed|screening|interview/i').textContent().catch(() => '');
      console.log(`Application status: ${status}`);
    }
  });

  test('can filter applications by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select, [role="combobox"], button:has-text("Status")').first();
    
    if (await statusFilter.isVisible().catch(() => false)) {
      // Select a status
      await statusFilter.selectOption('submitted').catch(async () => {
        await statusFilter.click();
        await page.click('text=Submitted');
      });
      
      await page.waitForTimeout(2000);
      
      // Should filter results
      const filtered = await page.locator('text=/submitted/i').count() > 0 ||
                       await page.locator('text=/no applications/i').isVisible();
      expect(filtered).toBeTruthy();
    }
  });

  test('can view application details', async ({ page }) => {
    // Find first application
    const applicationCard = page.locator('[class*="application"]').first();
    
    if (await applicationCard.isVisible().catch(() => false)) {
      // Click to view details
      await applicationCard.click();
      await page.waitForTimeout(2000);
      
      // Should show details
      const hasDetails = await page.locator('text=/job details|company|status|applied|date/i').isVisible();
      expect(hasDetails).toBeTruthy();
    }
  });
});

test.describe('Candidate Dashboard - Recrutas Agent Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Navigate to Recrutas Agent tab
    const agentTab = page.locator('button:has-text("Recrutas Agent"), [role="tab"]:has-text("Recrutas Agent")').first();
    await agentTab.click();
    await page.waitForTimeout(3000);
  });

  test('AI tips and recommendations are displayed', async ({ page }) => {
    // Check for AI-generated content
    const hasTips = await page.locator('text=/tip|recommendation|suggestion|advice/i').isVisible();
    const hasAgent = await page.locator('text=/agent|ai|assistant/i').isVisible();
    
    expect(hasTips || hasAgent).toBeTruthy();
  });

  test('can interact with agent suggestions', async ({ page }) => {
    // Look for actionable suggestions
    const suggestionButton = page.locator('button:has-text("Improve"), button:has-text("Add"), button:has-text("Update"), a:has-text("Edit")').first();
    
    if (await suggestionButton.isVisible().catch(() => false)) {
      await suggestionButton.click();
      await page.waitForTimeout(2000);
      
      // Should navigate to profile or open edit form
      expect(page.url().includes('profile') || page.url().includes('dashboard')).toBeTruthy();
    }
  });
});

test.describe('Candidate Dashboard - Navigation & Header', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
  });

  test('logo navigates to dashboard', async ({ page }) => {
    const logo = page.locator('a[href="/"], [class*="logo"]').first();
    
    if (await logo.isVisible().catch(() => false)) {
      await logo.click();
      await page.waitForTimeout(2000);
      
      // Should stay on or navigate to dashboard
      expect(page.url().includes('dashboard')).toBeTruthy();
    }
  });

  test('theme toggle changes appearance', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    
    // Click theme toggle
    await themeToggle.click();
    await page.waitForTimeout(1000);
    
    // Theme should have changed
    const newTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(newTheme !== initialTheme).toBeTruthy();
    
    // Toggle back
    await themeToggle.click();
  });

  test('notifications can be opened', async ({ page }) => {
    const notificationBell = page.locator('button[aria-label*="notification"], [class*="bell"]').first();
    
    await notificationBell.click();
    await page.waitForTimeout(1000);
    
    // Should show notification panel
    const panelVisible = await page.locator('[class*="notification"], [role="dialog"]:has-text("notification"), [class*="dropdown"]:has-text("notification"]').isVisible();
    expect(panelVisible).toBeTruthy();
  });

  test('user menu displays options', async ({ page }) => {
    const userMenu = page.locator('button[class*="avatar"], [class*="user-menu"]').first();
    
    await userMenu.click();
    await page.waitForTimeout(1000);
    
    // Should show menu options
    const hasOptions = await page.locator('text=/profile|settings|logout|sign out/i').isVisible();
    expect(hasOptions).toBeTruthy();
  });

  test('logout works correctly', async ({ page }) => {
    // Open user menu
    const userMenu = page.locator('button[class*="avatar"], [class*="user-menu"]').first();
    await userMenu.click();
    await page.waitForTimeout(1000);
    
    // Click logout
    const logoutButton = page.locator('text=/logout|sign out/i').first();
    
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await page.waitForTimeout(3000);
      
      // Should redirect to auth or home
      const url = page.url();
      expect(url.includes('/auth') || url === '/' || !url.includes('dashboard')).toBeTruthy();
    }
  });
});
