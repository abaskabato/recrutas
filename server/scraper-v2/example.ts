/**
 * Quick Start Example
 * 
 * This example demonstrates how to use the SOTA job scraper
 * to scrape jobs from multiple companies.
 */

import { 
  scraperOrchestrator, 
  CompanyConfig,
  ScrapedJob 
} from './index.js';

// Define companies to scrape
const companies: CompanyConfig[] = [
  // Companies with ATS APIs (fastest, most reliable)
  {
    id: 'stripe',
    name: 'Stripe',
    displayName: 'Stripe',
    website: 'https://stripe.com',
    careerPageUrl: 'https://stripe.com/jobs',
    ats: { type: 'greenhouse', boardId: 'stripe' },
    scrapeConfig: {
      strategies: ['api', 'json_ld'],
      pagination: { type: 'none', maxPages: 1 }
    },
    scrapeFrequency: 'daily',
    isActive: true,
    priority: 'high'
  },
  {
    id: 'netflix',
    name: 'Netflix',
    displayName: 'Netflix',
    website: 'https://netflix.com',
    careerPageUrl: 'https://jobs.netflix.com/',
    ats: { type: 'lever', boardId: 'netflix' },
    scrapeConfig: {
      strategies: ['api', 'ai_extraction'],
      pagination: { type: 'none', maxPages: 1 }
    },
    scrapeFrequency: 'daily',
    isActive: true,
    priority: 'high'
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    displayName: 'Airbnb',
    website: 'https://airbnb.com',
    careerPageUrl: 'https://careers.airbnb.com/',
    ats: { type: 'greenhouse', boardId: 'airbnb' },
    scrapeConfig: {
      strategies: ['api'],
      pagination: { type: 'none', maxPages: 1 }
    },
    scrapeFrequency: 'daily',
    isActive: true,
    priority: 'high'
  },
  
  // Companies without known ATS (use AI extraction)
  {
    id: 'google',
    name: 'Google',
    displayName: 'Google',
    website: 'https://google.com',
    careerPageUrl: 'https://careers.google.com/jobs/results/',
    scrapeConfig: {
      strategies: ['json_ld', 'data_island', 'ai_extraction', 'html_parsing'],
      pagination: { type: 'url_param', param: 'page', maxPages: 5 }
    },
    scrapeFrequency: 'daily',
    isActive: true,
    priority: 'high'
  },
  
  // Company with custom selectors
  {
    id: 'custom-corp',
    name: 'Custom Corporation',
    displayName: 'Custom Corporation',
    website: 'https://customcorp.com',
    careerPageUrl: 'https://customcorp.com/careers',
    scrapeConfig: {
      strategies: ['html_parsing', 'ai_extraction'],
      selectors: {
        jobContainer: '.job-listing',
        title: '.job-title h2',
        location: '.job-location',
        description: '.job-description'
      },
      pagination: { type: 'none', maxPages: 1 }
    },
    scrapeFrequency: 'weekly',
    isActive: true,
    priority: 'medium'
  },
  
  // Hiring.cafe - Meta-aggregator scraping
  {
    id: 'hiring-cafe',
    name: 'Hiring.cafe',
    displayName: 'Hiring.cafe',
    website: 'https://hiring.cafe',
    careerPageUrl: 'https://hiring.cafe',
    scrapeConfig: {
      strategies: ['json_ld', 'data_island', 'ai_extraction', 'html_parsing'],
      selectors: {
        jobContainer: '[data-testid="job-card"], .job-card, .job-listing, article',
        title: 'h2, h3, .job-title, [data-testid="job-title"]',
        location: '.location, [data-testid="location"], .job-location',
        description: '.description, .job-description, p'
      },
      pagination: { type: 'infinite_scroll', maxPages: 10 }
    },
    scrapeFrequency: 'hourly',
    isActive: true,
    priority: 'high'
  }
];

async function main() {
  console.log('🚀 Starting SOTA Job Scraper\n');
  
  try {
    // Scrape all companies
    console.log(`📋 Scraping ${companies.length} companies...\n`);
    
    const startTime = Date.now();
    const { results, jobs, metrics } = await scraperOrchestrator.scrapeCompanies(companies);
    const duration = (Date.now() - startTime) / 1000;
    
    // Print results
    console.log('✅ Scraping Complete!\n');
    console.log('═'.repeat(60));
    console.log('📊 Summary');
    console.log('═'.repeat(60));
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    console.log(`🏢 Companies: ${results.length}`);
    console.log(`💼 Total Jobs: ${jobs.length}`);
    console.log(`✨ Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`⚡ Avg Latency: ${metrics.averageLatency.toFixed(0)}ms`);
    console.log();
    
    // Print per-company results
    console.log('═'.repeat(60));
    console.log('🏢 Company Results');
    console.log('═'.repeat(60));
    
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      const method = result.method.toUpperCase().padEnd(15);
      const jobCount = result.jobs.length.toString().padStart(3);
      
      console.log(`${status} ${result.companyName.padEnd(20)} | ${method} | ${jobCount} jobs | ${result.duration}ms`);
      
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error.type} - ${result.error.message}`);
      }
    }
    console.log();
    
    // Print job breakdown
    console.log('═'.repeat(60));
    console.log('💼 Job Breakdown');
    console.log('═'.repeat(60));
    
    const remoteJobs = jobs.filter(j => j.isRemote);
    const seniorJobs = jobs.filter(j => j.experienceLevel === 'senior');
    const engJobs = jobs.filter(j => 
      j.title.toLowerCase().includes('engineer') || 
      j.title.toLowerCase().includes('developer')
    );
    
    console.log(`🌐 Remote Jobs: ${remoteJobs.length}`);
    console.log(`👨‍💻 Senior+ Roles: ${seniorJobs.length}`);
    console.log(`⚙️  Engineering: ${engJobs.length}`);
    console.log();
    
    // Print top sources
    console.log('═'.repeat(60));
    console.log('📡 Top Sources');
    console.log('═'.repeat(60));
    
    for (const { source, count } of metrics.topSources) {
      console.log(`  ${source.padEnd(20)}: ${count} jobs`);
    }
    console.log();
    
    // Print sample jobs
    console.log('═'.repeat(60));
    console.log('📝 Sample Jobs');
    console.log('═'.repeat(60));
    
    jobs.slice(0, 5).forEach((job, i) => {
      console.log(`\n${i + 1}. ${job.title}`);
      console.log(`   🏢 ${job.company}`);
      console.log(`   📍 ${job.location.raw}`);
      console.log(`   💻 ${job.workType} | ${job.employmentType}`);
      console.log(`   🔗 ${job.externalUrl.substring(0, 60)}...`);
      
      if (job.skills.length > 0) {
        console.log(`   🛠️  ${job.skills.slice(0, 5).join(', ')}${job.skills.length > 5 ? '...' : ''}`);
      }
    });
    console.log();
    
    // Print errors if any
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.log('═'.repeat(60));
      console.log('⚠️  Errors');
      console.log('═'.repeat(60));
      
      for (const result of errors) {
        console.log(`❌ ${result.companyName}: ${result.error?.type}`);
        console.log(`   ${result.error?.message}`);
      }
      console.log();
    }
    
    // Health check
    console.log('═'.repeat(60));
    console.log('🏥 Health Check');
    console.log('═'.repeat(60));
    
    const health = scraperOrchestrator.getHealthCheck();
    console.log(`Status: ${health.status.toUpperCase()}`);
    console.log(`Database: ${health.checks.database ? '✅' : '❌'}`);
    console.log(`Queue: ${health.checks.queue ? '✅' : '❌'}`);
    console.log(`AI Service: ${health.checks.aiService ? '✅' : '❌'}`);
    console.log();
    
    // Example: Filter and search
    console.log('═'.repeat(60));
    console.log('🔍 Filter Examples');
    console.log('═'.repeat(60));
    
    const remoteSeniorJobs = scraperOrchestrator.filterJobs({
      isRemote: true,
      experienceLevel: 'senior'
    });
    console.log(`Remote Senior Jobs: ${remoteSeniorJobs.length}`);
    
    const reactJobs = scraperOrchestrator.filterJobs({
      skills: ['React', 'TypeScript']
    });
    console.log(`React/TypeScript Jobs: ${reactJobs.length}`);
    
    const searchResults = scraperOrchestrator.searchJobs('machine learning');
    console.log(`ML Search Results: ${searchResults.length}`);
    console.log();
    
    console.log('✨ Done!\n');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  }
}

// Run the example
main();
