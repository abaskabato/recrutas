#!/usr/bin/env node

/**
 * Create Production Build - Fix TypeScript to JavaScript Conversion
 * Addresses the "Cannot find module" error by properly converting TypeScript to JavaScript
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function log(message) {
  console.log(`🔧 ${message}`);
}

function createProductionBuild() {
  log('Creating production build with proper JavaScript conversion');
  
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });
  
  // Copy and convert TypeScript files to JavaScript
  log('Converting TypeScript files to JavaScript');
  
  const serverFiles = [
    'routes.ts',
    'storage.ts',
    'db.ts',
    'betterAuth.ts',
    'ai-service.ts',
    'notifications.ts',
    'notification-service.ts',
    'job-aggregator.ts',
    'company-jobs-aggregator.ts',
    'universal-job-scraper.ts',
    'resume-parser.ts',
    'advanced-matching-engine.ts',
    'application-intelligence.ts'
  ];
  
  serverFiles.forEach(file => {
    const tsPath = `server/${file}`;
    const jsPath = `dist/${file.replace('.ts', '.js')}`;
    
    if (fs.existsSync(tsPath)) {
      let content = fs.readFileSync(tsPath, 'utf8');
      
      // Convert TypeScript to JavaScript
      content = convertTsToJs(content);
      
      fs.writeFileSync(jsPath, content);
      log(`Converted ${file} to JavaScript`);
    }
  });
  
  // Copy shared directory
  if (fs.existsSync('shared')) {
    copyDirectory('shared', 'dist/shared');
  }
  
  // Create production entry point
  log('Creating production entry point');
  
  const productionIndex = `
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Production logging
function log(message) {
  console.log(\`[\${new Date().toISOString()}] \${message}\`);
}

log('Starting Recrutas production server...');

// Register routes
registerRoutes(app).then((server) => {
  // Serve static files
  const staticPath = path.join(__dirname, 'public');
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
  }
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.json({ 
      message: 'Recrutas API Server', 
      status: 'running',
      timestamp: new Date().toISOString()
    });
  });
  
  const PORT = process.env.PORT || 5000;
  const HOST = '0.0.0.0';
  
  server.listen(PORT, HOST, () => {
    log(\`Server running on \${HOST}:\${PORT}\`);
  });
  
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
`;
  
  fs.writeFileSync('dist/index.js', productionIndex);
  
  // Create production package.json
  const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const productionPackage = {
    name: originalPackage.name,
    version: originalPackage.version,
    type: "module",
    main: 'index.js',
    scripts: {
      start: 'NODE_ENV=production node index.js'
    },
    dependencies: {
      "express": originalPackage.dependencies.express,
      "drizzle-orm": originalPackage.dependencies["drizzle-orm"],
      "@neondatabase/serverless": originalPackage.dependencies["@neondatabase/serverless"],
      "better-auth": originalPackage.dependencies["better-auth"],
      "ws": originalPackage.dependencies.ws,
      "zod": originalPackage.dependencies.zod,
      "bcryptjs": originalPackage.dependencies.bcryptjs,
      "multer": originalPackage.dependencies.multer,
      "openai": originalPackage.dependencies.openai,
      "nanoid": originalPackage.dependencies.nanoid,
      "memoizee": originalPackage.dependencies.memoizee,
      "date-fns": originalPackage.dependencies["date-fns"],
      "pdf-parse": originalPackage.dependencies["pdf-parse"],
      "mammoth": originalPackage.dependencies.mammoth,
      "puppeteer": originalPackage.dependencies.puppeteer,
      "jsdom": originalPackage.dependencies.jsdom
    }
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
  
  log('Production build completed successfully');
  log('Files created:');
  fs.readdirSync('dist').forEach(file => {
    console.log(`  ✓ ${file}`);
  });
}

function convertTsToJs(content) {
  // Remove all TypeScript syntax
  
  // Remove import type lines completely
  content = content.replace(/import\s+type\s*{[^}]*}\s*from\s*['"'][^'"]*['"];?\n?/g, '');
  
  // Remove type imports from regular imports
  content = content.replace(/import\s*{\s*([^}]*?),?\s*type\s+[^,}]*\s*([^}]*?)}\s*from/g, 'import { $1 $2 } from');
  content = content.replace(/import\s*{\s*type\s+[^,}]*,?\s*([^}]*?)}\s*from/g, 'import { $1 } from');
  
  // Remove function parameter types
  content = content.replace(/\(\s*([^:)]+):\s*[^,)]+\s*,?\s*/g, '($1, ');
  content = content.replace(/\(\s*([^:)]+):\s*[^)]+\s*\)/g, '($1)');
  
  // Remove return type annotations
  content = content.replace(/\):\s*[^{=;>]+(\s*[{=;>])/g, ')$1');
  
  // Remove variable type annotations
  content = content.replace(/:\s*[A-Za-z<>[\]|&\s,{}()_.]+(?=\s*[=;,)])/g, '');
  
  // Remove generic type parameters
  content = content.replace(/<[A-Za-z<>[\]|&\s,{}()_.]+>/g, '');
  
  // Remove interface declarations
  content = content.replace(/export\s+interface\s+\w+\s*{[^}]*}/gs, '');
  content = content.replace(/interface\s+\w+\s*{[^}]*}/gs, '');
  
  // Remove type aliases
  content = content.replace(/export\s+type\s+\w+\s*=\s*[^;]+;/g, '');
  content = content.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
  
  // Remove as type assertions  
  content = content.replace(/\s+as\s+[A-Za-z<>[\]|&\s,{}()_.]+/g, '');
  
  // Clean up double commas and trailing commas
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/,\s*}/g, '}');
  content = content.replace(/,\s*\)/g, ')');
  
  // Fix import paths to use .js extension
  content = content.replace(/from\s+['"]\.\/([^'"]+)(?<!\.js)['"];?/g, "from './$1.js';");
  
  // Remove empty lines created by type removals
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return content;
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

createProductionBuild();