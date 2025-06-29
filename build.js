#!/usr/bin/env node

// Vercel build script
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting Vercel build process...');

try {
  // Build only the frontend for Vercel (no server bundling needed)
  console.log('Building frontend with Vite...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Copy dist/public to server/public
  const distPath = path.join(process.cwd(), 'dist', 'public');
  const serverPublicPath = path.join(process.cwd(), 'server', 'public');
  
  if (fs.existsSync(distPath)) {
    console.log('Copying build files to server/public...');
    
    // Remove existing server/public if it exists
    if (fs.existsSync(serverPublicPath)) {
      fs.rmSync(serverPublicPath, { recursive: true, force: true });
    }
    
    // Create server directory if it doesn't exist
    const serverDir = path.join(process.cwd(), 'server');
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }
    
    // Copy the entire dist/public directory
    fs.cpSync(distPath, serverPublicPath, { recursive: true });
    console.log('Build files copied successfully!');
  } else {
    console.error('Frontend build failed - dist/public not found');
    process.exit(1);
  }
  
  console.log('Vercel build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}