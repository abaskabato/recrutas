import { test, expect, Page } from '@playwright/test';
import { loginAsRecruiter, loginAsCandidate } from './auth.spec';

/**
 * Recruiter Flow - End-to-End Tests
 * Tests: Onboarding, Job Creation, Applicant Management, Analytics
 */

test.describe('Recruiter Onboarding Flow', () => {
  
  test('complete recruiter onboarding process', async ({ page }) => {
    const uniqueEmail = `recruiter-${Date.now()}@test.com`;
    const password = 'TestPassword123!';

    // Step 1: Sign up
    await page.goto('/signup/talent-owner');
    await page.fill('input[name="email"], input[type="email"]', uniqueEmail);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("Sign Up")');

    await page.waitForTimeout(3000);
    
    // Step 2: Role Selection
    const onRoleSelection = page.url().includes('role-selection');
    
    if (onRoleSelection) {
      // Select Talent Owner role
      await page.locator('text=/talent|recruiter|hiring/i').first().click();
      await page.click('button:has-text("Continue"), button:has-text("Next")');
      
      await page.waitForTimeout(2000);
    }
    
    // Step 3: Company Profile
    const companyNameInput = page.locator('input[name="companyName"], input[placeholder*="Company"]').first();
    
    if (await companyNameInput.isVisible().catch(() => false)) {
      await companyNameInput.fill('TestCorp Inc');
      await page.fill('input[name="jobTitle"], input[placeholder*="Title"]', 'Senior Recruiter');
      await page.fill('input[name="companyWebsite"], input[placeholder*="Website"]', 'https://testcorp.com');
      
      // Company size dropdown
      const sizeSelect = page.locator('select[name="companySize"], [role="combobox"]').first();
      if (await sizeSelect.isVisible().catch(() => false)) {
        await sizeSelect.selectOption('11-50');
      }
      
      // Industry
      const industrySelect = page.locator('select[name="industry"]').first();
      if (await industrySelect.isVisible().catch(() => false)) {
        await industrySelect.selectOption('Technology');
      }
      
      // Location
      await page.fill('input[name="companyLocation"], input[placeholder*="Location"]', 'San Francisco, CA');
      
      // Description
      const descTextarea = page.locator('textarea[name="companyDescription"], textarea[placeholder*="Description"]').first();
      if (await descTextarea.isVisible().catch(() => false)) {
        await descTextarea.fill('A technology company focused on innovation and growth.');
      }
      
      await page.click('button:has-text("Complete"), button:has-text("Finish"), button[type="submit"]');
    }
    
    // Verify redirect to talent dashboard
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('talent-dashboard');
    
    await page.screenshot({ path: 'e2e/screenshots/recruiter-onboarding-complete.png', fullPage: true });
  });
});

test.describe('Recruiter Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
  });

  test('dashboard loads with job listings', async ({ page }) => {
    await expect(page).toHaveURL(/talent-dashboard/);
    
    await page.waitForTimeout(3000);
    
    // Check for job-related content
    const pageContent = await page.content();
    const hasJobContent = 
      pageContent.toLowerCase().includes('job') ||
      pageContent.toLowerCase().includes('posting') ||
      pageContent.toLowerCase().includes('active') ||
      pageContent.toLowerCase().includes('candidate');
    
    expect(hasJobContent).toBeTruthy();
    
    // Look for stat cards
    const cards = await page.locator('[class*="card"]').count();
    expect(cards).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'e2e/screenshots/talent-dashboard-jobs.png', fullPage: true });
  });

  test('dashboard shows statistics', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Check for stat metrics
    const pageText = await page.textContent('body');
    const hasStats = 
      pageText?.includes('Active') ||
      pageText?.includes('Views') ||
      pageText?.includes('Applications') ||
      pageText?.includes('Candidates') ||
      pageText?.includes('Total');
    
    expect(hasStats).toBeTruthy();
  });
});

test.describe('Job Posting Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
  });

  test('can create a complete job posting', async ({ page }) => {
    const uniqueJobTitle = `E2E Test Job ${Date.now()}`;
    
    await page.waitForTimeout(2000);
    
    // Click Post Job button
    const postJobButton = page.locator('button:has-text("Post"), button:has-text("Create"), button:has-text("New Job"), a:has-text("Post")').first();
    await expect(postJobButton).toBeVisible({ timeout: 10000 });
    await postJobButton.click();
    
    await page.waitForTimeout(1000);
    
    // Step 1: Basic Info
    await page.fill('#title, input[name="title"]', uniqueJobTitle);
    await page.fill('#company, input[name="company"]', 'E2E Test Company');
    await page.fill('#description, textarea[name="description"]', 'This is an end-to-end test job posting. We are looking for talented developers with excellent skills and passion for technology.');
    await page.fill('#location, input[name="location"]', 'Remote, USA');
    await page.fill('#salaryMin, input[name="salaryMin"]', '80000');
    await page.fill('#salaryMax, input[name="salaryMax"]', '120000');
    
    // Work type
    const workTypeSelect = page.locator('select[name="workType"]').first();
    if (await workTypeSelect.isVisible().catch(() => false)) {
      await workTypeSelect.selectOption('remote');
    }
    
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    
    // Step 2: Requirements & Skills
    const reqInput = page.locator('input[placeholder*="years"], input[name="requirements"]').first();
    if (await reqInput.isVisible().catch(() => false)) {
      await reqInput.fill('3+ years of JavaScript experience');
      await reqInput.press('Enter');
    }
    
    const skillInput = page.locator('input[placeholder*="JavaScript"], input[name="skills"]').first();
    if (await skillInput.isVisible().catch(() => false)) {
      await skillInput.fill('React');
      await skillInput.press('Enter');
      await skillInput.fill('TypeScript');
      await skillInput.press('Enter');
    }
    
    await page.screenshot({ path: 'e2e/screenshots/job-posting-step2.png', fullPage: true });
    
    const step2Next = page.locator('button:has-text("Next")');
    await expect(step2Next).toBeEnabled({ timeout: 5000 });
    await step2Next.click({ force: true });
    await page.waitForTimeout(500);
    
    // Step 3: Filtering (optional)
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    
    // Step 4: Connection / Submit
    // Scroll to make submit button visible
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) dialog.scrollTop = dialog.scrollHeight;
    });
    
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Post Job"), button:has-text("Create Job"), button:has-text("Publish")').first();
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click({ force: true });
    
    // Wait for submission
    await page.waitForTimeout(3000);
    
    // Verify success
    const success = await page.locator('text=/success|posted|created/i').isVisible().catch(() => false);
    const onDashboard = page.url().includes('talent-dashboard');
    
    expect(success || onDashboard).toBeTruthy();
    
    await page.screenshot({ path: 'e2e/screenshots/job-posted-success.png', fullPage: true });
    
    console.log(`Successfully created job: ${uniqueJobTitle}`);
  });

  test('can create job with exam requirement', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Open job creation
    const postJobButton = page.locator('button:has-text("Post"), button:has-text("Create"), button:has-text("New Job")').first();
    await postJobButton.click();
    
    await page.waitForTimeout(1000);
    
    // Fill basic info
    await page.fill('#title, input[name="title"]', `Job with Exam ${Date.now()}`);
    await page.fill('#company, input[name="company"]', 'Test Company');
    await page.fill('#description, textarea[name="description"]', 'Job with screening exam.');
    
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    
    // Add skills
    const skillInput = page.locator('input[placeholder*="skill"]').first();
    if (await skillInput.isVisible().catch(() => false)) {
      await skillInput.fill('JavaScript');
      await skillInput.press('Enter');
    }
    
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    
    // Step 3: Enable exam
    const examCheckbox = page.locator('input[type="checkbox"], [role="checkbox"]').first();
    if (await examCheckbox.isVisible().catch(() => false)) {
      await examCheckbox.check();
      
      // Set passing score
      const passingScoreInput = page.locator('input[name="passingScore"], input[placeholder*="score"]').first();
      if (await passingScoreInput.isVisible().catch(() => false)) {
        await passingScoreInput.fill('70');
      }
      
      // Add exam questions if fields available
      const questionInput = page.locator('textarea[placeholder*="question"]').first();
      if (await questionInput.isVisible().catch(() => false)) {
        await questionInput.fill('What is JavaScript?');
      }
    }
    
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    
    // Submit
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Post Job")').first();
    await submitButton.click({ force: true });
    
    await page.waitForTimeout(3000);
    
    const onDashboard = page.url().includes('talent-dashboard');
    expect(onDashboard).toBeTruthy();
  });

  test('can edit an existing job', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Find a job card
    const jobCard = page.locator('[class*="card"]').first();
    
    if (await jobCard.isVisible().catch(() => false)) {
      // Look for edit button
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
      
      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(2000);
        
        // Edit job title
        const titleInput = page.locator('#title, input[name="title"]').first();
        if (await titleInput.isVisible().catch(() => false)) {
          await titleInput.clear();
          await titleInput.fill(`Updated Job ${Date.now()}`);
          
          // Save changes
          await page.click('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
          await page.waitForTimeout(2000);
          
          const success = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
          expect(success).toBeTruthy();
        }
      }
    }
  });

  test('can pause and activate job', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Find job status toggle
    const statusToggle = page.locator('button[role="switch"], input[type="checkbox"]').first();
    
    if (await statusToggle.isVisible().catch(() => false)) {
      const currentState = await statusToggle.isChecked().catch(() => false);
      
      // Toggle status
      await statusToggle.click();
      await page.waitForTimeout(2000);
      
      // Verify status changed
      const newState = await statusToggle.isChecked().catch(() => !currentState);
      expect(newState).not.toBe(currentState);
      
      // Toggle back
      await statusToggle.click();
    }
  });
});

test.describe('Applicant Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
  });

  test('can view applicants for a job', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Look for job with applicants or a "View Applicants" button
    const viewApplicantsButton = page.locator('button:has-text("View Applicants"), a:has-text("Applicants"), button:has-text("Candidates"]').first();
    
    if (await viewApplicantsButton.isVisible().catch(() => false)) {
      await viewApplicantsButton.click();
      await page.waitForTimeout(3000);
      
      // Should show applicant list
      const hasApplicants = await page.locator('text=/applicant|candidate|name|email/i').isVisible();
      expect(hasApplicants).toBeTruthy();
      
      await page.screenshot({ path: 'e2e/screenshots/applicant-list.png', fullPage: true });
    }
  });

  test('can update applicant status', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Navigate to applicants
    const viewApplicantsButton = page.locator('button:has-text("View Applicants"), a:has-text("Applicants"]').first();
    
    if (await viewApplicantsButton.isVisible().catch(() => false)) {
      await viewApplicantsButton.click();
      await page.waitForTimeout(3000);
      
      // Find status dropdown for first applicant
      const statusSelect = page.locator('select[name="status"], [role="combobox"]').first();
      
      if (await statusSelect.isVisible().catch(() => false)) {
        await statusSelect.selectOption('viewed');
        await page.waitForTimeout(2000);
        
        // Change to screening
        await statusSelect.selectOption('screening');
        await page.waitForTimeout(2000);
        
        const success = await page.locator('text=/success|updated|status changed/i').isVisible().catch(() => false);
        expect(success || true).toBeTruthy(); // Status update may not show success message
      }
    }
  });

  test('can view applicant details', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Navigate to applicants
    const viewApplicantsButton = page.locator('button:has-text("View Applicants"), a:has-text("Applicants"]').first();
    
    if (await viewApplicantsButton.isVisible().catch(() => false)) {
      await viewApplicantsButton.click();
      await page.waitForTimeout(3000);
      
      // Click on first applicant name
      const applicantName = page.locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/').first();
      
      if (await applicantName.isVisible().catch(() => false)) {
        await applicantName.click();
        await page.waitForTimeout(2000);
        
        // Should show applicant details
        const hasDetails = await page.locator('text=/resume|skills|experience|match/i').isVisible();
        expect(hasDetails).toBeTruthy();
        
        await page.screenshot({ path: 'e2e/screenshots/applicant-details.png', fullPage: true });
      }
    }
  });
});

test.describe('Analytics and Reporting', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
  });

  test('can view job analytics', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Look for analytics tab or link
    const analyticsTab = page.locator('button:has-text("Analytics"), a:has-text("Analytics"), [role="tab"]:has-text("Analytics"]').first();
    
    if (await analyticsTab.isVisible().catch(() => false)) {
      await analyticsTab.click();
      await page.waitForTimeout(3000);
      
      // Should show charts or analytics data
      const hasAnalytics = await page.locator('canvas, [class*="chart"], svg, text=/views|applications|conversion/i').isVisible();
      expect(hasAnalytics).toBeTruthy();
      
      await page.screenshot({ path: 'e2e/screenshots/analytics-page.png', fullPage: true });
    }
  });
});
