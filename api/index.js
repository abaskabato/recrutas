// Vercel serverless function - Complete backend
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { registerRoutes } from '../server/routes.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS for Vercel
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register all backend routes
await registerRoutes(app);

// Serve static files from the build directory
const buildPath = path.join(__dirname, '..', 'dist');

// Serve static assets for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
  } else {
    express.static(buildPath, {
      maxAge: '1y',
      etag: false
    })(req, res, next);
  }
});

// Fallback to serve index.html for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
    return;
  }
  
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