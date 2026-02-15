import { chromium } from 'playwright';

async function scrapeHiringCafe() {
  console.log('Launching browser with stealth mode...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }
  });
  
  // Stealth: Override webdriver property
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // @ts-ignore
    window.navigator.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });
  
  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('Console error:', msg.text());
  });

  try {
    console.log('Navigating to hiring.cafe...');
    
    // Try with longer wait and different approach
    await page.goto('https://hiring.cafe', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait longer for JS to execute
    await page.waitForTimeout(5000);
    
    // Check for checkpoint
    const pageContent = await page.content();
    if (pageContent.includes('verifying your browser') || pageContent.includes('Security Checkpoint') || pageContent.includes('Vercel')) {
      console.log('❌ Still blocked by checkpoint');
      
      // Try the jobs page directly
      console.log('Trying direct job search URL...');
      await page.goto('https://hiring.cafe/search-jobs?searchQuery=sales&location=United+States', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      await page.waitForTimeout(5000);
      
      const content2 = await page.content();
      if (content2.includes('verifying') || content2.includes('checkpoint')) {
        console.log('❌ Direct URL also blocked');
        return [];
      }
    }
    
    // Try to find job listings
    console.log('Looking for job listings...');
    
    // Wait for any content to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    const bodyText = await page.textContent('body');
    console.log('Page loaded, length:', bodyText?.length || 0);
    
    // Try different selectors
    const selectors = [
      '[class*="job"]',
      '[class*="Job"]', 
      '.job-card',
      '.jobCard',
      'article',
      '[data-testid*="job"]',
      '.results .item',
      '.job-listing'
    ];
    
    for (const sel of selectors) {
      const elements = await page.$$(sel);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${sel}`);
      }
    }
    
    // Get all links that might be job URLs
    const links = await page.$$eval('a[href*="job"], a[href*="career"]', (as) => 
      as.map(a => ({ href: a.href, text: a.textContent?.slice(0, 50) })).slice(0, 10)
    );
    console.log('Job links found:', links.length);
    console.log(JSON.stringify(links.slice(0, 5), null, 2));
    
    return links;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

scrapeHiringCafe();
