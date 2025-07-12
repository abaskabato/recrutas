#!/usr/bin/env node

/**
 * Custom Vercel build script
 * Only builds frontend - Vercel handles API functions automatically
 */

import { execSync } from 'child_process';

console.log('🚀 Starting Vercel frontend build...');

try {
  // Build only frontend with Vite
  console.log('📦 Building frontend...');
  execSync('vite build', { stdio: 'inherit' });
  console.log('✅ Frontend build completed');
  
  console.log('ℹ️ Serverless API functions will be handled automatically by Vercel');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}