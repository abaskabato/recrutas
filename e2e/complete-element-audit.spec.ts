import { test, expect } from '@playwright/test';
import { loginAsCandidate, loginAsRecruiter } from './auth.spec';

/**
 * Comprehensive UI Elements Test
 * Tests EVERY element on both dashboards
 */

test.describe('CANDIDATE DASHBOARD - Complete Element Audit', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
  });

  test('HEADER - Logo element', async ({ page }) => {
    // Logo exists
    const logo = page.locator('img[alt*="logo"], .logo, h1:has-text("R"), a:has-text("Recrutas")').first();
    await expect(logo).toBeVisible();
    
    // Logo clickable
    const logoLink = page.locator('a[href="/"]').first();
    if (await logoLink.isVisible().catch(() => false)) {
      await logoLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('dashboard');
    }
  });

  test('HEADER - Theme toggle', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
    await expect(themeBtn).toBeVisible();
    
    // Test toggle
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await themeBtn.click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(after !== before).toBeTruthy();
  });

  test('HEADER - Notification bell', async ({ page }) => {
    const bell = page.locator('button[aria-label*="notification"], .bell-icon, header button svg').first();
    await expect(bell).toBeVisible();
    
    await bell.click();
    await page.waitForTimeout(1000);
    
    // Panel should open
    const panel = await page.locator('[class*="notification"], [class*="dropdown"]').isVisible();
    expect(panel).toBeTruthy();
  });

  test('HEADER - User avatar', async ({ page }) => {
    const avatar = page.locator('button[class*="avatar"], .user-menu, button:has-text("A")').first();
    await expect(avatar).toBeVisible();
    
    await avatar.click();
    await page.waitForTimeout(1000);
    
    // Menu should show
    const menu = await page.locator('text=/profile|settings|logout/i').isVisible();
    expect(menu).toBeTruthy();
  });

  test('WELCOME SECTION - Title', async ({ page }) => {
    const title = await page.locator('h1, h2').first().textContent();
    expect(title?.toLowerCase()).toContain('welcome');
  });

  test('WELCOME SECTION - Subtitle', async ({ page }) => {
    const subtitle = await page.locator('p, .subtitle').first().textContent();
    expect(subtitle).toBeTruthy();
    expect(subtitle?.length).toBeGreaterThan(10);
  });

  test('STATS CARD 1 - New Matches', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("New Matches"), div:has-text("New Matches")').first();
    await expect(card).toBeVisible();
    
    const label = await card.locator('text=New Matches').isVisible();
    expect(label).toBeTruthy();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const desc = await card.locator('text=High-quality jobs matched').isVisible();
    expect(desc).toBeTruthy();
    
    const btn = await card.locator('button:has-text("Review Matches"), a:has-text("Review Matches")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('STATS CARD 2 - Profile Views', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("Profile Views"), div:has-text("Profile Views")').first();
    await expect(card).toBeVisible();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const btn = await card.locator('button:has-text("Enhance Profile")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('STATS CARD 3 - Active Chats', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("Active Chats"), div:has-text("Active Chats")').first();
    await expect(card).toBeVisible();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const btn = await card.locator('button:has-text("View Chats")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('STATS CARD 4 - Applications', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("Applications"), div:has-text("Applications")').first();
    await expect(card).toBeVisible();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const btn = await card.locator('button:has-text("Track Applications")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('PROFILE BANNER - Title', async ({ page }) => {
    const banner = page.locator('text=Complete Your Profile').first();
    await expect(banner).toBeVisible();
  });

  test('PROFILE BANNER - Progress text', async ({ page }) => {
    const progress = await page.locator('text=/\\d+% done|0% done/i').isVisible();
    expect(progress).toBeTruthy();
  });

  test('PROFILE BANNER - Progress bar', async ({ page }) => {
    const bar = page.locator('[class*="progress"], [role="progressbar"], div[class*="bg-"]').first();
    await expect(bar).toBeVisible();
  });

  test('PROFILE BANNER - Complete button', async ({ page }) => {
    const btn = page.locator('button:has-text("Complete Profile")').first();
    await expect(btn).toBeVisible();
    
    await btn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate
    const url = page.url();
    expect(url.includes('profile') || url.includes('dashboard')).toBeTruthy();
  });

  test('NAVIGATION - Job Feed tab', async ({ page }) => {
    const tab = page.locator('button:has-text("Job Feed"), a:has-text("Job Feed")').first();
    await expect(tab).toBeVisible();
    
    await tab.click();
    await page.waitForTimeout(1000);
    
    const active = await tab.evaluate(el => el.getAttribute('aria-selected') === 'true' || el.classList.contains('active'));
    expect(active).toBeTruthy();
  });

  test('NAVIGATION - Applications tab', async ({ page }) => {
    const tab = page.locator('button:has-text("Applications"), a:has-text("Applications")').first();
    await expect(tab).toBeVisible();
    
    await tab.click();
    await page.waitForTimeout(2000);
    
    const content = await page.locator('text=/Applications|submitted|no applications/i').isVisible();
    expect(content).toBeTruthy();
  });

  test('NAVIGATION - Recrutas Agent tab', async ({ page }) => {
    const tab = page.locator('button:has-text("Recrutas Agent"), a:has-text("Recrutas Agent")').first();
    await expect(tab).toBeVisible();
    
    await tab.click();
    await page.waitForTimeout(2000);
    
    const content = await page.locator('text=/Agent|AI|tips|recommendations/i').isVisible();
    expect(content).toBeTruthy();
  });

  test('JOB FEED - Search input', async ({ page }) => {
    // Navigate to Job Feed
    await page.click('button:has-text("Job Feed")');
    await page.waitForTimeout(2000);
    
    const search = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await expect(search).toBeVisible();
    
    // Test search
    await search.fill('Developer');
    await search.press('Enter');
    await page.waitForTimeout(2000);
  });

  test('JOB FEED - Job cards exist', async ({ page }) => {
    await page.click('button:has-text("Job Feed")');
    await page.waitForTimeout(3000);
    
    const cards = await page.locator('[class*="job-card"], article, [class*="card"]').count();
    console.log(`Found ${cards} job cards`);
    
    // Should have jobs or empty state
    const hasContent = cards > 0 || await page.locator('text=/no jobs|empty/i').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('PAGE REFRESH - Logo consistency', async ({ page }) => {
    // Get initial logo
    const initialLogo = await page.locator('img[alt*="logo"], .logo').first().getAttribute('src').catch(() => 'text-logo');
    
    // Refresh
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Logo should still be there
    const logo = page.locator('img[alt*="logo"], .logo, h1:has-text("R")').first();
    await expect(logo).toBeVisible();
  });

  test('PAGE REFRESH - Stats persistence', async ({ page }) => {
    // Get initial stats
    const initialMatches = await page.locator('[class*="card"]:has-text("New Matches")').first().locator('h2, .number').textContent();
    
    // Refresh
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Stats should be same
    const afterMatches = await page.locator('[class*="card"]:has-text("New Matches")').first().locator('h2, .number').textContent();
    expect(initialMatches).toBe(afterMatches);
  });
});

test.describe('RECRUITER DASHBOARD - Complete Element Audit', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
  });

  test('HEADER - Logo', async ({ page }) => {
    const logo = page.locator('img[alt*="logo"], .logo, h1:has-text("R"), a:has-text("Recrutas")').first();
    await expect(logo).toBeVisible();
  });

  test('HEADER - Theme toggle', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="theme"], button[aria-label*="dark"]').first();
    await expect(themeBtn).toBeVisible();
  });

  test('HEADER - Notification bell', async ({ page }) => {
    const bell = page.locator('button[aria-label*="notification"], .bell-icon').first();
    await expect(bell).toBeVisible();
  });

  test('HEADER - User avatar with username', async ({ page }) => {
    const avatar = page.locator('button[class*="avatar"], .user-menu').first();
    await expect(avatar).toBeVisible();
    
    // Check username displayed
    const text = await avatar.textContent();
    expect(text?.toLowerCase()).toContain('rainierit');
  });

  test('HEADER - Settings icon', async ({ page }) => {
    const settings = page.locator('button[aria-label*="setting"], .settings-icon, button svg[class*="gear"]').first();
    await expect(settings).toBeVisible();
  });

  test('WELCOME - Title', async ({ page }) => {
    const title = await page.locator('h1, h2').first().textContent();
    expect(title?.toLowerCase()).toContain('welcome');
    expect(title?.toLowerCase()).toContain('talent owner');
  });

  test('CREATE JOB BUTTON - Visible and styled', async ({ page }) => {
    const btn = page.locator('button:has-text("Create Job"), button:has-text("Post Job"), button:has-text("Create Job with Exam")').first();
    await expect(btn).toBeVisible();
    
    // Should be prominent (blue/primary)
    const classes = await btn.evaluate(el => el.className);
    expect(classes).toMatch(/primary|blue|bg-blue|accent/i);
  });

  test('STATS CARD 1 - Active Jobs', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("Active Jobs"), div:has-text("Active Jobs")').first();
    await expect(card).toBeVisible();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const btn = await card.locator('button:has-text("Manage Jobs")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('STATS CARD 2 - Total Matches', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("Total Matches"), div:has-text("Total Matches")').first();
    await expect(card).toBeVisible();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const btn = await card.locator('button:has-text("View Candidates")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('STATS CARD 3 - Active Chats', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("Active Chats"), div:has-text("Active Chats")').first();
    await expect(card).toBeVisible();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const btn = await card.locator('button:has-text("Open Chats")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('STATS CARD 4 - Hires Made', async ({ page }) => {
    const card = page.locator('[class*="card"]:has-text("Hires Made"), div:has-text("Hires Made")').first();
    await expect(card).toBeVisible();
    
    const count = await card.locator('h2, h3, .number').textContent();
    expect(count).toMatch(/\d+/);
    
    const btn = await card.locator('button:has-text("View Analytics")').isVisible();
    expect(btn).toBeTruthy();
  });

  test('RECENT JOBS SECTION - Title', async ({ page }) => {
    const title = page.locator('text=Recent Job Postings').first();
    await expect(title).toBeVisible();
  });

  test('RECENT JOBS SECTION - View All button', async ({ page }) => {
    const btn = page.locator('button:has-text("View All"), a:has-text("View All")').first();
    await expect(btn).toBeVisible();
    
    await btn.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to Jobs tab
    const jobsTab = await page.locator('button:has-text("Jobs"), [role="tab"]:has-text("Jobs")').first().evaluate(el => {
      return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
    });
    expect(jobsTab).toBeTruthy();
  });

  test('RECENT JOBS SECTION - Empty state', async ({ page }) => {
    // Check for empty state message
    const emptyMsg = await page.locator('text=/No job postings|empty|create your first/i').isVisible();
    
    // Or check for job list
    const hasJobs = await page.locator('[class*="job-card"], [class*="job-item"]').count() > 0;
    
    expect(emptyMsg || hasJobs).toBeTruthy();
  });

  test('NAVIGATION - Overview tab', async ({ page }) => {
    const tab = page.locator('button:has-text("Overview"), a:has-text("Overview")').first();
    await expect(tab).toBeVisible();
    
    const active = await tab.evaluate(el => el.getAttribute('aria-selected') === 'true' || el.classList.contains('active'));
    expect(active).toBeTruthy();
  });

  test('NAVIGATION - Jobs tab', async ({ page }) => {
    const tab = page.locator('button:has-text("Jobs"), a:has-text("Jobs")').first();
    await expect(tab).toBeVisible();
    
    await tab.click();
    await page.waitForTimeout(2000);
    
    const content = await page.locator('text=/Jobs|Active|Draft|Closed/i').isVisible();
    expect(content).toBeTruthy();
  });

  test('NAVIGATION - Candidates tab', async ({ page }) => {
    const tab = page.locator('button:has-text("Candidates"), a:has-text("Candidates")').first();
    await expect(tab).toBeVisible();
    
    await tab.click();
    await page.waitForTimeout(2000);
    
    const content = await page.locator('text=/Candidates|Applicants|New|Screening/i').isVisible();
    expect(content).toBeTruthy();
  });

  test('NAVIGATION - Analytics tab', async ({ page }) => {
    const tab = page.locator('button:has-text("Analytics"), a:has-text("Analytics")').first();
    await expect(tab).toBeVisible();
    
    await tab.click();
    await page.waitForTimeout(2000);
    
    const content = await page.locator('text=/Analytics|Performance|Views|Applications|Chart/i').isVisible();
    expect(content).toBeTruthy();
  });

  test('CREATE JOB - Opens wizard', async ({ page }) => {
    const btn = page.locator('button:has-text("Create Job")').first();
    await btn.click();
    await page.waitForTimeout(2000);
    
    // Wizard should open
    const wizard = await page.locator('[role="dialog"], [class*="modal"], text=/Step 1|Basic Info/i').isVisible();
    expect(wizard).toBeTruthy();
  });

  test('PAGE REFRESH - Logo consistency', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(3000);
    
    const logo = page.locator('img[alt*="logo"], .logo, h1:has-text("R")').first();
    await expect(logo).toBeVisible();
  });

  test('PAGE REFRESH - All stats persist', async ({ page }) => {
    // Get stats before refresh
    const before = await page.locator('[class*="card"]:has-text("Active Jobs")').first().locator('h2, .number').textContent();
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Stats after refresh
    const after = await page.locator('[class*="card"]:has-text("Active Jobs")').first().locator('h2, .number').textContent();
    
    expect(before).toBe(after);
  });
});

test.describe('AUTH PAGES - Complete Element Audit', () => {
  
  test('LOGIN PAGE - All elements present', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForTimeout(2000);
    
    // Logo
    const logo = page.locator('img[alt*="logo"], .logo, h1:has-text("R")').first();
    await expect(logo).toBeVisible();
    
    // Email input
    const email = page.locator('input[type="email"], input[name="email"]').first();
    await expect(email).toBeVisible();
    
    // Password input
    const password = page.locator('input[type="password"], input[name="password"]').first();
    await expect(password).toBeVisible();
    
    // Sign in button
    const signIn = page.locator('button:has-text("Sign in"), button[type="submit"]').first();
    await expect(signIn).toBeVisible();
    
    // Forgot password link
    const forgot = page.locator('a:has-text("Forgot"), text=/Forgot password/i').first();
    await expect(forgot).toBeVisible();
    
    // Sign up link
    const signUp = page.locator('a:has-text("Sign up"), text=/Create account|Sign up/i').first();
    await expect(signUp).toBeVisible();
  });

  test('SIGNUP PAGE - All elements present', async ({ page }) => {
    await page.goto('/signup/candidate');
    await page.waitForTimeout(2000);
    
    // Logo
    const logo = page.locator('img[alt*="logo"], .logo').first();
    await expect(logo).toBeVisible();
    
    // Email input
    const email = page.locator('input[type="email"]').first();
    await expect(email).toBeVisible();
    
    // Password input
    const password = page.locator('input[type="password"]').first();
    await expect(password).toBeVisible();
    
    // Sign up button
    const signUp = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")').first();
    await expect(signUp).toBeVisible();
    
    // Login link
    const login = page.locator('a:has-text("Sign in"), text=/Already have|Log in/i').first();
    await expect(login).toBeVisible();
  });

  test('FORGOT PASSWORD PAGE - All elements present', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForTimeout(2000);
    
    // Logo
    const logo = page.locator('img[alt*="logo"], .logo').first();
    await expect(logo).toBeVisible();
    
    // Title
    const title = await page.locator('h1, h2').first().textContent();
    expect(title?.toLowerCase()).toContain('password');
    
    // Email input
    const email = page.locator('input[type="email"]').first();
    await expect(email).toBeVisible();
    
    // Submit button
    const submit = page.locator('button[type="submit"], button:has-text("Send")').first();
    await expect(submit).toBeVisible();
    
    // Back to login
    const back = page.locator('a:has-text("Back"), a:has-text("Sign in"), text=/Back to login/i').first();
    await expect(back).toBeVisible();
  });

  test('PASSWORD RESET FLOW - Works end to end', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForTimeout(2000);
    
    // Enter email
    await page.fill('input[type="email"]', 'abaskabato@gmail.com');
    
    // Click send
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Should show success message
    const success = await page.locator('text=/check your email|sent|success/i').isVisible();
    expect(success).toBeTruthy();
  });
});

test.describe('CROSS-CUTTING - Logo Consistency', () => {
  
  test('Logo same on all pages', async ({ page }) => {
    const pages = ['/auth', '/signup/candidate', '/signup/talent-owner', '/forgot-password'];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForTimeout(2000);
      
      const logo = page.locator('img[alt*="logo"], .logo, h1:has-text("R"), a:has-text("Recrutas")').first();
      await expect(logo).toBeVisible();
      
      console.log(`✅ Logo present on ${url}`);
    }
  });

  test('Logo click always works', async ({ page }) => {
    // Login first
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Navigate away
    await page.goto('/chat');
    await page.waitForTimeout(2000);
    
    // Click logo
    const logo = page.locator('a[href="/"], .logo').first();
    await logo.click();
    await page.waitForTimeout(2000);
    
    // Should be back on dashboard
    expect(page.url()).toContain('dashboard');
  });
});
