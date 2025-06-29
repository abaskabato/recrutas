// Vercel serverless function entry point
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export default app;