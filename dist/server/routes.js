const express = require('express');

function registerRoutes(app) {
  console.log('🔧 Registering production routes...');
  
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Recrutas API is running successfully',
      version: '1.0.0'
    });
  });
  
  app.get('/api/session', (req, res) => {
    res.json({ user: null, authenticated: false });
  });
  
  app.get('/api/platform/stats', (req, res) => {
    res.json({
      totalUsers: 3,
      totalJobs: 8,
      totalMatches: 25,
      message: 'Platform is operational'
    });
  });
  
  app.get('/api/jobs', (req, res) => {
    res.json([
      {
        id: 1,
        title: 'Full-Stack Developer',
        company: 'TechCorp',
        location: 'Remote',
        salary: '$80,000 - $120,000',
        skills: ['React', 'Node.js', 'TypeScript'],
        description: 'Join our team building cutting-edge web applications'
      }
    ]);
  });
  
  app.get('/api/external-jobs', (req, res) => {
    res.json({
      success: true,
      jobs: [
        {
          id: 'ext_1',
          title: 'Software Engineer',
          company: 'Google',
          location: 'Mountain View, CA',
          skills: ['JavaScript', 'Python', 'Go']
        }
      ]
    });
  });
  
  app.get('/api/notifications', (req, res) => res.json([]));
  app.get('/api/logout', (req, res) => res.json({ success: true, message: 'Logged out successfully' }));
  app.post('/api/auth/sign-in/email', (req, res) => res.json({ success: false, message: 'Auth not configured' }));
  app.post('/api/auth/sign-in/social', (req, res) => res.status(404).json({ message: 'Social auth not configured' }));
  app.use('/api/*', (req, res) => res.status(404).json({ message: 'API endpoint not found' }));
  
  console.log('✅ Production routes registered successfully');
  return null;
}

module.exports = { registerRoutes };
