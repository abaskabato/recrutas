import express from 'express';
import { registerRoutes } from '../server/routes.js';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Register all API routes
    await registerRoutes(app);
  }
  
  return app(req, res);
}