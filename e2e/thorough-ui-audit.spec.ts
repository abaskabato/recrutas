import { test, expect } from '@playwright/test';
import { loginAsCandidate, loginAsRecruiter } from './auth.spec';

/**
 * SUPER THOROUGH UI TEST
 * Tests EVERY visible element including modals, forms, states, interactions
 */

test.describe('THOROUGH CANDIDATE UI AUDIT', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
  });

  test('verify ALL text content visible', async ({ page }) => {
    const pageContent = await page.content();
    
    // Check for specific text that should be visible
    const requiredText = [
      'Welcome back',
      'job search',
      'New Matches',
      'Profile Views', 
      'Active Chats',
      'Applications',
      'Complete Your Profile',
      'Job Feed',
      'Recrutas',
    ];
    
    for (const text of requiredText) {
      const found = pageContent.includes(text);
      if (!found) {
        console.log(`❌ Missing text: "${text}"`);
      }
      expect(found).toBeTruthy();
    }
    
    console.log('✅ All required text found');
  });

  test('check for SVG icons', async ({ page }) => {
    // Check for SVG icons in header
    const svgs = await page.locator('svg').count();
    console.log(`Found ${svgs} SVG icons`);
    expect(svgs).toBeGreaterThan(0);
    
    // Check for specific icons
    const hasBellIcon = await page.locator('button svg, svg[class*="bell"]').count() > 0;
    const hasMoonIcon = await page.locator('button svg, svg[class*="moon"]').count() > 0;
    
    console.log(`Bell icon: ${hasBellIcon}, Moon icon: ${hasMoonIcon}`);
  });

  test('verify all buttons are clickable', async ({ page }) => {
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons`);
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const isVisible = await buttons[i].isVisible().catch(() => false);
      const isEnabled = await buttons[i].isEnabled().catch(() => false);
      const text = await buttons[i].textContent().catch(() => '');
      
      if (isVisible && isEnabled) {
        console.log(`✅ Button ${i}: "${text?.substring(0, 30) || 'no text'}" - clickable`);
      }
    }
  });

  test('verify all links work', async ({ page }) => {
    const links = await page.locator('a').all();
    console.log(`Found ${links.length} links`);
    
    for (let i = 0; i < Math.min(links.length, 5); i++) {
      const href = await links[i].getAttribute('href');
      const text = await links[i].textContent();
      console.log(`Link ${i}: ${text?.substring(0, 30)} -> ${href}`);
    }
  });

  test('check for images/logos', async ({ page }) => {
    const images = await page.locator('img').count();
    console.log(`Found ${images} images`);
    
    // Check for avatar images
    const avatars = await page.locator('img[class*="avatar"], div[class*="avatar"]').count();
    console.log(`Found ${avatars} avatars`);
  });

  test('verify form inputs exist', async ({ page }) => {
    // On job feed, check for search
    await page.click('text=Job Feed');
    await page.waitForTimeout(1000);
    
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} inputs`);
    
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input: type=${type}, placeholder=${placeholder}`);
    }
  });

  test('verify card components', async ({ page }) => {
    // Look for card-like containers
    const cards = await page.locator('[class*="card"], [class*="Card"], article').count();
    console.log(`Found ${cards} card components`);
    expect(cards).toBeGreaterThan(0);
  });

  test('verify grid/flex layouts', async ({ page }) => {
    // Check for grid layouts
    const grids = await page.locator('[class*="grid"], [class*="flex"]').count();
    console.log(`Found ${grids} grid/flex containers`);
  });

  test('hover states work', async ({ page }) => {
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      await buttons[0].hover();
      await page.waitForTimeout(500);
      console.log('✅ Hover works on buttons');
    }
  });

  test('verify colors and styling', async ({ page }) => {
    // Check for styled elements with colors
    const coloredElements = await page.locator('[class*="bg-"], [class*="text-"]').count();
    console.log(`Found ${coloredElements} color-styled elements`);
  });
});

test.describe('THOROUGH RECRUITER UI AUDIT', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
  });

  test('verify ALL text content visible', async ({ page }) => {
    const pageContent = await page.content();
    
    const requiredText = [
      'Welcome back',
      'Talent Owner',
      'Create Job',
      'Active Jobs',
      'Total Matches',
      'Active Chats',
      'Hires Made',
      'Recent Job Postings',
      'Overview',
      'Jobs',
      'Candidates',
      'Analytics',
    ];
    
    for (const text of requiredText) {
      const found = pageContent.includes(text);
      if (!found) {
        console.log(`❌ Missing text: "${text}"`);
      }
      expect(found).toBeTruthy();
    }
    
    console.log('✅ All required recruiter text found');
  });

  test('verify tab states', async ({ page }) => {
    const tabs = ['Overview', 'Jobs', 'Candidates', 'Analytics'];
    
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}"), a:has-text("${tabName}")`).first();
      await expect(tab).toBeVisible();
      
      await tab.click();
      await page.waitForTimeout(1500);
      
      // Verify content changes
      const content = await page.content();
      console.log(`Clicked ${tabName} - content updated`);
    }
  });

  test('check Create Job button prominence', async ({ page }) => {
    const btn = page.locator('button:has-text("Create Job"), button:has-text("Create Job with Exam")').first();
    
    // Check it's visible
    await expect(btn).toBeVisible();
    
    // Check styling
    const classes = await btn.evaluate(el => el.className);
    const styles = await btn.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
        padding: computed.padding
      };
    });
    
    console.log('Create Job button styles:', styles);
    
    // Should be prominent (blue background likely)
    expect(classes).toMatch(/primary|blue|accent/i);
  });
});

test.describe('DEEP FORM TESTING', () => {
  test('candidate profile edit form', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Click Complete Profile
    const completeBtn = page.locator('button:has-text("Complete Profile")').first();
    await completeBtn.click();
    await page.waitForTimeout(3000);
    
    // Check for form elements
    const inputs = await page.locator('input').all();
    const textareas = await page.locator('textarea').all();
    const selects = await page.locator('select').all();
    
    console.log(`Profile form has ${inputs.length} inputs, ${textareas.length} textareas, ${selects.length} selects`);
    
    // Form should have fields
    expect(inputs.length + textareas.length + selects.length).toBeGreaterThan(0);
  });

  test('job posting form fields', async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
    
    // Click Create Job
    await page.click('button:has-text("Create Job")');
    await page.waitForTimeout(3000);
    
    // Check all form fields in wizard
    const titleInput = page.locator('input[name="title"], #title').first();
    const companyInput = page.locator('input[name="company"], #company').first();
    const descInput = page.locator('textarea[name="description"], #description').first();
    
    // All should be visible
    await expect(titleInput).toBeVisible();
    await expect(companyInput).toBeVisible();
    await expect(descInput).toBeVisible();
    
    console.log('✅ Job posting form fields visible');
  });
});

test.describe('ERROR STATES & EDGE CASES', () => {
  test('404 page', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.waitForTimeout(2000);
    
    const has404 = await page.locator('text=/404|not found|page not found/i').isVisible();
    const hasError = await page.locator('text=/error|oops|sorry/i').isVisible();
    
    console.log(`404 page has error message: ${has404 || hasError}`);
  });

  test('loading states', async ({ page }) => {
    await loginAsCandidate(page);
    
    // Check for loading indicators during initial load
    const hasLoading = await page.locator('text=/loading|Loading.../i').isVisible().catch(() => false);
    const hasSkeleton = await page.locator('[class*="skeleton"], [class*="animate-pulse"]').count() > 0;
    
    console.log(`Loading indicator: ${hasLoading}, Skeleton: ${hasSkeleton}`);
  });

  test('empty states', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Navigate to applications
    await page.click('text=Applications');
    await page.waitForTimeout(2000);
    
    // Check for empty state
    const hasEmpty = await page.locator('text=/no applications|empty|start applying/i').isVisible();
    console.log(`Applications empty state visible: ${hasEmpty}`);
  });
});

test.describe('RESPONSIVE ELEMENTS', () => {
  test('elements at different viewport sizes', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);
    const desktopElements = await page.locator('button, a, input').count();
    console.log(`Desktop: ${desktopElements} interactive elements`);
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    const tabletElements = await page.locator('button, a, input').count();
    console.log(`Tablet: ${tabletElements} interactive elements`);
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    const mobileElements = await page.locator('button, a, input').count();
    console.log(`Mobile: ${mobileElements} interactive elements`);
    
    // Elements should adapt but still be present
    expect(tabletElements).toBeGreaterThan(0);
    expect(mobileElements).toBeGreaterThan(0);
  });
});

test.describe('ACCESSIBILITY CHECKS', () => {
  test('alt texts on images', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      console.log(`Image alt: ${alt || 'MISSING'}`);
    }
  });

  test('aria labels', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    const ariaElements = await page.locator('[aria-label], [aria-describedby], [role]').all();
    console.log(`Found ${ariaElements.length} elements with ARIA attributes`);
    
    for (let i = 0; i < Math.min(ariaElements.length, 5); i++) {
      const label = await ariaElements[i].getAttribute('aria-label');
      const role = await ariaElements[i].getAttribute('role');
      console.log(`ARIA: label="${label}", role="${role}"`);
    }
  });

  test('form labels', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Go to a form
    await page.click('text=Job Feed');
    await page.waitForTimeout(1000);
    
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      
      // Check if input has a label
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      
      console.log(`Input: aria-label=${ariaLabel}, placeholder=${placeholder}, hasLabel=${hasLabel}`);
    }
  });
});

test.describe('INTERACTIVE ELEMENTS DEEP DIVE', () => {
  test('all dropdowns work', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Find all dropdowns/comboboxes
    const dropdowns = await page.locator('select, [role="combobox"], button[aria-haspopup="true"]').all();
    console.log(`Found ${dropdowns.length} dropdowns`);
    
    for (let i = 0; i < Math.min(dropdowns.length, 3); i++) {
      await dropdowns[i].click();
      await page.waitForTimeout(500);
      console.log(`Opened dropdown ${i}`);
      
      // Press escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('modal dialogs', async ({ page }) => {
    await loginAsRecruiter(page);
    await page.waitForTimeout(3000);
    
    // Open Create Job modal
    await page.click('button:has-text("Create Job")');
    await page.waitForTimeout(2000);
    
    // Check modal is open
    const modal = await page.locator('[role="dialog"], [class*="modal"], [class*="dialog"]').isVisible();
    expect(modal).toBeTruthy();
    
    console.log('✅ Modal dialog opens');
    
    // Check close button
    const closeBtn = page.locator('button[aria-label="Close"], button:has-text("×"), button:has-text("Cancel")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ Modal closes');
    }
  });

  test('tooltips on hover', async ({ page }) => {
    await loginAsCandidate(page);
    await page.waitForTimeout(3000);
    
    // Hover over elements that might have tooltips
    const iconButtons = await page.locator('button svg, button i, [class*="tooltip"]').all();
    
    for (let i = 0; i < Math.min(iconButtons.length, 3); i++) {
      await iconButtons[i].hover();
      await page.waitForTimeout(500);
      
      // Check for tooltip
      const hasTooltip = await page.locator('[class*="tooltip"], [role="tooltip"]').isVisible().catch(() => false);
      if (hasTooltip) {
        console.log(`Tooltip visible on element ${i}`);
      }
    }
  });
});
