// Test script to verify We Work Remotely integration
import { jobAggregator } from './server/job-aggregator';

async function testWeWorkRemotely() {
  console.log('🧪 Testing We Work Remotely Integration\n');
  
  try {
    // Test 1: Fetch all jobs
    console.log('Test 1: Fetching all We Work Remotely jobs...');
    const allJobs = await jobAggregator.fetchWeWorkRemotelyJobs();
    console.log(`✅ Fetched ${allJobs.length} jobs`);
    
    if (allJobs.length > 0) {
      const firstJob = allJobs[0];
      console.log('\nSample job:');
      console.log(`  Title: ${firstJob.title}`);
      console.log(`  Company: ${firstJob.company}`);
      console.log(`  Source: ${firstJob.source}`);
      console.log(`  URL: ${firstJob.externalUrl}`);
    }
    
    // Test 2: Fetch tech jobs
    console.log('\nTest 2: Fetching tech jobs (software-engineer)...');
    const techJobs = await jobAggregator.fetchWeWorkRemotelyJobs('software-engineer');
    console.log(`✅ Fetched ${techJobs.length} tech jobs`);
    
    // Test 3: Fetch non-tech jobs
    console.log('\nTest 3: Fetching non-tech jobs (sales-representative)...');
    const salesJobs = await jobAggregator.fetchWeWorkRemotelyJobs('sales-representative');
    console.log(`✅ Fetched ${salesJobs.length} sales jobs`);
    
    // Test 4: Full aggregation with professions
    console.log('\nTest 4: Full aggregation with profession detection...');
    const aggregatedJobs = await jobAggregator.getAllJobs([], undefined, 50);
    console.log(`✅ Aggregated ${aggregatedJobs.length} total jobs`);
    
    // Count by profession
    const professionCounts = aggregatedJobs.reduce((acc, job) => {
      acc[job.profession || 'unknown'] = (acc[job.profession || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nProfession breakdown:');
    Object.entries(professionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([prof, count]) => {
        console.log(`  ${prof}: ${count}`);
      });
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testWeWorkRemotely();
