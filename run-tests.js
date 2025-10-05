import dotenv from 'dotenv';
dotenv.config();

import { spawn } from 'child_process';
import { runAPITests } from './test-auth-api.js';
import { runAllTests } from './test-auth-e2e.js';

const PORT = 5000;

// Function to wait for the server to be ready
async function waitForServer() {
  console.log('Waiting for server to start...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/health`);
      if (response.ok) {
        console.log('Server is ready!');
        return;
      }
    } catch (e) {
      // Ignore connection errors and retry
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Server did not start in time');
}

async function runAllTestSuites() {
  console.log('🧪 RECRUTAS AUTHENTICATION TEST SUITE');
  console.log('=====================================');

  const startTime = Date.now();
  let serverProcess;

  try {
    console.log('Starting server for tests...');
    serverProcess = spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', detached: true });

    await waitForServer();

    console.log('\n🔧 Phase 1: API Tests');
    console.log('---------------------');
    await runAPITests();

    console.log('\n🌐 Phase 2: End-to-End Tests');
    console.log('-----------------------------');
    await runAllTests();

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    if (serverProcess) {
      console.log('\nShutting down server...');
      // Kill the entire process group
      process.kill(-serverProcess.pid);
    }
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`\n⏱️  Total test time: ${duration} seconds`);
    console.log('✅ All tests completed!');
    process.exit(0); // Exit successfully
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTestSuites();
}
