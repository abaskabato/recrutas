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
  let serverProcess, frontendProcess;

  try {
    console.log('Starting server for tests...');
    serverProcess = spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', detached: true });
    console.log(`Server process started with PID: ${serverProcess.pid}`);

    console.log('Starting frontend server for tests...');
    frontendProcess = spawn('npm', ['run', 'dev'], { stdio: 'inherit', detached: true });
    console.log(`Frontend process started with PID: ${frontendProcess.pid}`);

    await waitForServer();
    await waitForFrontend();

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
      console.log(`\nShutting down server (PID: ${serverProcess.pid})...`);
      try {
        process.kill(-serverProcess.pid, 'SIGINT');
      } catch (e) {
        console.error('Failed to kill server process:', e);
      }
    }
    if (frontendProcess) {
      console.log(`Shutting down frontend server (PID: ${frontendProcess.pid})...`);
      try {
        process.kill(-frontendProcess.pid, 'SIGINT');
      } catch (e) {
        console.error('Failed to kill frontend process:', e);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`\n⏱️  Total test time: ${duration} seconds`);
    console.log('✅ All tests completed!');
    process.exit(0); // Exit successfully
  }
}

async function waitForFrontend() {
  console.log('Waiting for frontend server to start...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`http://localhost:5173`);
      if (response.ok) {
        console.log('Frontend server is ready!');
        return;
      }
    } catch (e) {
      // Ignore connection errors and retry
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Frontend server did not start in time');
}



// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTestSuites();
}
