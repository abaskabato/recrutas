#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Recrutas for production...');

// Clean previous builds
console.log('📦 Cleaning previous builds...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Build client (React app)
console.log('⚛️  Building React frontend...');
try {
  execSync('vite build', { stdio: 'inherit', cwd: process.cwd() });
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Build server (TypeScript compilation with proper environment)
console.log('🔧 Building Express server...');
try {
  // Set NODE_ENV to production to ensure proper build
  process.env.NODE_ENV = 'production';
  execSync('tsc -p server/tsconfig.json', { 
    stdio: 'inherit', 
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('❌ Server build failed');
  process.exit(1);
}

// Copy package.json to dist
console.log('📋 Copying production files...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create production package.json with only necessary dependencies
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: 'server/index.js',
  scripts: {
    start: 'node server/index.js'
  },
  dependencies: Object.fromEntries(
    Object.entries(packageJson.dependencies || {}).filter(([key]) => {
      // Exclude development-only dependencies that shouldn't be in production
      const devOnlyDeps = [
        '@replit/vite-plugin-cartographer',
        '@replit/vite-plugin-runtime-error-modal',
        '@vitejs/plugin-react',
        'vite'  // Exclude vite from production dependencies
      ];
      return !devOnlyDeps.includes(key);
    })
  ),
  engines: packageJson.engines
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

// Copy shared directory
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

console.log('✅ Build completed successfully!');
console.log('📁 Output directory: ./dist');
console.log('🎯 Ready for deployment');

// Verify build
const requiredFiles = [
  'dist/public/index.html',
  'dist/server/index.js',
  'dist/package.json'
];

const missing = requiredFiles.filter(file => !fs.existsSync(file));
if (missing.length > 0) {
  console.error('❌ Build verification failed. Missing files:');
  missing.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

console.log('✅ Build verification passed');