// Vercel serverless function for API routes
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: 'vercel'
  });
});

// Basic API routes for demo
app.get('/api/platform/stats', (req, res) => {
  res.json({
    totalUsers: 100,
    totalJobs: 500,
    totalMatches: 1250,
    message: 'Recrutas - Built on AI. Backed by transparency. Focused on you.'
  });
});

app.get('/api/jobs', (req, res) => {
  res.json({
    jobs: [
      {
        id: 1,
        title: 'Senior Software Engineer',
        company: 'Tech Innovators Inc.',
        location: 'Remote',
        salary: '$120k - $160k',
        type: 'Full-time',
        description: 'Join our team building the future of AI-powered recruitment.'
      }
    ],
    total: 1
  });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    message: 'This is a demo deployment. Full API available in development.'
  });
});

module.exports = app;