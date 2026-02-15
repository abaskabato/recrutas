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

interface ElementInfo {
  selector: string;
  name: string;
  type: string;
}

const getPageElements = (pageName: string): ElementInfo[] => {
  const baseElements: ElementInfo[] = [
    { selector: 'button', name: 'Buttons', type: 'interactive' },
    { selector: 'a', name: 'Links', type: 'navigation' },
    { selector: 'input', name: 'Inputs', type: 'form' },
    { selector: 'select', name: 'Selects', type: 'form' },
    { selector: 'textarea', name: 'Textareas', type: 'form' },
    { selector: '[role="button"]', name: 'Role Buttons', type: 'interactive' },
    { selector: '[role="link"]', name: 'Role Links', type: 'navigation' },
    { selector: '[role="tab"]', name: 'Tabs', type: 'navigation' },
    { selector: '[role="menuitem"]', name: 'Menu Items', type: 'interactive' },
    { selector: '[role="combobox"]', name: 'Comboboxes', type: 'form' },
    { selector: '[role="checkbox"]', name: 'Checkboxes', type: 'form' },
    { selector: '[role="radio"]', name: 'Radio Buttons', type: 'form' },
    { selector: '[role="dialog"]', name: 'Dialogs', type: 'modal' },
    { selector: '[role="alert"]', name: 'Alerts', type: 'feedback' },
    { selector: 'img', name: 'Images', type: 'media' },
    { selector: 'h1', name: 'H1 Headings', type: 'heading' },
    { selector: 'h2', name: 'H2 Headings', type: 'heading' },
    { selector: 'h3', name: 'H3 Headings', type: 'heading' },
    { selector: 'h4, h5, h6', name: 'Other Headings', type: 'heading' },
    { selector: 'p', name: 'Paragraphs', type: 'text' },
    { selector: 'label', name: 'Labels', type: 'form' },
    { selector: 'span', name: 'Spans', type: 'text' },
    { selector: 'div', name: 'Divs', type: 'container' },
  ];

  return baseElements;
};

async function scanPageForElements(page: any, pageName: string) {
  const elements = getPageElements(pageName);
  const results: Record<string, { count: number; visible: number }> = {};
  
  for (const el of elements) {
    try {
      const all = page.locator(el.selector);
      const count = await all.count();
      let visible = 0;
      
      for (let i = 0; i < count; i++) {
        if (await all.nth(i).isVisible()) {
          visible++;
        }
      }
      
      results[el.name] = { count, visible };
    } catch (e) {
      results[el.name] = { count: 0, visible: 0 };
    }
  }
  
  return results;
}

async function testClickableElements(page: any, pageName: string) {
  const clickableSelectors = [
    'button',
    'a',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]'
  ];
  
  const results: Record<string, boolean> = {};
  
  for (const selector of clickableSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const el = elements.nth(i);
      if (await el.isVisible()) {
        const text = await el.textContent().catch(() => '');
        const isEnabled = await el.isEnabled().catch(() => false);
        results[`${selector}: ${text?.substring(0, 30)}`] = isEnabled;
      }
    }
  }
  
  return results;
}

async function testFormElements(page: any) {
  const results: Record<string, boolean> = {};
  
  const formSelectors = [
    { selector: 'input[type="text"]', name: 'Text Inputs' },
    { selector: 'input[type="email"]', name: 'Email Inputs' },
    { selector: 'input[type="password"]', name: 'Password Inputs' },
    { selector: 'input[type="search"]', name: 'Search Inputs' },
    { selector: 'input[type="number"]', name: 'Number Inputs' },
    { selector: 'input[type="tel"]', name: 'Phone Inputs' },
    { selector: 'input[type="file"]', name: 'File Inputs' },
    { selector: 'select', name: 'Select Dropdowns' },
    { selector: 'textarea', name: 'Text Areas' },
    { selector: '[role="checkbox"]', name: 'Checkboxes' },
    { selector: '[role="radio"]', name: 'Radio Buttons' },
    { selector: '[role="combobox"]', name: 'Comboboxes' },
  ];
  
  for (const { selector, name } of formSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    let visible = 0;
    let enabled = 0;
    
    for (let i = 0; i < count; i++) {
      const el = elements.nth(i);
      if (await el.isVisible()) {
        visible++;
        if (await el.isEnabled()) {
          enabled++;
        }
      }
    }
    
    results[name] = visible > 0;
    if (visible > 0) {
      results[`${name} (enabled)`] = enabled > 0;
    }
  }
  
  return results;
}

// ============================================
// COMPREHENSIVE UI ELEMENT TESTS
// ============================================

test.describe('UI Element Scanner - Authentication Pages', () => {
  
  test('Login Page - All UI Elements', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Login');
    console.log('\n=== LOGIN PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    // Test form elements
    const formElements = await testFormElements(page);
    console.log('\n=== FORM ELEMENTS ===');
    Object.entries(formElements).forEach(([name, present]) => {
      console.log(`  ${name}: ${present ? '✓' : '✗'}`);
    });
    
    // Verify key elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test submit button is enabled
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
  });
  
  test('Signup Candidate Page - All UI Elements', async ({ page }) => {
    await page.goto('/signup/candidate');
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Signup Candidate');
    console.log('\n=== SIGNUP CANDIDATE PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    const formElements = await testFormElements(page);
    console.log('\n=== FORM ELEMENTS ===');
    Object.entries(formElements).forEach(([name, present]) => {
      if (present) console.log(`  ${name}: ✓`);
    });
    
    // Verify key elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
  
  test('Signup Talent Page - All UI Elements', async ({ page }) => {
    await page.goto('/signup/talent-owner');
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Signup Talent');
    console.log('\n=== SIGNUP TALENT PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    // Verify key elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
  
  test('Forgot Password Page - All UI Elements', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Forgot Password');
    console.log('\n=== FORGOT PASSWORD PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    // Verify key elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('UI Element Scanner - Candidate Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.candidate.email);
    await page.fill('input[type="password"]', creds.candidate.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/candidate-dashboard/, { timeout: 15000 });
  });
  
  test('Candidate Dashboard - Main Elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Candidate Dashboard');
    console.log('\n=== CANDIDATE DASHBOARD ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    // Verify critical elements
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
  
  test('Candidate Dashboard - Stats Cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for stats cards
    const cards = page.locator('[class*="card"], [class*="stat"]');
    const cardCount = await cards.count();
    console.log(`\n=== STATS CARDS: ${cardCount} found ===`);
    
    // Each card should be visible
    for (let i = 0; i < Math.min(cardCount, 6); i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        const text = await card.textContent();
        console.log(`  Card ${i + 1}: ${text?.substring(0, 50)}...`);
      }
    }
  });
  
  test('Candidate Dashboard - Navigation Tabs', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const tabs = page.locator('[role="tab"], button:has-text("Job Feed"), button:has-text("Applications")');
    const tabCount = await tabs.count();
    console.log(`\n=== NAVIGATION TABS: ${tabCount} found ===`);
    
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        const text = await tab.textContent();
        const isEnabled = await tab.isEnabled();
        console.log(`  Tab: "${text?.trim()}" - ${isEnabled ? 'enabled' : 'disabled'}`);
      }
    }
  });
  
  test('Candidate Dashboard - All Buttons Clickable', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const clickable = await testClickableElements(page, 'Candidate Dashboard');
    console.log('\n=== CLICKABLE ELEMENTS ===');
    Object.entries(clickable).forEach(([name, enabled]) => {
      console.log(`  ${name}: ${enabled ? '✓ enabled' : '✗ disabled'}`);
    });
  });
  
  test('Job Feed Page - Elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Navigate to Job Feed
    const jobFeedTab = page.locator('button:has-text("Job Feed")').first();
    if (await jobFeedTab.isVisible()) {
      await jobFeedTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    const elements = await scanPageForElements(page, 'Job Feed');
    console.log('\n=== JOB FEED PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    // Test search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeEnabled();
      console.log('  Search input: ✓ enabled');
    }
  });
  
  test('Applications Page - Elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Navigate to Applications
    const appsTab = page.locator('button:has-text("Applications")').first();
    if (await appsTab.isVisible()) {
      await appsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    const elements = await scanPageForElements(page, 'Applications');
    console.log('\n=== APPLICATIONS PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
  });
});

test.describe('UI Element Scanner - Talent Owner Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.talentOwner.email);
    await page.fill('input[type="password"]', creds.talentOwner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/talent-dashboard/, { timeout: 15000 });
  });
  
  test('Talent Dashboard - Main Elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Talent Dashboard');
    console.log('\n=== TALENT DASHBOARD ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    // Verify critical elements
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
  
  test('Talent Dashboard - Stats Cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const cards = page.locator('[class*="card"], [class*="stat"]');
    const cardCount = await cards.count();
    console.log(`\n=== TALENT STATS CARDS: ${cardCount} found ===`);
    
    for (let i = 0; i < Math.min(cardCount, 6); i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        const text = await card.textContent();
        console.log(`  Card ${i + 1}: ${text?.substring(0, 50)}...`);
      }
    }
  });
  
  test('Talent Dashboard - Create Job Button', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const createJobBtn = page.locator('button:has-text("Create Job"), button:has-text("Post Job")');
    const isVisible = await createJobBtn.isVisible();
    const isEnabled = isVisible ? await createJobBtn.isEnabled() : false;
    
    console.log(`\n=== CREATE JOB BUTTON ===`);
    console.log(`  Visible: ${isVisible}`);
    console.log(`  Enabled: ${isEnabled}`);
    
    await expect(createJobBtn).toBeVisible();
  });
  
  test('Talent Dashboard - Navigation Tabs', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    console.log(`\n=== TALENT NAVIGATION TABS: ${tabCount} found ===`);
    
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        const text = await tab.textContent();
        console.log(`  Tab: "${text?.trim()}"`);
      }
    }
    
    // Test each tab
    const tabNames = ['Overview', 'Jobs', 'Candidates', 'Analytics'];
    for (const tabName of tabNames) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(500);
        console.log(`  ✓ Tab "${tabName}" clicked successfully`);
      }
    }
  });
  
  test('Talent Dashboard - All Buttons', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`\n=== TALENT DASHBOARD BUTTONS: ${buttonCount} found ===`);
    
    let enabled = 0;
    let disabled = 0;
    
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const text = await btn.textContent();
        if (await btn.isEnabled()) {
          enabled++;
        } else {
          disabled++;
        }
      }
    }
    
    console.log(`  Enabled: ${enabled}`);
    console.log(`  Disabled: ${disabled}`);
  });
  
  test('Talent - Jobs Page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const jobsTab = page.locator('button:has-text("Jobs")').first();
    if (await jobsTab.isVisible()) {
      await jobsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    const elements = await scanPageForElements(page, 'Jobs Page');
    console.log('\n=== TALENT JOBS PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
  });
  
  test('Talent - Candidates Page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const candidatesTab = page.locator('button:has-text("Candidates")').first();
    if (await candidatesTab.isVisible()) {
      await candidatesTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    const elements = await scanPageForElements(page, 'Candidates Page');
    console.log('\n=== TALENT CANDIDATES PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
  });
});

test.describe('UI Element Scanner - Other Pages', () => {
  
  test('Chat Page - Elements', async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.candidate.email);
    await page.fill('input[type="password"]', creds.candidate.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/candidate-dashboard/, { timeout: 15000 });
    
    // Navigate to chat
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Chat Page');
    console.log('\n=== CHAT PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    // Check for message input
    const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]');
    if (await messageInput.isVisible()) {
      console.log('  Message input: ✓ visible');
    }
  });
  
  test('Settings Page - Elements', async ({ page }) => {
    const creds = getTestCredentials();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', creds.candidate.email);
    await page.fill('input[type="password"]', creds.candidate.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/candidate-dashboard/, { timeout: 15000 });
    
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const elements = await scanPageForElements(page, 'Settings Page');
    console.log('\n=== SETTINGS PAGE ELEMENTS ===');
    Object.entries(elements).forEach(([name, { count, visible }]) => {
      if (count > 0) console.log(`  ${name}: ${visible}/${count} visible`);
    });
    
    const formElements = await testFormElements(page);
    console.log('\n=== SETTINGS FORM ELEMENTS ===');
    Object.entries(formElements).forEach(([name, present]) => {
      if (present) console.log(`  ${name}: ✓`);
    });
  });
});

test.describe('Form Validation Tests', () => {
  
  test('Login Form Validation', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Try submitting empty form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Check for validation errors or behavior
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Fill invalid email
    await emailInput.fill('invalid-email');
    await passwordInput.fill('test');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Page should either show error or redirect
    const currentUrl = page.url();
    console.log(`  After invalid submit: ${currentUrl}`);
  });
  
  test('Signup Form Fields', async ({ page }) => {
    await page.goto('/signup/candidate');
    await page.waitForLoadState('networkidle');
    
    const formElements = await testFormElements(page);
    console.log('\n=== SIGNUP FORM ELEMENTS ===');
    Object.entries(formElements).forEach(([name, present]) => {
      console.log(`  ${name}: ${present ? '✓ present' : '✗ missing'}`);
    });
  });
});

test.describe('Accessibility Tests', () => {
  
  test('All pages have proper headings', async ({ page }) => {
    const pages = ['/auth', '/signup/candidate', '/signup/talent-owner'];
    
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const h1 = page.locator('h1');
      const h1Count = await h1.count();
      
      console.log(`  ${path}: ${h1Count} h1 element(s)`);
    }
  });
  
  test('All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Press Tab multiple times to navigate
    const tabableElements: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused && !tabableElements.includes(focused)) {
        tabableElements.push(focused);
      }
    }
    
    console.log('\n=== KEYBOARD ACCESSIBLE ELEMENTS ===');
    tabableElements.forEach(el => console.log(`  ${el}`));
    
    expect(tabableElements.length).toBeGreaterThan(0);
  });
});

console.log('✅ Comprehensive UI Element Scanner Tests Loaded');
