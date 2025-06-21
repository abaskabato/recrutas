// Quick test to see what hiring.cafe returns
const fetch = require('node-fetch');

async function testHiringCafe() {
  try {
    console.log('Testing hiring.cafe scraping...');
    const response = await fetch('https://hiring.cafe/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const html = await response.text();
      console.log('HTML length:', html.length);
      
      // Look for job-related content
      const jobMatches = html.match(/job|position|role|career/gi);
      console.log('Job-related keywords found:', jobMatches ? jobMatches.length : 0);
      
      // Look for JSON data
      const jsonMatches = html.match(/"jobs":|"positions":|"listings":/g);
      console.log('JSON job data found:', jsonMatches ? jsonMatches.length : 0);
      
      // Look for structured data
      const structuredData = html.match(/<script type="application\/ld\+json">/g);
      console.log('Structured data scripts found:', structuredData ? structuredData.length : 0);
      
      // Sample content
      console.log('\nFirst 1000 characters:');
      console.log(html.substring(0, 1000));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHiringCafe();