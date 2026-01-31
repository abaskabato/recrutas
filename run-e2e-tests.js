import dotenv from 'dotenv';
dotenv.config();

import { spawn } from 'child_process';

const PORT = 5001;

// Function to wait for the server to be ready
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/health`);
      if (response.ok) {
        console.log('✅ Backend server is ready');
        return true;
      }
    } catch (e) {
      // Ignore connection errors and retry
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`❌ Backend server did not start on port ${PORT} within 30 seconds. Make sure to start it with: npm run dev:server`);
}

async function runE2ETests() {
  let serverProcess;

  try {
    console.log('🚀 Starting backend server for E2E tests...');
    serverProcess = spawn('npm', ['run', 'dev:server:start'], {
      stdio: 'inherit',
      detached: true
    });

    console.log('⏳ Waiting for server to be ready...');
    await waitForServer();

    console.log('🧪 Running E2E tests...\n');

    // Run Jest for E2E tests
    const jestProcess = spawn('node', [
      '--experimental-vm-modules',
      'node_modules/jest/bin/jest',
      '--testMatch=**/test/e2e-*.test.js',
      '--forceExit',
      '--detectOpenHandles'
    ], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for Jest to complete
    await new Promise((resolve, reject) => {
      jestProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Jest exited with code ${code}`));
        }
      });
    });

  } catch (error) {
    console.error('\n❌ Error running E2E tests:', error.message);
    process.exit(1);
  } finally {
    if (serverProcess) {
      try {
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch (e) {}
    }
  }
}

runE2ETests().catch(err => {
  console.error(err);
  process.exit(1);
});
