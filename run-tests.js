/**
 * Test Runner - Runs all authentication tests
 */

import { runAPITests } from './test-auth-api.js';
import { runAllTests } from './test-auth-e2e.js';

async function runAllTestSuites() {
  console.log('🧪 RECRUTAS AUTHENTICATION TEST SUITE');
  console.log('=====================================\n');
  
  const startTime = Date.now();
  
  try {
    console.log('🔧 Phase 1: API Tests');
    console.log('---------------------');
    await runAPITests();
    
    console.log('\n🌐 Phase 2: End-to-End Tests');
    console.log('-----------------------------');
    await runAllTests();

    
    
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  } finally {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`\n⏱️  Total test time: ${duration} seconds`);
    console.log('✅ All tests completed!');
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTestSuites();
}