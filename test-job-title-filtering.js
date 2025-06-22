async function testJobTitleFiltering() {
  console.log('Testing job title filtering functionality...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test 1: Software Engineer title filter
  console.log('=== Test 1: Software Engineer Filter ===');
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?jobTitle=Software%20Engineer&limit=5`);
    const data = await response.json();
    console.log(`Software Engineer jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample filtered job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        match: data.jobs[0].match
      });
    }
  } catch (error) {
    console.error('Software Engineer test failed:', error.message);
  }
  
  console.log('\n=== Test 2: Data Scientist Filter ===');
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?jobTitle=Data%20Scientist&skills=python,machine%20learning&limit=5`);
    const data = await response.json();
    console.log(`Data Scientist jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample data science job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        skills: data.jobs[0].skills
      });
    }
  } catch (error) {
    console.error('Data Scientist test failed:', error.message);
  }
  
  console.log('\n=== Test 3: Product Manager Filter ===');
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?jobTitle=Product%20Manager&location=California&limit=5`);
    const data = await response.json();
    console.log(`Product Manager jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample PM job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        location: data.jobs[0].location
      });
    }
  } catch (error) {
    console.error('Product Manager test failed:', error.message);
  }
  
  console.log('\n=== Test 4: Combined Filters ===');
  try {
    const response = await fetch(`${baseUrl}/api/external-jobs?jobTitle=Engineer&skills=react,javascript&workType=remote&limit=3`);
    const data = await response.json();
    console.log(`Combined filter jobs found: ${data.jobs?.length || 0}`);
    if (data.jobs?.length > 0) {
      console.log('Sample combined filter job:', {
        title: data.jobs[0].title,
        company: data.jobs[0].company,
        type: data.jobs[0].type,
        skills: data.jobs[0].skills
      });
    }
  } catch (error) {
    console.error('Combined filters test failed:', error.message);
  }
  
  console.log('\n=== Job Title Filtering Test Complete ===');
}

testJobTitleFiltering().catch(console.error);