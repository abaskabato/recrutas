#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Building frontend...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('Building backend...');
execSync('npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

// Create a simple start script
const startScript = `import('./production.js');`;
fs.writeFileSync('dist/index.js', startScript);

console.log('Build complete!');