import fetch from 'node-fetch';

async function testDynamicJobFetching() {
  console.log('Testing dynamic job fetching per user skills...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test 1: Frontend Developer Skills
  console.log('=== Test 1: Frontend Developer Skills ===');
  const frontendSkills = 'react,javascript,typescript,css';
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?skills=${frontendSkills}&limit=20`);
    const data = await response.json();
    console.log(`Frontend jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample frontend job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        skills: data.jobs[0].skills
      });
    }
  } catch (error) {
    console.error('Frontend test failed:', error.message);
  }
  
  console.log('\n=== Test 2: Backend Developer Skills ===');
  const backendSkills = 'python,node.js,sql,api';
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?skills=${backendSkills}&limit=20`);
    const data = await response.json();
    console.log(`Backend jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample backend job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        skills: data.jobs[0].skills
      });
    }
  } catch (error) {
    console.error('Backend test failed:', error.message);
  }
  
  console.log('\n=== Test 3: Data Science Skills ===');
  const dataSkills = 'python,machine learning,tensorflow,pandas';
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?skills=${dataSkills}&limit=20`);
    const data = await response.json();
    console.log(`Data science jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample data science job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        skills: data.jobs[0].skills
      });
    }
  } catch (error) {
    console.error('Data science test failed:', error.message);
  }
  
  console.log('\n=== Test 4: No Skills (General) ===');
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?limit=15`);
    const data = await response.json();
    console.log(`General jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample general job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        skills: data.jobs[0].skills
      });
    }
  } catch (error) {
    console.error('General test failed:', error.message);
  }
  
  console.log('\n=== Dynamic Job Fetching Test Complete ===');
}

// Run the test
testDynamicJobFetching().catch(console.error);