// Test AI matching algorithm with real candidate profile
const testCandidate = {
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  experience: 'Senior Software Engineer with 5 years experience building scalable web applications',
  location: 'San Francisco, CA',
  workType: 'remote',
  salaryMin: 120000,
  salaryMax: 180000
};

const testJob = {
  title: 'Senior Full Stack Engineer',
  company: 'Vercel',
  skills: ['React', 'Next.js', 'TypeScript', 'Node.js'],
  requirements: ['React', 'TypeScript', 'Full Stack Development'],
  location: 'San Francisco, CA',
  workType: 'remote',
  salaryMin: 150000,
  salaryMax: 200000,
  description: 'Build the future of web development with Next.js'
};

// Test the AI service directly
import('./server/ai-service.js').then(async (aiService) => {
  console.log('Testing AI matching algorithm...');
  const match = await aiService.generateJobMatch(testCandidate, testJob);
  console.log('Match Result:', {
    confidenceLevel: match.confidenceLevel,
    score: match.score,
    skillMatches: match.skillMatches,
    explanation: match.aiExplanation
  });
}).catch(console.error);