#!/usr/bin/env node

/**
 * Production Build Script for Recrutas
 * Addresses Vite import issues in deployment by using TypeScript compilation
 * instead of esbuild bundling with problematic Vite dependencies
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building Recrutas for production deployment...');

// Clean previous builds
console.log('📦 Cleaning previous builds...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Create dist directory structure
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/server', { recursive: true });

// Build client (React app with Vite)
console.log('⚛️  Building React frontend...');
try {
  execSync('vite build', { 
    stdio: 'inherit', 
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Build server using TypeScript compilation (avoids esbuild Vite import issues)
console.log('🔧 Building Express server with TypeScript...');
try {
  execSync('tsc -p server/tsconfig.json', { 
    stdio: 'inherit', 
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('❌ Server TypeScript compilation failed');
  process.exit(1);
}

// Create production package.json (excludes Vite and dev dependencies)
console.log('📋 Creating production package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: "module",
  main: 'server/index.js',
  scripts: {
    start: 'NODE_ENV=production node server/index.js'
  },
  dependencies: Object.fromEntries(
    Object.entries(packageJson.dependencies || {}).filter(([key]) => {
      // Exclude all development and build-time dependencies
      const excludeDeps = [
        'vite',
        '@vitejs/plugin-react',
        '@replit/vite-plugin-cartographer',
        '@replit/vite-plugin-runtime-error-modal',
        'esbuild',
        'tsx',
        'typescript',
        'tailwindcss',
        'autoprefixer',
        'postcss'
      ];
      return !excludeDeps.includes(key);
    })
  ),
  engines: packageJson.engines
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

// Copy shared directory if exists
if (fs.existsSync('shared')) {
  console.log('📁 Copying shared directory...');
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Copy other necessary files
console.log('📋 Copying production files...');

// Copy drizzle config if exists
if (fs.existsSync('drizzle.config.ts')) {
  fs.copyFileSync('drizzle.config.ts', 'dist/drizzle.config.ts');
}

console.log('✅ Production build completed successfully!');
console.log('📁 Output directory: ./dist');
console.log('🚀 Ready for deployment');

// Verify build integrity
const requiredFiles = [
  'dist/public/index.html',
  'dist/server/index.js',
  'dist/package.json'
];

console.log('🔍 Verifying build integrity...');
const missing = requiredFiles.filter(file => !fs.existsSync(file));
if (missing.length > 0) {
  console.error('❌ Build verification failed. Missing files:');
  missing.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

console.log('✅ Build verification passed');
console.log('🎯 Production build ready for deployment');
console.log('');
console.log('Next steps:');
console.log('1. Set NODE_ENV=production in deployment environment');
console.log('2. Install production dependencies: npm install --production');
console.log('3. Start application: npm start');