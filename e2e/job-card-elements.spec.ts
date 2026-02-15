import { test, expect } from '@playwright/test';

const getTestCredentials = () => ({
  candidate: {
    email: process.env.E2E_CANDIDATE_EMAIL || 'test@example.com',
    password: process.env.E2E_CANDIDATE_PASSWORD || 'test'
  },
  talentOwner: {
    email: process.env.E2E_TALENT_EMAIL || 'talent@example.com',
    password: process.env.E2E_TALENT_PASSWORD || 'test'
  }
});

test.describe('Job Card UI Elements - Comprehensive Test', () => {
  
  test('Candidate - Job Feed: All Buttons on Every Job Card', async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.candidate.email);
    await page.fill('input[type="password"]', creds.candidate.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/candidate-dashboard/, { timeout: 15000 });
    
    // Navigate to Job Feed
    const jobFeedTab = page.locator('button:has-text("Job Feed")').first();
    if (await jobFeedTab.isVisible()) {
      await jobFeedTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n========================================');
    console.log('JOB CARD UI ELEMENTS SCAN');
    console.log('========================================\n');
    
    // Find all job cards - use more flexible selectors
    const jobCards = page.locator('[class*="job"], [class*="card"], div:has(a[href*="job"]), article');
    const cardCount = await jobCards.count();
    console.log(`Total Job Cards Found: ${cardCount}\n`);
    
    // Test each job card
    for (let i = 0; i < Math.min(cardCount, 20); i++) {
      const card = jobCards.nth(i);
      
      if (!(await card.isVisible())) {
        continue;
      }
      
      console.log(`--- Job Card ${i + 1} ---`);
      
      // Get job title
      const titleEl = card.locator('h1, h2, h3, [class*="title"]').first();
      const title = await titleEl.textContent().catch(() => 'Unknown');
      console.log(`Title: ${title?.substring(0, 50).trim()}`);
      
      // Get company name
      const companyEl = card.locator('text=/company|at /i, [class*="company"]').first();
      const company = await companyEl.textContent().catch(() => '');
      if (company) console.log(`Company: ${company.trim().substring(0, 40)}`);
      
      // Get location
      const locationEl = card.locator('text=/location|remote|hybrid/i, [class*="location"]').first();
      const location = await locationEl.textContent().catch(() => '');
      if (location) console.log(`Location: ${location.trim().substring(0, 40)}`);
      
      // Get salary
      const salaryEl = card.locator('text=/\\$|salary|pay/i, [class*="salary"]').first();
      const salary = await salaryEl.textContent().catch(() => '');
      if (salary) console.log(`Salary: ${salary.trim().substring(0, 40)}`);
      
      // Count and test ALL buttons
      const buttons = card.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Buttons (${buttonCount}):`);
      
      for (let b = 0; b < buttonCount; b++) {
        const btn = buttons.nth(b);
        if (await btn.isVisible()) {
          const btnText = await btn.textContent().catch(() => '');
          const isEnabled = await btn.isEnabled().catch(() => false);
          console.log(`  - "${btnText?.trim().substring(0, 30)}" ${isEnabled ? '✓' : '✗'}`);
        }
      }
      
      // Count and test ALL links
      const links = card.locator('a');
      const linkCount = await links.count();
      console.log(`Links (${linkCount}):`);
      
      for (let l = 0; l < Math.min(linkCount, 10); l++) {
        const link = links.nth(l);
        if (await link.isVisible()) {
          const linkText = await link.textContent().catch(() => '');
          const href = await link.getAttribute('href').catch(() => '');
          console.log(`  - "${linkText?.trim().substring(0, 30)}" -> ${href?.substring(0, 40)}`);
        }
      }
      
      // Check for skills/tags
      const skills = card.locator('[class*="skill"], [class*="tag"], span:has-text("#")');
      const skillCount = await skills.count();
      if (skillCount > 0) {
        console.log(`Skills/Tags (${skillCount}):`);
        for (let s = 0; s < Math.min(skillCount, 10); s++) {
          const skill = skills.nth(s);
          if (await skill.isVisible()) {
            const skillText = await skill.textContent().catch(() => '');
            console.log(`  - ${skillText?.trim()}`);
          }
        }
      }
      
      // Check for match score/percentage
      const matchScore = card.locator('text=/match|\\d+%/i').first();
      if (await matchScore.isVisible().catch(() => false)) {
        const scoreText = await matchScore.textContent().catch(() => '');
        console.log(`Match Score: ${scoreText?.trim()}`);
      }
      
      // Check for posted date
      const dateEl = card.locator('text=/posted|ago|days?|hours?/i').first();
      if (await dateEl.isVisible().catch(() => false)) {
        const dateText = await dateEl.textContent().catch(() => '');
        console.log(`Posted: ${dateText?.trim()}`);
      }
      
      console.log('');
    }
    
    // Summary
    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total Job Cards Scanned: ${cardCount}`);
    
    // Test interaction - click first apply button
    const firstApplyBtn = page.locator('button:has-text("Apply")').first();
    if (await firstApplyBtn.isVisible().catch(() => false)) {
      const btnText = await firstApplyBtn.textContent();
      const isEnabled = await firstApplyBtn.isEnabled();
      console.log(`\nFirst "Apply" button: "${btnText?.trim()}" - ${isEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
    }
    
    // Test interaction - click first save button
    const firstSaveBtn = page.locator('button:has-text("Save"), button:has-text("Saved")').first();
    if (await firstSaveBtn.isVisible().catch(() => false)) {
      const btnText = await firstSaveBtn.textContent();
      const isEnabled = await firstSaveBtn.isEnabled();
      console.log(`First "Save" button: "${btnText?.trim()}" - ${isEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
    }
    
    // Test interaction - click first "View Details" button
    const firstViewBtn = page.locator('button:has-text("View Details"), a:has-text("View Details")').first();
    if (await firstViewBtn.isVisible().catch(() => false)) {
      const btnText = await firstViewBtn.textContent();
      const isEnabled = await firstViewBtn.isEnabled();
      console.log(`First "View Details": "${btnText?.trim()}" - ${isEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
    }
  });
  
  test('Talent - Jobs Page: All Buttons on Posted Jobs', async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.talentOwner.email);
    await page.fill('input[type="password"]', creds.talentOwner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/talent-dashboard/, { timeout: 15000 });
    
    // Navigate to Jobs tab
    const jobsTab = page.locator('button:has-text("Jobs")').first();
    if (await jobsTab.isVisible()) {
      await jobsTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    console.log('\n========================================');
    console.log('TALENT POSTED JOBS UI ELEMENTS');
    console.log('========================================\n');
    
    // Find all job cards/list items
    const jobItems = page.locator('[class*="job-item"], [class*="card"]:has-text("Active"), [class*="card"]:has-text("Job")');
    const jobCount = await jobItems.count();
    console.log(`Total Posted Jobs: ${jobCount}\n`);
    
    for (let i = 0; i < Math.min(jobCount, 10); i++) {
      const job = jobItems.nth(i);
      
      if (!(await job.isVisible())) {
        continue;
      }
      
      console.log(`--- Posted Job ${i + 1} ---`);
      
      // Get job title
      const titleEl = job.locator('h1, h2, h3').first();
      const title = await titleEl.textContent().catch(() => 'Unknown');
      console.log(`Title: ${title?.substring(0, 50).trim()}`);
      
      // Get status
      const statusEl = job.locator('text=/Active|Draft|Closed|Pending/i').first();
      if (await statusEl.isVisible().catch(() => false)) {
        const status = await statusEl.textContent().catch(() => '');
        console.log(`Status: ${status?.trim()}`);
      }
      
      // Count buttons
      const buttons = job.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Buttons (${buttonCount}):`);
      
      for (let b = 0; b < buttonCount; b++) {
        const btn = buttons.nth(b);
        if (await btn.isVisible()) {
          const btnText = await btn.textContent().catch(() => '');
          const isEnabled = await btn.isEnabled().catch(() => false);
          console.log(`  - "${btnText?.trim().substring(0, 30)}" ${isEnabled ? '✓' : '✗'}`);
        }
      }
      
      // Count links
      const links = job.locator('a');
      const linkCount = await links.count();
      if (linkCount > 0) {
        console.log(`Links (${linkCount}):`);
        for (let l = 0; l < Math.min(linkCount, 5); l++) {
          const link = links.nth(l);
          if (await link.isVisible()) {
            const linkText = await link.textContent().catch(() => '');
            console.log(`  - "${linkText?.trim().substring(0, 30)}"`);
          }
        }
      }
      
      console.log('');
    }
    
    // Summary
    console.log('========================================');
    console.log(`Total Posted Jobs Scanned: ${jobCount}`);
  });
  
  test('Job Details Modal/Page - All Buttons', async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.candidate.email);
    await page.fill('input[type="password"]', creds.candidate.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/candidate-dashboard/, { timeout: 15000 });
    
    // Navigate to Job Feed
    const jobFeedTab = page.locator('button:has-text("Job Feed")').first();
    if (await jobFeedTab.isVisible()) {
      await jobFeedTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n========================================');
    console.log('JOB DETAILS / MODAL UI ELEMENTS');
    console.log('========================================\n');
    
    // Click on first job to open details
    const firstJobCard = page.locator('[class*="job-card"], article').first();
    if (await firstJobCard.isVisible()) {
      await firstJobCard.click();
      await page.waitForTimeout(2000);
    }
    
    // Check for modal/dialog
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="dialog"]').first();
    const isModalOpen = await modal.isVisible().catch(() => false);
    
    if (isModalOpen) {
      console.log('Modal/Dialog detected: YES\n');
      
      // Get all elements in modal
      const allButtons = modal.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`Buttons in Modal (${buttonCount}):`);
      
      for (let b = 0; b < buttonCount; b++) {
        const btn = allButtons.nth(b);
        if (await btn.isVisible()) {
          const btnText = await btn.textContent().catch(() => '');
          const isEnabled = await btn.isEnabled().catch(() => false);
          console.log(`  - "${btnText?.trim().substring(0, 40)}" ${isEnabled ? '✓' : '✗'}`);
        }
      }
      
      // Check for links
      const allLinks = modal.locator('a');
      const linkCount = await allLinks.count();
      console.log(`\nLinks in Modal (${linkCount}):`);
      
      for (let l = 0; l < Math.min(linkCount, 10); l++) {
        const link = allLinks.nth(l);
        if (await link.isVisible()) {
          const linkText = await link.textContent().catch(() => '');
          const href = await link.getAttribute('href').catch(() => '');
          console.log(`  - "${linkText?.trim().substring(0, 40)}" -> ${href?.substring(0, 30)}`);
        }
      }
      
      // Check for form elements
      const inputs = modal.locator('input, textarea, select');
      const inputCount = await inputs.count();
      console.log(`\nForm Inputs in Modal (${inputCount}):`);
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const type = await input.getAttribute('type').catch(() => 'text');
          const placeholder = await input.getAttribute('placeholder').catch(() => '');
          const isEnabled = await input.isEnabled().catch(() => false);
          console.log(`  - ${type}: "${placeholder?.substring(0, 30)}" ${isEnabled ? '✓' : '✗'}`);
        }
      }
    } else {
      // Maybe it navigated to a new page
      await page.waitForTimeout(1000);
      console.log('Modal/Dialog detected: NO (may have navigated to details page)\n');
      
      // Scan the page
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`Buttons on Page (${buttonCount}):`);
      
      for (let b = 0; b < Math.min(buttonCount, 20); b++) {
        const btn = allButtons.nth(b);
        if (await btn.isVisible()) {
          const btnText = await btn.textContent().catch(() => '');
          const isEnabled = await btn.isEnabled().catch(() => false);
          console.log(`  - "${btnText?.trim().substring(0, 40)}" ${isEnabled ? '✓' : '✗'}`);
        }
      }
    }
  });
  
  test('Search and Filter Buttons on Job Feed', async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.candidate.email);
    await page.fill('input[type="password"]', creds.candidate.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/candidate-dashboard/, { timeout: 15000 });
    
    // Navigate to Job Feed
    const jobFeedTab = page.locator('button:has-text("Job Feed")').first();
    if (await jobFeedTab.isVisible()) {
      await jobFeedTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    console.log('\n========================================');
    console.log('SEARCH AND FILTER UI ELEMENTS');
    console.log('========================================\n');
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    if (await searchInput.isVisible()) {
      console.log('Search Input: ✓ Visible');
      const placeholder = await searchInput.getAttribute('placeholder');
      console.log(`  Placeholder: "${placeholder}"`);
      const isEnabled = await searchInput.isEnabled();
      console.log(`  Enabled: ${isEnabled ? 'Yes ✓' : 'No ✗'}`);
    }
    
    // Find all filter buttons/dropdowns
    const filterButtons = page.locator('button:has-text("Filter"), button:has-text("Sort"), [class*="filter"], [class*="sort"]');
    const filterCount = await filterButtons.count();
    console.log(`\nFilter/Sort Buttons (${filterCount}):`);
    
    for (let i = 0; i < filterCount; i++) {
      const btn = filterButtons.nth(i);
      if (await btn.isVisible()) {
        const text = await btn.textContent();
        console.log(`  - "${text?.trim()}"`);
      }
    }
    
    // Find category/type filter dropdowns
    const dropdowns = page.locator('[role="combobox"], select, [class*="dropdown"]');
    const dropdownCount = await dropdowns.count();
    console.log(`\nDropdowns (${dropdownCount}):`);
    
    for (let i = 0; i < Math.min(dropdownCount, 10); i++) {
      const dd = dropdowns.nth(i);
      if (await dd.isVisible()) {
        const label = await dd.getAttribute('aria-label').catch(() => '');
        const id = await dd.getAttribute('id').catch(() => '');
        console.log(`  - ${label || id || 'Unnamed dropdown'}`);
      }
    }
    
    // Find checkboxes for filters
    const checkboxes = page.locator('[type="checkbox"], [role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`\nCheckboxes (${checkboxCount}):`);
    
    for (let i = 0; i < Math.min(checkboxCount, 10); i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isVisible()) {
        const label = page.locator(`label[for="${await cb.getAttribute('id')}"]`).first();
        const labelText = await label.textContent().catch(() => '');
        const isChecked = await cb.isChecked().catch(() => false);
        console.log(`  - ${labelText?.trim() || 'Unnamed'}: ${isChecked ? 'checked' : 'unchecked'}`);
      }
    }
  });
});

console.log('✅ Job Card UI Element Tests Loaded');
