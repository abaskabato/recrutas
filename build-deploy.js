#!/usr/bin/env node

/**
 * Simplified Production Deployment Script
 * Works around TypeScript compilation issues by using runtime approach
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building Recrutas for deployment...');

// Clean previous builds
console.log('📦 Cleaning previous builds...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Create dist directory structure
fs.mkdirSync('dist', { recursive: true });

// Build only the React frontend (this works fine)
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

// Copy server files as-is (avoiding TypeScript compilation issues)
console.log('📂 Copying server files...');
fs.cpSync('server', 'dist/server', { 
  recursive: true,
  filter: (src, dest) => {
    // Skip backup files and test files
    const filename = path.basename(src);
    return !filename.includes('backup') && 
           !filename.includes('test') && 
           !filename.startsWith('.');
  }
});

// Copy shared directory
if (fs.existsSync('shared')) {
  console.log('📁 Copying shared directory...');
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Create production package.json
console.log('📋 Creating production package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: "module",
  main: 'server/index.ts',
  scripts: {
    start: 'NODE_ENV=production tsx server/index.ts'
  },
  dependencies: {
    // Include only essential runtime dependencies
    ...Object.fromEntries(
      Object.entries(packageJson.dependencies || {}).filter(([key]) => {
        const excludeDeps = [
          '@replit/vite-plugin-cartographer',
          '@replit/vite-plugin-runtime-error-modal',
          '@vitejs/plugin-react',
          'tailwindcss',
          'autoprefixer',
          'postcss'
        ];
        return !excludeDeps.includes(key);
      })
    ),
    // Ensure tsx is available for runtime TypeScript execution
    'tsx': packageJson.devDependencies?.tsx || '^4.19.1'
  },
  engines: packageJson.engines
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

// Copy essential config files
const configFiles = [
  'drizzle.config.ts',
  'tsconfig.json'
];

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `dist/${file}`);
  }
});

console.log('✅ Deployment build completed!');
console.log('📁 Output directory: ./dist');
console.log('🎯 Ready for deployment');

// Verify build integrity
const requiredFiles = [
  'dist/public/index.html',
  'dist/server/index.ts',
  'dist/package.json'
];

console.log('🔍 Verifying build...');
const missing = requiredFiles.filter(file => !fs.existsSync(file));
if (missing.length > 0) {
  console.error('❌ Build verification failed. Missing files:');
  missing.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

console.log('✅ Build verification passed');
console.log('');
console.log('🚀 Deployment instructions:');
console.log('1. Set NODE_ENV=production in deployment environment');
console.log('2. Run: npm install --production');
console.log('3. Start: npm start');
console.log('');
console.log('💡 This build uses tsx runtime execution to avoid TypeScript compilation issues');