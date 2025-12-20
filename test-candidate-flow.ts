import 'dotenv/config';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { supabase } from './server/lib/supabase-client';

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'abaskabato@gmail.com'; // User provided email
const PASSWORD = '123456'; // User provided password

async function main() {
  console.log('Starting Candidate Flow Test...');

  // 1. Sign-in User
  console.log(`Authenticating user: ${EMAIL}...`);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('Authentication failed:', authError);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log('Authenticated! Token obtained.');

  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  // 2. Set user info (name, role) via new API
  console.log('Setting user initial info (name, role)...');
  const userInfoRes = await fetch(`${API_URL}/auth/user-info`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Abaskabato',
      firstName: 'Abaskabato',
      lastName: 'Gemini',
      role: 'candidate',
    }),
  });

  if (!userInfoRes.ok) {
    console.error('Failed to set user info:', await userInfoRes.text());
  } else {
    console.log('User info set successfully.');
  }

  // 3. Upload Resume
  console.log('Uploading resume...');
  const form = new FormData();
  
  // Create a dummy PDF if it doesn't exist
  if (!fs.existsSync('test-resume.pdf')) {
      fs.writeFileSync('test-resume.pdf', '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000258 00000 n \n0000000346 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n440\n%%EOF');
  }
  
  form.append('resume', fs.createReadStream('test-resume.pdf'));
  
  const resumeRes = await fetch(`${API_URL}/candidate/resume`, {
    method: 'POST',
    headers: { ...headers, ...form.getHeaders() },
    body: form,
  });

  if (!resumeRes.ok) {
    console.error('Failed to upload resume:', await resumeRes.text());
  } else {
    console.log('Resume uploaded successfully:', await resumeRes.json());
  }

  // 4. Update Profile (Basic Info)
  console.log('Updating basic info...');
  const basicInfoRes = await fetch(`${API_URL}/candidate/profile`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Abaskabato',
      lastName: 'Gemini',
      summary: 'Senior Software Engineer'
    }),
  });

  if (!basicInfoRes.ok) {
    console.error('Failed to update basic info:', await basicInfoRes.text());
  } else {
    console.log('Basic info updated successfully:', await basicInfoRes.json());
  }

  // 5. Update Skills
  console.log('Updating skills...');
  const skillsRes = await fetch(`${API_URL}/candidate/profile`, {
    method: 'POST', // Correct method
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skills: ['React', 'Node.js', 'TypeScript']
    }),
  });

  if (!skillsRes.ok) {
    console.error('Failed to update skills:', await skillsRes.text());
  } else {
    console.log('Skills updated successfully:', await skillsRes.json());
  }
  
  console.log('Test completed.');
}

main().catch(console.error);
