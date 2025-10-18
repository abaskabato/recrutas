import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

import { supabaseAdmin } from './lib/supabase-admin.js';

export const app = express();

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
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

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

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
}