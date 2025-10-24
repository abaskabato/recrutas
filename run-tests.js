import dotenv from 'dotenv';
dotenv.config();

import { spawn } from 'child_process';
import { runAPITests } from './test-auth-api.js';
import { runAllTests } from './test-auth-e2e.js';

const PORT = 5000;

// Function to wait for the server to be ready
async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/health`);
      if (response.ok) {
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
  let serverProcess, frontendProcess;

  try {
    serverProcess = spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', detached: true });

    console.log('Starting frontend server for tests...');
    frontendProcess = spawn('npm', ['run', 'dev'], { stdio: 'inherit', detached: true });

    await waitForServer();
    await waitForFrontend();

    await runAPITests();

    await runAllTests();

                    const jobFeedProcess = spawn('./node_modules/.bin/tsx', ['./test/job-feed.test.js'], { stdio: 'pipe', encoding: 'utf-8', shell: true });
                    jobFeedProcess.stdout.on('data', (data) => {
                        console.log(`[Job Feed Test]: ${data}`);
                    });
            
                    jobFeedProcess.stderr.on('data', (data) => {
                        console.error(`[Job Feed Test]: ${data}`);
                    });
            
                    await new Promise((resolve) => {
                        jobFeedProcess.on('close', (code) => {
                            if (code !== 0) {
                                throw new Error('Job feed test failed');
                            }
                            resolve();
                        });
                    });  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    if (serverProcess) {
      try {
        process.kill(-serverProcess.pid, 'SIGINT');
      } catch (e) {}
    }
    if (frontendProcess) {
      try {
        process.kill(-frontendProcess.pid, 'SIGINT');
      } catch (e) {}
    }

    process.exit(0); // Exit successfully
  }
}

async function waitForFrontend() {
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`http://localhost:5173`);
      if (response.ok) {
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