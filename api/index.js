// Vercel serverless function entry point
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve static files from the build directory
const buildPath = path.join(__dirname, '..', 'dist');

// Serve static assets
app.use(express.static(buildPath, {
  maxAge: '1y',
  etag: false
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to serve index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend build not found',
      buildPath,
      files: fs.existsSync(path.dirname(buildPath)) ? fs.readdirSync(path.dirname(buildPath)) : []
    });
  }
});

export default app;