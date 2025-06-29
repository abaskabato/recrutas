// Vercel API handler - proxies to full backend when available
const express = require('express');

const app = express();
app.use(express.json());

// Mock data for demonstration
const mockJobs = [
  {
    id: 1,
    title: 'Senior Software Engineer',
    company: 'TechCorp',
    location: 'Remote',
    salary: '$120k - $160k',
    type: 'Full-time',
    skills: ['React', 'Node.js', 'TypeScript'],
    description: 'Join our innovative team building the future of AI-powered recruitment.',
    requirements: ['5+ years experience', 'React expertise', 'Strong problem-solving skills'],
    posted: '2024-01-15',
    matchScore: 92
  },
  {
    id: 2,
    title: 'Product Manager',
    company: 'InnovateLabs',
    location: 'San Francisco, CA',
    salary: '$140k - $180k',
    type: 'Full-time',
    skills: ['Product Strategy', 'Analytics', 'User Research'],
    description: 'Lead product development for revolutionary recruitment platform.',
    requirements: ['3+ years PM experience', 'B2B SaaS background', 'Data-driven mindset'],
    posted: '2024-01-14',
    matchScore: 87
  }
];

const mockCandidates = [
  {
    id: 'candidate-1',
    name: 'Alex Chen',
    email: 'alex@example.com',
    skills: ['React', 'Node.js', 'Python', 'TypeScript'],
    experience: 'Senior',
    location: 'Remote',
    summary: 'Experienced full-stack developer with expertise in modern web technologies'
  }
];

// Platform stats
app.get('/api/platform/stats', (req, res) => {
  res.json({
    totalUsers: 2847,
    totalJobs: 18456,
    totalMatches: 34792,
    successfulPlacements: 1283,
    averageMatchScore: 84.2
  });
});

// Jobs endpoints
app.get('/api/jobs', (req, res) => {
  res.json({
    jobs: mockJobs,
    total: mockJobs.length,
    page: 1,
    limit: 10
  });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = mockJobs.find(j => j.id == req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Session/auth endpoints
app.get('/api/session', (req, res) => {
  res.status(401).json({ message: 'Not authenticated' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ 
    message: 'Demo mode - authentication would work in full deployment',
    user: mockCandidates[0]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    environment: 'vercel',
    timestamp: new Date().toISOString(),
    platform: 'Recrutas Demo'
  });
});

// Candidates endpoint
app.get('/api/candidates', (req, res) => {
  res.json({
    candidates: mockCandidates,
    total: mockCandidates.length
  });
});

// Job matching endpoint
app.post('/api/jobs/match', (req, res) => {
  res.json({
    matches: mockJobs.map(job => ({
      ...job,
      matchScore: Math.floor(Math.random() * 30) + 70,
      reasons: ['Strong technical skills alignment', 'Experience level match', 'Location preference']
    }))
  });
});

// Exam endpoints
app.get('/api/jobs/:id/exam', (req, res) => {
  res.json({
    id: `exam-${req.params.id}`,
    jobId: req.params.id,
    questions: [
      {
        id: 1,
        type: 'multiple-choice',
        question: 'What is the primary benefit of React hooks?',
        options: ['Better performance', 'State management in functional components', 'Smaller bundle size', 'All of the above'],
        correct: 1
      }
    ],
    timeLimit: 30,
    passingScore: 70
  });
});

// Application endpoints
app.post('/api/applications', (req, res) => {
  res.json({
    id: 'app-' + Date.now(),
    jobId: req.body.jobId,
    candidateId: req.body.candidateId,
    status: 'submitted',
    submittedAt: new Date().toISOString()
  });
});

// Catch-all
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: 'This is a demo deployment showcasing core functionality'
  });
});

module.exports = app;