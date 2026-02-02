import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { client } from './server/db.js'; // To get the auth token

async function getAuthToken(email) {
  // This is a simplified version of what's in test-api.sh
  // In a real app, you'd have a more robust way to get a token
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    exec('npx tsx server/get-token.ts', (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      // The token is the last line of the output
      const lines = stdout.trim().split('\n');
      const token = lines[lines.length - 1];
      resolve(token);
    });
  });
}

async function testResumeUpload() {
  try {
    const email = 'abaskabato@gmail.com';
    const token = await getAuthToken(email);

    // Wait for the server to start (long delay to ensure readiness)


    const filePath = path.join(process.cwd(), 'test-resume.pdf');
    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('resume', fileStream);

    console.log('[TestResumeUpload] Uploading resume...');
    const response = await fetch('http://localhost:5000/api/candidate/resume', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const result = await response.json();
    console.log('[TestResumeUpload] Upload response:', result);

    // Wait for background processing
    console.log('[TestResumeUpload] Waiting 10 seconds for background processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify profile
    console.log('[TestResumeUpload] Verifying profile...');
    const profileResponse = await fetch('http://localhost:5000/api/candidate/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const profile = await profileResponse.json();
    console.log('[TestResumeUpload] User profile:', profile);

  } catch (error) {
    console.error('[TestResumeUpload] Error:', error);
  } finally {
    await client.end();
  }
}

testResumeUpload();
