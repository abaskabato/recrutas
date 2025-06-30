#!/usr/bin/env node

/**
 * Production Setup Script
 * Creates the proper dist/index.js file for deployment
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Setting up production build...');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy the production server to dist/index.js
const productionServerPath = 'server/index-production.js';
const targetPath = 'dist/index.js';

if (fs.existsSync(productionServerPath)) {
  fs.copyFileSync(productionServerPath, targetPath);
  console.log('✅ Created dist/index.js from production server');
} else {
  // Create a minimal server if the production server doesn't exist
  const minimalServer = `import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// Serve static files
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Recrutas - Loading...');
  }
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});`;
  
  fs.writeFileSync(targetPath, minimalServer);
  console.log('✅ Created minimal dist/index.js');
}

// Copy shared directory if it exists
if (fs.existsSync('shared')) {
  if (!fs.existsSync('dist/shared')) {
    fs.mkdirSync('dist/shared', { recursive: true });
  }
  fs.cpSync('shared', 'dist/shared', { recursive: true });
  console.log('✅ Copied shared directory to dist');
}

// Copy server files (excluding vite.ts)
if (fs.existsSync('server')) {
  if (!fs.existsSync('dist/server')) {
    fs.mkdirSync('dist/server', { recursive: true });
  }
  
  const serverFiles = fs.readdirSync('server');
  serverFiles.forEach(file => {
    if (file !== 'vite.ts' && file !== 'vite-production.ts') {
      const srcPath = path.join('server', file);
      const destPath = path.join('dist/server', file);
      
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
      } else if (fs.statSync(srcPath).isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      }
    }
  });
  console.log('✅ Copied server files to dist (excluding Vite dependencies)');
}

// Create production package.json
const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const productionPackage = {
  name: originalPackage.name,
  version: originalPackage.version,
  type: 'module',
  main: 'index.js',
  scripts: {
    start: 'node index.js'
  },
  dependencies: {
    // Only include runtime dependencies, exclude build tools
    ...Object.fromEntries(
      Object.entries(originalPackage.dependencies || {}).filter(([key]) => {
        const excludeDeps = [
          'vite', '@vitejs/plugin-react', 'esbuild', 'tailwindcss', 
          'autoprefixer', 'postcss', 'typescript', 'drizzle-kit'
        ];
        return !excludeDeps.includes(key);
      })
    )
  },
  engines: originalPackage.engines || {
    node: '>=18.0.0'
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
console.log('✅ Created production package.json');

console.log('🚀 Production build setup complete!');
console.log('📁 dist/index.js is ready for deployment');