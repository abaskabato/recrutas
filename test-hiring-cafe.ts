import { firefox } from 'playwright';
import * as fs from 'fs';

const HIRING_CAFE_URL = 'https://hiring.cafe';

async function testHiringCafeAccess() {
  console.log('🧪 Testing Hiring Cafe access methods...\n');
  
  const results = {
    basicFetch: null,
    playwrightStealth: null,
    playwrightWithProxy: null
  };
  
  // Test 1: Basic fetch (will likely fail)
  console.log('📡 Test 1: Basic HTTP fetch...');
  try {
    const response = await fetch(HIRING_CAFE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const html = await response.text();
    results.basicFetch = {
      status: response.status,
      blocked: html.includes('Vercel') || html.includes('bot') || html.includes('captcha'),
      length: html.length,
      preview: html.substring(0, 500)
    };
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Length: ${html.length} chars`);
    console.log(`   Blocked: ${results.basicFetch.blocked ? 'YES' : 'NO'}`);
  } catch (error) {
    results.basicFetch = { error: error.message };
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 2: Playwright with Firefox
  console.log('\n🎭 Test 2: Playwright Firefox (real browser)...');
  let browser;
  try {
    browser = await firefox.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Intercept response
    let pageStatus = null;
    page.on('response', response => {
      if (response.url() === HIRING_CAFE_URL) {
        pageStatus = response.status();
      }
    });
    
    await page.goto(HIRING_CAFE_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait a moment for any JS rendering
    await page.waitForTimeout(2000);
    
    const html = await page.content();
    const title = await page.title();
    
    // Check if we see job listings
    const hasJobs = await page.locator('text=/engineer|developer|designer/i').count() > 0;
    const hasError = html.includes('Vercel') || html.includes('bot') || html.includes('blocked');
    
    results.playwrightStealth = {
      status: pageStatus,
      title: title,
      length: html.length,
      hasJobs: hasJobs,
      blocked: hasError,
      preview: html.substring(0, 500)
    };
    
    console.log(`   Status: ${pageStatus}`);
    console.log(`   Title: ${title}`);
    console.log(`   Length: ${html.length} chars`);
    console.log(`   Has job listings: ${hasJobs ? 'YES' : 'NO'}`);
    console.log(`   Blocked: ${hasError ? 'YES' : 'NO'}`);
    
    // Save screenshot
    await page.screenshot({ path: 'hiring-cafe-test.png', fullPage: true });
    console.log('   📸 Screenshot saved: hiring-cafe-test.png');
    
  } catch (error) {
    results.playwrightStealth = { error: error.message };
    console.log(`   Error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
  
  // Save results
  const timestamp = new Date().toISOString();
  fs.writeFileSync(`hiring-cafe-test-${timestamp.replace(/[:.]/g, '-')}.json`, 
    JSON.stringify(results, null, 2));
  
  console.log('\n📊 SUMMARY:');
  console.log('==========');
  console.log(`Basic fetch blocked: ${results.basicFetch?.blocked || 'N/A'}`);
  console.log(`Playwright blocked: ${results.playwrightStealth?.blocked || 'N/A'}`);
  console.log(`Playwright found jobs: ${results.playwrightStealth?.hasJobs || 'N/A'}`);
  
  if (results.playwrightStealth?.hasJobs) {
    console.log('\n✅ SUCCESS: Playwright bypasses Vercel detection!');
  } else if (!results.playwrightStealth?.blocked) {
    console.log('\n⚠️  PARTIAL: Page loads but no jobs detected (may need different selectors)');
  } else {
    console.log('\n❌ FAILED: Vercel blocks Playwright too');
  }
}

testHiringCafeAccess().catch(console.error);
