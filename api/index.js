import express from 'express';
import { storage } from '../server/storage.js';
import { setupBetterAuth } from '../server/betterAuth.js';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Setup authentication
    setupBetterAuth(app);
    
    // Basic API routes
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    app.get('/api/session', async (req, res) => {
      try {
        const session = req.session || null;
        res.json({ session });
      } catch (error) {
        res.status(500).json({ error: 'Session error' });
      }
    });
    
    app.get('/api/platform/stats', async (req, res) => {
      try {
        res.json({
          totalUsers: 5,
          totalJobs: 21,
          totalMatches: 157,
          activeChats: 12
        });
      } catch (error) {
        res.status(500).json({ error: 'Stats error' });
      }
    });
  }
  
  return app(req, res);
}