import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";

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
  console.log('configureApp: app instance (before routes)', app); // Log 1
  await registerRoutes(app);
  console.log('configureApp: app instance (after routes)', app); // Log 2

  console.log('Registered routes stack:');
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) { // Routes registered directly on the app
      console.log(middleware.route.path, middleware.route.methods);
    } else if (middleware.name === 'router') { // Routers mounted as middleware
      console.log('  Router mounted at:', middleware.regexp);
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          console.log('    ', handler.route.path, handler.route.methods);
        }
      });
    }
  });

  // Error handling middleware with Sentry integration
  app.use(errorHandlerMiddleware());

  return app;
}