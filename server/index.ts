import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { registerChatRoutes } from "./chat-routes.js";

import { supabaseAdmin } from './lib/supabase-admin.js';
import cors from 'cors';
import { errorHandlerMiddleware, requestTracingMiddleware, captureException } from './error-monitoring.js';

const app = express();

// Function to initialize Supabase Storage
async function initializeSupabase() {
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      console.error('Error listing buckets:', error.message);
      return;
    }

    const resumeBucket = buckets.find(bucket => bucket.name === 'resumes');
    if (!resumeBucket) {
      console.log('"resumes" bucket not found. Creating it...');
      const { error: createError } = await supabaseAdmin.storage.createBucket('resumes', {
        public: true,
      });
      if (createError) {
        console.error('Error creating "resumes" bucket:', createError.message);
      } else {
        console.log('"resumes" bucket created successfully.');
      }
    } else {
      console.log('"resumes" bucket already exists.');
    }
  } catch (e) {
    console.error('Unexpected error during Supabase initialization:', e.message);
  }
}

async function initializeBackgroundServices() {
  console.log('[Services] Starting background services...');

  try {
    // Start company discovery pipeline
    const { companyDiscoveryPipeline } = await import('./company-discovery.js');
    companyDiscoveryPipeline.start();
    console.log('[Services] ✓ Company discovery pipeline started');

    // Start job liveness service (if exists)
    try {
      const { jobLivenessService } = await import('./job-liveness-service.js');
      jobLivenessService.start();
      console.log('[Services] ✓ Job liveness service started');
    } catch (e) {
      console.log('[Services] Job liveness service not found, skipping');
    }

    // Start job refresh service
    try {
      const { jobRefreshService } = await import('./services/job-refresh.service.js');
      jobRefreshService.start();
      console.log('[Services] ✓ Job refresh service started');
    } catch (e) {
      console.error('[Services] Job refresh service failed to start:', e);
    }

  } catch (error) {
    console.error('[Services] Error starting background services:', error);
    // Don't crash the server if background services fail
  }
}

export async function configureApp() {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request tracing middleware for performance monitoring (Sentry)
  app.use(requestTracingMiddleware());

  // Middleware for logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });

  await initializeSupabase();
  await registerRoutes(app);
  registerChatRoutes(app);

  // Only start background services if not in a test environment
  if (process.env.NODE_ENV !== 'test') {
    await initializeBackgroundServices();
  }

  app.use(errorHandlerMiddleware());

  return app;
}