// Vercel serverless function entry point
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();

// Serve static files from the build directory
const buildPath = path.join(__dirname, '..', 'dist', 'public');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// Fallback to serve index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found');
  }
});

module.exports = app;