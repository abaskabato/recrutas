// Test hiring.cafe scraping directly
import { jobAggregator } from './server/job-aggregator.js';

async function testScraping() {
  console.log('Testing hiring.cafe scraping...');
  
  try {
    const jobs = await jobAggregator.fetchFromHiringCafe();
    console.log(`\n✅ Successfully scraped ${jobs.length} jobs from hiring.cafe`);
    
    if (jobs.length > 0) {
      console.log('\n📋 Sample scraped jobs:');
      jobs.slice(0, 3).forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.title} at ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Source: ${job.source}`);
        console.log(`   Skills: ${job.skills.join(', ')}`);
      });
    } else {
      console.log('\n⚠️  No jobs found - hiring.cafe may have changed their structure');
    }
  } catch (error) {
    console.error('\n❌ Error testing scraping:', error.message);
  }
}

testScraping();