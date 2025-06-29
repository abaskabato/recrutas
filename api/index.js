// Vercel serverless function entry point for API routes
const { createServer } = require('http');

// Import the built server
let serverHandler;

try {
  // Try to import the compiled server
  const serverModule = require('../dist/server/index.js');
  serverHandler = serverModule.default || serverModule;
} catch (error) {
  console.error('Failed to load server:', error);
  
  // Fallback handler
  const express = require('express');
  const app = express();
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'Server not available', error: error.message });
  });
  
  app.use('*', (req, res) => {
    res.status(500).json({ error: 'Server compilation failed' });
  });
  
  serverHandler = app;
}

module.exports = serverHandler;