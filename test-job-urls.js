// Test script to verify job URL extraction quality
import fetch from 'node:fetch';

async function testJobURLExtraction() {
  console.log('Testing job URL extraction...\n');
  
  // Test Shopify
  try {
    console.log('Testing Shopify career page...');
    const shopifyResponse = await fetch('https://www.shopify.com/careers');
    const shopifyHTML = await shopifyResponse.text();
    
    // Look for specific job URLs vs generic career page
    const jobLinkPatterns = [
      /href="(\/careers\/[^"]*\/[a-zA-Z0-9\-]+)"/g,
      /data-job-id="([^"]+)"/g,
      /\/careers\/\d+/g
    ];
    
    let specificJobsFound = 0;
    for (const pattern of jobLinkPatterns) {
      const matches = shopifyHTML.match(pattern);
      if (matches) {
        specificJobsFound += matches.length;
        console.log(`Found ${matches.length} matches with pattern: ${pattern.source}`);
        console.log('Sample URLs:', matches.slice(0, 3));
      }
    }
    
    console.log(`Total specific job URLs found on Shopify: ${specificJobsFound}\n`);
    
  } catch (error) {
    console.error('Error testing Shopify:', error.message);
  }
  
  // Test Stripe
  try {
    console.log('Testing Stripe jobs page...');
    const stripeResponse = await fetch('https://stripe.com/jobs');
    const stripeHTML = await stripeResponse.text();
    
    // Look for Stripe job patterns
    const stripeJobPatterns = [
      /href="(\/jobs\/[^"]+)"/g,
      /\/jobs\/[a-zA-Z0-9\-]+/g
    ];
    
    let stripeJobsFound = 0;
    for (const pattern of stripeJobPatterns) {
      const matches = stripeHTML.match(pattern);
      if (matches) {
        stripeJobsFound += matches.length;
        console.log(`Found ${matches.length} Stripe job URLs with pattern: ${pattern.source}`);
        console.log('Sample URLs:', matches.slice(0, 3).map(url => `https://stripe.com${url.replace('href="', '').replace('"', '')}`));
      }
    }
    
    console.log(`Total specific job URLs found on Stripe: ${stripeJobsFound}\n`);
    
  } catch (error) {
    console.error('Error testing Stripe:', error.message);
  }
}

testJobURLExtraction().catch(console.error);