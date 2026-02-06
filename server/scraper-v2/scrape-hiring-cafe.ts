/**
 * Hiring.cafe Scraper Example
 * 
 * This demonstrates scraping hiring.cafe itself as a job aggregator.
 * The SOTA scraper will extract jobs from hiring.cafe using multiple strategies.
 */

import { 
  scraperOrchestrator, 
  CompanyConfig 
} from './index.js';

// Hiring.cafe configuration
const hiringCafeConfig: CompanyConfig = {
  id: 'hiring-cafe',
  name: 'Hiring.cafe',
  displayName: 'Hiring.cafe',
  website: 'https://hiring.cafe',
  careerPageUrl: 'https://hiring.cafe',
  scrapeConfig: {
    // Try multiple strategies to extract jobs
    strategies: ['json_ld', 'data_island', 'ai_extraction', 'html_parsing'],
    
    // CSS selectors for HTML parsing fallback
    selectors: {
      jobContainer: '[data-testid="job-card"], .job-card, .job-listing, article, .position',
      title: 'h2, h3, .job-title, [data-testid="job-title"], .title',
      location: '.location, [data-testid="location"], .job-location, .place',
      description: '.description, .job-description, .summary, p'
    },
    
    // Pagination settings
    pagination: {
      type: 'infinite_scroll',
      maxPages: 10
    }
  },
  scrapeFrequency: 'hourly',
  isActive: true,
  priority: 'high'
};

async function scrapeHiringCafe() {
  console.log('🎯 Scraping Hiring.cafe\n');
  
  try {
    const startTime = Date.now();
    const { result, jobs } = await scraperOrchestrator.scrapeCompany(hiringCafeConfig);
    const duration = Date.now() - startTime;
    
    console.log('✅ Scraping Complete!\n');
    console.log('═'.repeat(60));
    console.log('📊 Results');
    console.log('═'.repeat(60));
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`💼 Jobs Found: ${jobs.length}`);
    console.log(`✨ Success: ${result.success ? 'Yes' : 'No'}`);
    console.log(`🔧 Method Used: ${result.method}`);
    console.log();
    
    if (jobs.length > 0) {
      console.log('═'.repeat(60));
      console.log('📝 Sample Jobs from Hiring.cafe');
      console.log('═'.repeat(60));
      
      jobs.slice(0, 10).forEach((job, i) => {
        console.log(`\n${i + 1}. ${job.title}`);
        console.log(`   🏢 ${job.company}`);
        console.log(`   📍 ${job.location.raw}`);
        console.log(`   💻 ${job.workType} | ${job.employmentType}`);
        console.log(`   🔗 ${job.externalUrl.substring(0, 70)}...`);
      });
      
      // Show unique companies
      const uniqueCompanies = [...new Set(jobs.map(j => j.company))];
      console.log(`\n📈 Companies Found: ${uniqueCompanies.length}`);
      console.log(`   ${uniqueCompanies.slice(0, 10).join(', ')}${uniqueCompanies.length > 10 ? '...' : ''}`);
      
      // Show job distribution by type
      const remoteCount = jobs.filter(j => j.isRemote).length;
      const seniorCount = jobs.filter(j => j.experienceLevel === 'senior').length;
      
      console.log(`\n📊 Job Distribution:`);
      console.log(`   Remote: ${remoteCount} (${((remoteCount/jobs.length)*100).toFixed(1)}%)`);
      console.log(`   Senior+: ${seniorCount} (${((seniorCount/jobs.length)*100).toFixed(1)}%)`);
    }
    
    if (result.error) {
      console.log('\n⚠️  Error:');
      console.log(`   Type: ${result.error.type}`);
      console.log(`   Message: ${result.error.message}`);
    }
    
    console.log('\n✨ Done!\n');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  }
}

// Run the scraper
scrapeHiringCafe();
