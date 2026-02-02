import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

async function waitForServer(timeout = 60000, interval = 2000) {
  const url = `${SERVER_URL}/api/health`;
  const startTime = Date.now();

  console.log(`[TestResumeUpload] Waiting for server at ${url}...`);

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('[TestResumeUpload] Server is ready!');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Server did not become ready within ${timeout / 1000} seconds.`);
}

async function getAuthToken() {
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    exec('npx tsx server/get-token.ts', (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Failed to get auth token: ${error.message}`));
      }
      // The token is the last non-empty line of the output
      const lines = stdout.trim().split('\n').filter(l => l.trim());
      const token = lines[lines.length - 1];
      if (!token || token.length < 10) {
        return reject(new Error('Invalid auth token received'));
      }
      resolve(token);
    });
  });
}

async function testResumeUpload() {
  try {
    // Wait for server to be ready
    await waitForServer();

    // Get auth token
    console.log('[TestResumeUpload] Getting auth token...');
    const token = await getAuthToken();
    console.log('[TestResumeUpload] Got auth token');

    // Find a test resume file
    const possibleFiles = ['test-resume.pdf', 'test-resume-simple.txt', 'test-resume.txt'];
    let filePath = null;
    for (const file of possibleFiles) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        filePath = fullPath;
        break;
      }
    }

    if (!filePath) {
      throw new Error('No test resume file found. Create test-resume.pdf or test-resume-simple.txt');
    }

    console.log(`[TestResumeUpload] Using resume file: ${filePath}`);
    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('resume', fileStream);

    console.log('[TestResumeUpload] Uploading resume...');
    const response = await fetch(`${SERVER_URL}/api/candidate/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const result = await response.json();
    console.log('[TestResumeUpload] Upload response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}: ${result.message || 'Unknown error'}`);
    }

    // Wait for background processing
    console.log('[TestResumeUpload] Waiting 10 seconds for background processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify profile
    console.log('[TestResumeUpload] Verifying profile...');
    const profileResponse = await fetch(`${SERVER_URL}/api/candidate/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const profile = await profileResponse.json();

    console.log('[TestResumeUpload] Profile resume status:', profile.resumeProcessingStatus);
    console.log('[TestResumeUpload] Profile skills:', profile.skills);
    console.log('[TestResumeUpload] Test completed successfully!');

  } catch (error) {
    console.error('[TestResumeUpload] Error:', error.message);
    process.exit(1);
  }
}

testResumeUpload();
