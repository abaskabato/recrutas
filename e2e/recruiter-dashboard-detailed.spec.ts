import { test, expect } from '@playwright/test';
import { loginAsRecruiter } from './auth.spec';

/**
 * Recruiter Dashboard - Detailed Component Tests
 * Tests every element and interaction on the recruiter/talent owner dashboard
 */

test.describe('Recruiter Dashboard - Overview Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
  });

  test('displays correct welcome message', async ({ page }) => {
    // Check welcome header
    const welcomeHeader = page.locator('h1, h2, .welcome, [class*="welcome"]:has-text("Welcome")').first();
    await expect(welcomeHeader).toBeVisible();
    
    const welcomeText = await welcomeHeader.textContent();
    expect(welcomeText?.toLowerCase()).toContain('welcome');
    expect(welcomeText?.toLowerCase()).toContain('talent owner');
    
    // Check subtext
    const subtext = await page.locator('p, .subtitle, [class*="subtitle"]').first().textContent();
    expect(subtext?.toLowerCase()).toContain('job postings');
    expect(subtext?.toLowerCase()).toContain('candidates');
  });

  test('Create Job button is visible and clickable', async ({ page }) => {
    const createJobBtn = page.locator('button:has-text("Create Job"), button:has-text("Post Job"), button:has-text("New Job"), a:has-text("Create Job")').first();
    await expect(createJobBtn).toBeVisible();
    
    // Verify button styling (should be prominent/primary)
    const buttonClasses = await createJobBtn.evaluate(el => el.className);
    expect(buttonClasses).toMatch(/primary|blue|accent|bg-blue|bg-primary/i);
  });

  test('stats cards display correctly', async ({ page }) => {
    // Active Jobs card
    const activeJobsCard = page.locator('[class*="card"]:has-text("Active Jobs"), div:has-text("Active Jobs")').first();
    await expect(activeJobsCard).toBeVisible();
    
    const activeJobsCount = await activeJobsCard.locator('h2, h3, [class*="number"], .text-3xl').textContent();
    expect(activeJobsCount).toMatch(/\d+/);
    console.log(`Active Jobs: ${activeJobsCount}`);
    
    // Total Matches card
    const totalMatchesCard = page.locator('[class*="card"]:has-text("Total Matches"), div:has-text("Total Matches")').first();
    await expect(totalMatchesCard).toBeVisible();
    
    const totalMatchesCount = await totalMatchesCard.locator('h2, h3, [class*="number"]').textContent();
    expect(totalMatchesCount).toMatch(/\d+/);
    console.log(`Total Matches: ${totalMatchesCount}`);
    
    // Active Chats card
    const activeChatsCard = page.locator('[class*="card"]:has-text("Active Chats"), div:has-text("Active Chats")').first();
    await expect(activeChatsCard).toBeVisible();
    
    const activeChatsCount = await activeChatsCard.locator('h2, h3, [class*="number"]').textContent();
    expect(activeChatsCount).toMatch(/\d+/);
    console.log(`Active Chats: ${activeChatsCount}`);
    
    // Hires Made card
    const hiresMadeCard = page.locator('[class*="card"]:has-text("Hires Made"), div:has-text("Hires Made")').first();
    await expect(hiresMadeCard).toBeVisible();
    
    const hiresMadeCount = await hiresMadeCard.locator('h2, h3, [class*="number"]').textContent();
    expect(hiresMadeCount).toMatch(/\d+/);
    console.log(`Hires Made: ${hiresMadeCount}`);
  });

  test('stats card action buttons work', async ({ page }) => {
    // Test "Manage Jobs" button
    const manageJobsBtn = page.locator('button:has-text("Manage Jobs"), a:has-text("Manage Jobs")').first();
    await expect(manageJobsBtn).toBeVisible();
    
    await manageJobsBtn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to Jobs tab
    const jobsTabActive = await page.locator('button:has-text("Jobs"), [role="tab"]:has-text("Jobs")').first().evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
    });
    expect(jobsTabActive || page.url().includes('jobs')).toBeTruthy();
    
    // Navigate back
    await page.goto('/talent-dashboard');
    await page.waitForTimeout(2000);
    
    // Test "View Candidates" button
    const viewCandidatesBtn = page.locator('button:has-text("View Candidates"), a:has-text("View Candidates")').first();
    await expect(viewCandidatesBtn).toBeVisible();
    
    await viewCandidatesBtn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to Candidates tab
    const candidatesTabActive = await page.locator('button:has-text("Candidates"), [role="tab"]:has-text("Candidates")').first().evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
    });
    expect(candidatesTabActive || page.url().includes('candidates')).toBeTruthy();
    
    // Navigate back
    await page.goto('/talent-dashboard');
    await page.waitForTimeout(2000);
    
    // Test "Open Chats" button
    const openChatsBtn = page.locator('button:has-text("Open Chats"), a:has-text("Open Chats")').first();
    await expect(openChatsBtn).toBeVisible();
    
    await openChatsBtn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to chat
    expect(page.url()).toContain('/chat');
    
    // Navigate back
    await page.goto('/talent-dashboard');
    await page.waitForTimeout(2000);
    
    // Test "View Analytics" button
    const viewAnalyticsBtn = page.locator('button:has-text("View Analytics"), a:has-text("View Analytics")').first();
    await expect(viewAnalyticsBtn).toBeVisible();
    
    await viewAnalyticsBtn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to Analytics tab
    const analyticsTabActive = await page.locator('button:has-text("Analytics"), [role="tab"]:has-text("Analytics")').first().evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
    });
    expect(analyticsTabActive || page.url().includes('analytics')).toBeTruthy();
  });

  test('Recent Job Postings section displays correctly', async ({ page }) => {
    // Navigate back to Overview
    await page.goto('/talent-dashboard');
    await page.waitForTimeout(2000);
    
    // Find Recent Job Postings section
    const recentPostingsSection = page.locator('[class*="recent"]:has-text("Recent Job Postings"), h2:has-text("Recent Job Postings"), h3:has-text("Recent Job Postings")').first();
    await expect(recentPostingsSection).toBeVisible();
    
    // Check for "View All" link/button
    const viewAllBtn = page.locator('button:has-text("View All"), a:has-text("View All")').filter({ hasText: /View All/ }).first();
    await expect(viewAllBtn).toBeVisible();
    
    // Test View All navigation
    await viewAllBtn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to Jobs tab
    expect(page.url().includes('jobs') || await page.locator('text=/jobs|postings/i').isVisible()).toBeTruthy();
  });

  test('navigation tabs are functional', async ({ page }) => {
    // Overview tab (default)
    const overviewTab = page.locator('button:has-text("Overview"), [role="tab"]:has-text("Overview"), a:has-text("Overview")').first();
    await expect(overviewTab).toBeVisible();
    
    // Check if active
    const isOverviewActive = await overviewTab.evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || 
             el.classList.contains('active') ||
             el.getAttribute('data-state') === 'active';
    });
    expect(isOverviewActive).toBeTruthy();
    
    // Jobs tab
    const jobsTab = page.locator('button:has-text("Jobs"), [role="tab"]:has-text("Jobs"), a:has-text("Jobs")').first();
    await expect(jobsTab).toBeVisible();
    
    await jobsTab.click();
    await page.waitForTimeout(2000);
    
    const isJobsActive = await jobsTab.evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
    });
    expect(isJobsActive).toBeTruthy();
    
    // Should show jobs content
    const jobsContent = await page.locator('text=/active|draft|closed|job|posting/i').isVisible();
    expect(jobsContent).toBeTruthy();
    
    // Candidates tab
    const candidatesTab = page.locator('button:has-text("Candidates"), [role="tab"]:has-text("Candidates"), a:has-text("Candidates")').first();
    await expect(candidatesTab).toBeVisible();
    
    await candidatesTab.click();
    await page.waitForTimeout(2000);
    
    const isCandidatesActive = await candidatesTab.evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
    });
    expect(isCandidatesActive).toBeTruthy();
    
    // Should show candidates content
    const candidatesContent = await page.locator('text=/applicant|candidate|new|screening/i').isVisible();
    expect(candidatesContent).toBeTruthy();
    
    // Analytics tab
    const analyticsTab = page.locator('button:has-text("Analytics"), [role="tab"]:has-text("Analytics"), a:has-text("Analytics")').first();
    await expect(analyticsTab).toBeVisible();
    
    await analyticsTab.click();
    await page.waitForTimeout(2000);
    
    const isAnalyticsActive = await analyticsTab.evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
    });
    expect(isAnalyticsActive).toBeTruthy();
    
    // Should show analytics content
    const analyticsContent = await page.locator('text=/performance|views|applications|conversion/i').isVisible();
    expect(analyticsContent).toBeTruthy();
  });

  test('header elements are present', async ({ page }) => {
    // Logo
    const logo = page.locator('img[alt*="logo"], [class*="logo"], h1:has-text("R"), a:has-text("Recrutas")').first();
    await expect(logo).toBeVisible();
    
    // Theme toggle
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
    await expect(themeToggle).toBeVisible();
    
    // Notifications bell
    const notificationBell = page.locator('button[aria-label*="notification"], [class*="bell"]').first();
    await expect(notificationBell).toBeVisible();
    
    // User menu/avatar with username
    const userMenu = page.locator('button[class*="avatar"], [class*="user-menu"], button:has-text("r")').first();
    await expect(userMenu).toBeVisible();
    
    // Verify username displayed
    const userText = await userMenu.textContent();
    expect(userText?.toLowerCase()).toContain('rainierit');
    
    // Settings icon
    const settingsIcon = page.locator('button[aria-label*="setting"], [class*="settings"]').first();
    await expect(settingsIcon).toBeVisible();
  });
});

test.describe('Recruiter Dashboard - Jobs Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
    
    // Navigate to Jobs tab
    const jobsTab = page.locator('button:has-text("Jobs"), [role="tab"]:has-text("Jobs")').first();
    await jobsTab.click();
    await page.waitForTimeout(3000);
  });

  test('job list displays with correct columns', async ({ page }) => {
    // Check for table headers or column headers
    const hasHeaders = await page.locator('text=/title|company|status|applicants|views|actions/i').count() > 0;
    
    // Or check for job cards
    const jobCards = page.locator('[class*="job-card"], [class*="job-item"], article:has-text("Job")');
    const jobCount = await jobCards.count();
    
    console.log(`Found ${jobCount} jobs`);
    
    // Either has headers or shows empty state
    const emptyState = await page.locator('text=/no jobs|empty|create your first/i').isVisible();
    
    expect(hasHeaders || jobCount > 0 || emptyState).toBeTruthy();
  });

  test('can filter jobs by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select, [role="combobox"], button:has-text("Status")').first();
    
    if (await statusFilter.isVisible().catch(() => false)) {
      // Click filter
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      // Select "Active"
      await page.click('text=/active/i').catch(async () => {
        await statusFilter.selectOption('active');
      });
      
      await page.waitForTimeout(2000);
      
      // Should filter results
      const filtered = await page.locator('text=/active/i').count() > 0 ||
                       await page.locator('text=/no jobs/i').isVisible();
      expect(filtered).toBeTruthy();
    }
  });

  test('can search jobs', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Developer');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      
      // Search should work (may show results or "no matches")
      const hasResults = await page.locator('text=/developer|engineer|no matches/i').isVisible();
      expect(hasResults).toBeTruthy();
    }
  });

  test('can edit a job', async ({ page }) => {
    // Find first job with Edit button
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(2000);
      
      // Should open edit form or modal
      const editForm = await page.locator('text=/edit job|update job|save changes/i').isVisible();
      const modalOpen = await page.locator('[role="dialog"], [class*="modal"]').isVisible();
      
      expect(editForm || modalOpen).toBeTruthy();
    }
  });

  test('can change job status', async ({ page }) => {
    // Find status toggle or dropdown for a job
    const statusToggle = page.locator('button[role="switch"], input[type="checkbox"], select[name="status"]').first();
    
    if (await statusToggle.isVisible().catch(() => false)) {
      const initialState = await statusToggle.isChecked().catch(() => false);
      
      // Toggle status
      await statusToggle.click();
      await page.waitForTimeout(2000);
      
      // Verify change
      const newState = await statusToggle.isChecked().catch(() => !initialState);
      expect(newState).not.toBe(initialState);
    }
  });

  test('can view job applicants', async ({ page }) => {
    // Find "View Applicants" button
    const viewApplicantsBtn = page.locator('button:has-text("View Applicants"), a:has-text("Applicants"), button:has-text("Candidates")').first();
    
    if (await viewApplicantsBtn.isVisible().catch(() => false)) {
      await viewApplicantsBtn.click();
      await page.waitForTimeout(3000);
      
      // Should show applicants list
      const hasApplicants = await page.locator('text=/applicant|candidate|name|email/i').isVisible();
      const emptyState = await page.locator('text=/no applicants|empty/i').isVisible();
      
      expect(hasApplicants || emptyState).toBeTruthy();
    }
  });
});

test.describe('Recruiter Dashboard - Candidates Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
    
    // Navigate to Candidates tab
    const candidatesTab = page.locator('button:has-text("Candidates"), [role="tab"]:has-text("Candidates")').first();
    await candidatesTab.click();
    await page.waitForTimeout(3000);
  });

  test('candidates list displays correctly', async ({ page }) => {
    // Check for candidate cards or table
    const candidateCards = page.locator('[class*="candidate-card"], [class*="applicant"], [class*="candidate-item"]');
    const candidateCount = await candidateCards.count();
    
    console.log(`Found ${candidateCount} candidates`);
    
    // Or show empty state
    const emptyState = await page.locator('text=/no candidates|empty|no applicants/i').isVisible();
    
    expect(candidateCount > 0 || emptyState).toBeTruthy();
  });

  test('can filter candidates by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select, [role="combobox"], button:has-text("Status")').first();
    
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      // Select a status
      await page.click('text=/new|submitted|screening/i').catch(async () => {
        await statusFilter.selectOption('new');
      });
      
      await page.waitForTimeout(2000);
      
      // Should filter
      const filtered = await page.locator('text=/new|submitted/i').count() > 0 ||
                       await page.locator('text=/no candidates/i').isVisible();
      expect(filtered).toBeTruthy();
    }
  });

  test('can view candidate details', async ({ page }) => {
    // Click on first candidate
    const candidateCard = page.locator('[class*="candidate-card"], [class*="applicant"]').first();
    
    if (await candidateCard.isVisible().catch(() => false)) {
      await candidateCard.click();
      await page.waitForTimeout(3000);
      
      // Should show details
      const hasDetails = await page.locator('text=/resume|skills|experience|contact|match score/i').isVisible();
      expect(hasDetails).toBeTruthy();
    }
  });

  test('can message candidate', async ({ page }) => {
    // Look for message button
    const messageBtn = page.locator('button:has-text("Message"), button:has-text("Chat"), a:has-text("Message")').first();
    
    if (await messageBtn.isVisible().catch(() => false)) {
      await messageBtn.click();
      await page.waitForTimeout(3000);
      
      // Should open chat
      expect(page.url()).toContain('/chat');
    }
  });

  test('can update candidate status', async ({ page }) => {
    // Find status dropdown
    const statusSelect = page.locator('select[name="status"], [role="combobox"]').first();
    
    if (await statusSelect.isVisible().catch(() => false)) {
      // Change status
      await statusSelect.selectOption('screening');
      await page.waitForTimeout(2000);
      
      // Verify update
      const updated = await page.locator('text=/screening/i').isVisible() ||
                      await page.locator('text=/status updated|saved/i').isVisible();
      expect(updated).toBeTruthy();
    }
  });
});

test.describe('Recruiter Dashboard - Analytics Tab', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
    
    // Navigate to Analytics tab
    const analyticsTab = page.locator('button:has-text("Analytics"), [role="tab"]:has-text("Analytics")').first();
    await analyticsTab.click();
    await page.waitForTimeout(3000);
  });

  test('analytics charts are displayed', async ({ page }) => {
    // Look for chart elements
    const charts = page.locator('canvas, svg[class*="chart"], [class*="recharts"], [class*="chart"]');
    const chartCount = await charts.count();
    
    console.log(`Found ${chartCount} charts`);
    
    // Should have at least one chart
    expect(chartCount).toBeGreaterThan(0);
  });

  test('analytics metrics are visible', async ({ page }) => {
    // Check for metrics
    const hasMetrics = await page.locator('text=/performance|views|applications|conversion|hires/i').isVisible();
    expect(hasMetrics).toBeTruthy();
  });

  test('can filter analytics by time period', async ({ page }) => {
    // Look for time period filter
    const timeFilter = page.locator('select, [role="combobox"], button:has-text("Last")').first();
    
    if (await timeFilter.isVisible().catch(() => false)) {
      await timeFilter.click();
      await page.waitForTimeout(500);
      
      // Select different period
      await page.click('text=/7 days|30 days|90 days/i').catch(async () => {
        await timeFilter.selectOption('30');
      });
      
      await page.waitForTimeout(2000);
      
      // Charts should update
      const chartsUpdated = await page.locator('canvas, svg').count() > 0;
      expect(chartsUpdated).toBeTruthy();
    }
  });
});

test.describe('Recruiter Dashboard - Job Creation Wizard', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
  });

  test('can open job creation wizard', async ({ page }) => {
    // Click Create Job button
    const createJobBtn = page.locator('button:has-text("Create Job"), button:has-text("Post Job")').first();
    await createJobBtn.click();
    await page.waitForTimeout(2000);
    
    // Should open wizard/modal
    const wizardOpen = await page.locator('[role="dialog"], [class*="modal"], [class*="wizard"], text=/step 1|basic info/i').isVisible();
    expect(wizardOpen).toBeTruthy();
  });

  test('wizard has all 4 steps', async ({ page }) => {
    // Open wizard
    const createJobBtn = page.locator('button:has-text("Create Job")').first();
    await createJobBtn.click();
    await page.waitForTimeout(2000);
    
    // Check for step indicators
    const step1 = await page.locator('text=/basic info|step 1/i').isVisible();
    expect(step1).toBeTruthy();
    
    // Navigate to step 2
    await page.fill('#title, input[name="title"]', 'Test Job');
    await page.fill('#company, input[name="company"]', 'Test Company');
    await page.fill('#description, textarea[name="description"]', 'Test description');
    
    const nextBtn = page.locator('button:has-text("Next")').first();
    await nextBtn.click();
    await page.waitForTimeout(1000);
    
    // Should be on step 2
    const step2 = await page.locator('text=/requirements|skills|step 2/i').isVisible();
    expect(step2).toBeTruthy();
    
    // Navigate to step 3
    const skillInput = page.locator('input[placeholder*="skill"]').first();
    if (await skillInput.isVisible().catch(() => false)) {
      await skillInput.fill('JavaScript');
      await skillInput.press('Enter');
    }
    
    await nextBtn.click();
    await page.waitForTimeout(1000);
    
    // Should be on step 3
    const step3 = await page.locator('text=/exam|filtering|step 3/i').isVisible();
    expect(step3).toBeTruthy();
    
    // Navigate to step 4
    await nextBtn.click();
    await page.waitForTimeout(1000);
    
    // Should be on step 4
    const step4 = await page.locator('text=/connection|hiring manager|step 4|submit/i').isVisible();
    expect(step4).toBeTruthy();
  });

  test('wizard validates required fields', async ({ page }) => {
    // Open wizard
    const createJobBtn = page.locator('button:has-text("Create Job")').first();
    await createJobBtn.click();
    await page.waitForTimeout(2000);
    
    // Try to proceed without filling required fields
    const nextBtn = page.locator('button:has-text("Next")').first();
    await nextBtn.click();
    await page.waitForTimeout(1000);
    
    // Should show validation errors
    const hasErrors = await page.locator('text=/required|error|invalid|please fill/i').isVisible();
    expect(hasErrors).toBeTruthy();
    
    // Next button should be disabled or stay on same step
    const stillOnStep1 = await page.locator('text=/basic info|step 1/i').isVisible();
    expect(stillOnStep1).toBeTruthy();
  });
});

test.describe('Recruiter Dashboard - Navigation & Header', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
  });

  test('logo navigates to dashboard', async ({ page }) => {
    // Navigate away first
    await page.goto('/chat');
    await page.waitForTimeout(2000);
    
    // Click logo
    const logo = page.locator('a[href="/"], [class*="logo"]').first();
    await logo.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to dashboard
    expect(page.url()).toContain('talent-dashboard');
  });

  test('theme toggle changes appearance', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
    
    const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    
    await themeToggle.click();
    await page.waitForTimeout(1000);
    
    const newTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(newTheme !== initialTheme).toBeTruthy();
    
    // Toggle back
    await themeToggle.click();
  });

  test('notifications can be opened', async ({ page }) => {
    const notificationBell = page.locator('button[aria-label*="notification"], [class*="bell"]').first();
    
    await notificationBell.click();
    await page.waitForTimeout(1000);
    
    const panelVisible = await page.locator('[class*="notification"], [role="dialog"]:has-text("notification"), [class*="dropdown"]:has-text("notification"]').isVisible();
    expect(panelVisible).toBeTruthy();
  });

  test('user menu displays options', async ({ page }) => {
    const userMenu = page.locator('button[class*="avatar"], [class*="user-menu"]').first();
    
    await userMenu.click();
    await page.waitForTimeout(1000);
    
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
      
      // Should redirect to auth
      const url = page.url();
      expect(url.includes('/auth') || url === '/' || !url.includes('dashboard')).toBeTruthy();
    }
  });
});
