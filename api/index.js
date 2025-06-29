import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Serve static files from the Vite build directory
const buildPath = path.join(__dirname, '..', 'dist', 'public');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// Basic API route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'operational',
    timestamp: new Date().toISOString(),
    message: 'Recrutas API is running'
  });
});

// Fallback to serve index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found');
  }
});

export default app;