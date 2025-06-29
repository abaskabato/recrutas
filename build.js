#!/usr/bin/env node

// Simple Vercel build script - frontend only
import { execSync } from 'child_process';

console.log('Building frontend with Vite...');

try {
  // Only build the frontend - no server bundling
  execSync('vite build', { stdio: 'inherit' });
  console.log('Frontend build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}