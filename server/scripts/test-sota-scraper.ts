/**
 * SOTA Scraper Test Script
 * 
 * Run with: npx tsx server/scripts/test-sota-scraper.ts
 */

import { companyDiscoveryService } from '../services/company-discovery.service';
import { atsDetectionService } from '../services/ats-detection.service';
import { sotaScraperOrchestrator } from '../services/sota-orchestrator';

async function testCompanyDiscovery() {
  console.log('\n=== Testing Company Discovery ===');
  
  const companies = companyDiscoveryService.generateScrapableList();
  console.log(`Total companies discovered: ${companies.length}`);
  
  const stats = companyDiscoveryService.getStats();
  console.log('Stats by source:', stats);
  
  // Show first 10
  console.log('\nFirst 10 companies:');
  companies.slice(0, 10).forEach(c => {
    console.log(`  - ${c.name} (${c.atsType}): ${c.careerUrl}`);
  });
  
  return companies;
}

async function testAtsDetection() {
  console.log('\n=== Testing ATS Detection ===');
  
  const testUrls = [
    'https://stripe.com/jobs',
    'https://jobs.lever.co/airtable',
    'https://careers.salesforce.com/jobs',
    'https://example.com/careers', // Unknown
  ];
  
  for (const url of testUrls) {
    const result = await atsDetectionService.detectFromUrl(url);
    console.log(`\n${url}:`);
    console.log(`  Type: ${result.atsType}`);
    console.log(`  API Available: ${result.apiAvailable}`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  Strategy: ${atsDetectionService.getStrategy(result.atsType)}`);
  }
}

async function testGreenhouseApi() {
  console.log('\n=== Testing Greenhouse API ===');
  
  // Test with Stripe (known to work)
  try {
    const response = await fetch('https://boards.greenhouse.io/stripe/jobs?content=true');
    if (response.ok) {
      const data = await response.json() as any;
      console.log(`Stripe jobs found: ${data.jobs?.length || 0}`);
    } else {
      console.log(`Stripe API failed: ${response.status}`);
    }
  } catch (error) {
    console.log('Stripe API error:', error);
  }
  
  // Test with a smaller company
  try {
    const response = await fetch('https://boards.greenhouse.io/airbnb/jobs?content=true');
    if (response.ok) {
      const data = await response.json() as any;
      console.log(`Airbnb jobs found: ${data.jobs?.length || 0}`);
    } else {
      console.log(`Airbnb API failed: ${response.status}`);
    }
  } catch (error) {
    console.log('Airbnb API error:', error);
  }
}

async function testQueueSystem() {
  console.log('\n=== Testing Queue System ===');
  
  try {
    const { createQueue, getQueueStats, QUEUES } = await import('../services/scraper-queue.service');
    
    const queue = await createQueue('test');
    console.log('Queue created successfully');
    
    const stats = await getQueueStats('test');
    console.log('Queue stats:', stats);
    
    console.log('\nQueue system working!');
  } catch (error) {
    console.log('Queue test failed (Redis may not be running):', error);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          SOTA SCRAPER - TEST SUITE                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // Test 1: Company Discovery
    await testCompanyDiscovery();
    
    // Test 2: ATS Detection
    await testAtsDetection();
    
    // Test 3: Greenhouse API
    await testGreenhouseApi();
    
    // Test 4: Queue System (may fail if Redis not running)
    await testQueueSystem();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TESTS COMPLETE                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
