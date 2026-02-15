import { firefox } from 'playwright';
import * as fs from 'fs';

const PROMPT = `Search Hiring.Cafe for [Security Guard] in [Seattle, WA]. Apply the following strict constraints:
 
    Source Filtering: Only include "Direct Apply" roles. Manually verify that the destination URL is a primary corporate domain (e.g., amazon.jobs, workday.com, greenhouse.io) and exclude all aggregators like LinkedIn, Indeed, or Dice.
    Alphanumeric ID Extraction: Extract the unique Requisition ID. Look specifically for patterns like "JR-123", "Job ID: 123456", or numeric strings found at the end of the URL.
    Validation Rule: If a Requisition ID is not explicitly visible in the text or the URL, perform a "Deep Search" on that company's career portal to find it. If it cannot be found, exclude the listing entirely.
    Output Format: Provide a Markdown table with:
        Company
        Job Title
        Requisition ID (Must be the specific alphanumeric code)
        Direct URL (The clean link to the official career site)
    Quality Check: Ensure no "Ghost Jobs" are included by checking for a recent "Post Date" if available. show me 20 of them at the same time`;

async function testGoogleAIMode() {
  console.log('🚀 Launching browser...');
  
  const browser = await firefox.launch({
    headless: true, // Required for CI/server environments
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Method 1: Direct URL with udm=50
    console.log('📡 Navigating to Google AI Mode...');
    const searchQuery = encodeURIComponent('Security Guard jobs Seattle WA');
    await page.goto(`https://www.google.com/search?q=${searchQuery}&udm=50`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('⏳ Waiting for AI Mode to load...');
    
    // Wait for AI container (multiple selectors as fallback)
    const selectors = [
      'div[data-subtree="aimc"]',
      'div[jsname="Fe7oBc"]',
      '[data-attrid="wa"]',
      '.AIvNff' // Google's AI response class (changes frequently)
    ];
    
    let aiContainer = null;
    for (const selector of selectors) {
      try {
        aiContainer = await page.waitForSelector(selector, { timeout: 5000 });
        if (aiContainer) {
          console.log(`✅ Found AI container with selector: ${selector}`);
          break;
        }
      } catch {
        console.log(`❌ Selector not found: ${selector}`);
      }
    }
    
    if (!aiContainer) {
      console.log('⚠️  AI container not found. Taking screenshot for debugging...');
      await page.screenshot({ path: 'google-ai-debug.png', fullPage: true });
      console.log('📸 Screenshot saved to google-ai-debug.png');
      
      // Save page HTML for analysis
      const html = await page.content();
      fs.writeFileSync('google-ai-debug.html', html);
      console.log('💾 HTML saved to google-ai-debug.html');
      
      await browser.close();
      return;
    }
    
    // Method 2: Look for search input and paste prompt
    console.log('📝 Looking for search input to paste full prompt...');
    const searchInput = await page.$('textarea[name="q"]') || await page.$('input[name="q"]');
    
    if (searchInput) {
      await searchInput.fill('');
      await searchInput.fill(PROMPT);
      await searchInput.press('Enter');
      
      console.log('⏳ Waiting for AI response with full prompt...');
      await page.waitForTimeout(5000);
      
      // Re-find AI container after new search
      for (const selector of selectors) {
        try {
          aiContainer = await page.waitForSelector(selector, { timeout: 5000 });
          if (aiContainer) break;
        } catch {}
      }
    }
    
    // Extract the AI response
    console.log('📤 Extracting AI response...');
    const responseText = await aiContainer.innerText();
    const responseHTML = await aiContainer.innerHTML();
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    fs.writeFileSync(`google-ai-response-${timestamp}.txt`, responseText);
    console.log(`💾 Text response saved to google-ai-response-${timestamp}.txt`);
    
    fs.writeFileSync(`google-ai-response-${timestamp}.html`, responseHTML);
    console.log(`💾 HTML response saved to google-ai-response-${timestamp}.html`);
    
    // Display preview
    console.log('\n📋 Response Preview (first 2000 chars):\n');
    console.log(responseText.substring(0, 2000));
    console.log('\n... [truncated] ...\n');
    
    // Try to parse markdown table
    const tableMatch = responseText.match(/\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/g);
    if (tableMatch) {
      console.log(`✅ Found ${tableMatch.length} table rows`);
    } else {
      console.log('⚠️  No markdown table detected in response');
    }
    
    // Take screenshot
    await page.screenshot({ path: `google-ai-result-${timestamp}.png`, fullPage: true });
    console.log(`📸 Screenshot saved to google-ai-result-${timestamp}.png`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'google-ai-error.png' });
  } finally {
    console.log('\n🔚 Closing browser in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testGoogleAIMode().catch(console.error);
