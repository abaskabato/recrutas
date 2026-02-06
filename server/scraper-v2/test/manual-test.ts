/**
 * Manual Test Script
 * 
 * Test the SOTA scraper by scraping a single company.
 * Run this to verify everything is working before deployment.
 */

import { sotaScraperService } from '../../services/sota-scraper.service.js';

async function testScraper() {
  console.log('🧪 Testing SOTA Scraper\n');
  console.log('═'.repeat(60));
  
  try {
    // Test 1: List all configured companies
    console.log('\n📋 Configured Companies:');
    const companies = sotaScraperService.getCompanies();
    console.log(`   Total: ${companies.length} companies`);
    console.log(`   High priority: ${companies.filter(c => c.priority === 'high').length}`);
    console.log(`   Medium priority: ${companies.filter(c => c.priority === 'medium').length}`);
    
    // Show first 5 companies
    companies.slice(0, 5).forEach(c => {
      console.log(`   • ${c.name} (${c.priority})`);
    });
    if (companies.length > 5) {
      console.log(`   ... and ${companies.length - 5} more`);
    }
    
    // Test 2: Scrape Stripe (should work reliably with Greenhouse API)
    console.log('\n🔍 Test 1: Scraping Stripe (Greenhouse API)');
    console.log('─'.repeat(60));
    
    const stripeResult = await sotaScraperService.scrapeCompany('stripe');
    
    console.log(`   Success: ${stripeResult.success ? '✅' : '❌'}`);
    console.log(`   Jobs Found: ${stripeResult.totalJobsFound}`);
    console.log(`   Jobs Ingested: ${stripeResult.jobsIngested}`);
    console.log(`   Duration: ${stripeResult.duration}ms`);
    
    if (stripeResult.errors.length > 0) {
      console.log(`   Errors: ${stripeResult.errors.join(', ')}`);
    }
    
    // Test 3: Scrape Netflix (Lever API)
    console.log('\n🔍 Test 2: Scraping Netflix (Lever API)');
    console.log('─'.repeat(60));
    
    const netflixResult = await sotaScraperService.scrapeCompany('netflix');
    
    console.log(`   Success: ${netflixResult.success ? '✅' : '❌'}`);
    console.log(`   Jobs Found: ${netflixResult.totalJobsFound}`);
    console.log(`   Jobs Ingested: ${netflixResult.jobsIngested}`);
    console.log(`   Duration: ${netflixResult.duration}ms`);
    
    if (netflixResult.errors.length > 0) {
      console.log(`   Errors: ${netflixResult.errors.join(', ')}`);
    }
    
    // Test 4: Full scrape (commented out - takes longer)
    /*
    console.log('\n🔍 Test 3: Full Scrape (All Companies)');
    console.log('─'.repeat(60));
    console.log('   This will take ~60 seconds...');
    
    const fullResult = await sotaScraperService.scrapeAll();
    
    console.log(`   Success: ${fullResult.success ? '✅' : '❌'}`);
    console.log(`   Companies Scraped: ${fullResult.companiesScraped}`);
    console.log(`   Total Jobs Found: ${fullResult.totalJobsFound}`);
    console.log(`   Jobs Ingested: ${fullResult.jobsIngested}`);
    console.log(`   Duration: ${fullResult.duration}ms`);
    console.log(`   Errors: ${fullResult.errors.length}`);
    */
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Tests Complete!\n');
    
    console.log('Next steps:');
    console.log('  1. Deploy to Vercel: vercel --prod');
    console.log('  2. Check Vercel Dashboard for cron job');
    console.log('  3. Monitor logs after first run');
    console.log();
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.log('\nTroubleshooting:');
    console.log('  • Check GROQ_API_KEY is set');
    console.log('  • Verify DATABASE_URL is configured');
    console.log('  • Check network connectivity');
    process.exit(1);
  }
}

// Run the test
testScraper();
