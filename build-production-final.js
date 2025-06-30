#!/usr/bin/env node

/**
 * Final Production Build Script for Recrutas
 * Implements all deployment fixes for proper dist/index.js generation
 * 
 * Fixes Applied:
 * 1. ✅ Fix build command to properly generate dist/index.js
 * 2. ✅ Create proper production entry point that Node.js can execute
 * 3. ✅ Update TypeScript compilation to dist directory
 * 4. ✅ Add TypeScript configuration for proper compilation to dist directory
 * 5. ✅ Ensure server listens on 0.0.0.0 for deployment compatibility
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message) => console.log(`🔧 ${message}`);
const success = (message) => console.log(`✅ ${message}`);
const error = (message) => console.error(`❌ ${message}`);

async function buildProduction() {
  try {
    log('Starting comprehensive production build...');

    // Step 1: Clean previous builds
    log('Cleaning previous builds...');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    if (fs.existsSync('dist-server')) {
      fs.rmSync('dist-server', { recursive: true, force: true });
    }
    success('Previous builds cleaned');

    // Step 2: Build frontend with Vite
    log('Building React frontend with Vite...');
    try {
      execSync('vite build', { 
        stdio: 'inherit', 
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production' }
      });
      success('Frontend build completed');
    } catch (buildError) {
      error('Frontend build failed');
      throw buildError;
    }

    // Step 3: Compile TypeScript server code
    log('Compiling TypeScript server code...');
    try {
      execSync('npx tsc -p server/tsconfig.production.json', { 
        stdio: 'inherit', 
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production' }
      });
      success('TypeScript compilation completed');
    } catch (tsError) {
      error('TypeScript compilation failed');
      throw tsError;
    }

    // Step 4: Create the main production entry point (dist/index.js)
    log('Creating production entry point (dist/index.js)...');
    
    const productionServer = `import express from 'express';
import { registerRoutes } from './routes.js';
import path from 'path';
import fs from 'fs';

// Production logging
function log(message, source = 'express') {
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit', 
    second: '2-digit',
    hour12: true
  });
  console.log(\`\${time} [\${source}] \${message}\`);
}

// Static file serving for production
function serveStatic(app) {
  const distPath = path.resolve(process.cwd(), 'dist');
  
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application not found');
      }
    });
  } else {
    app.get('*', (req, res) => {
      res.status(200).send(\`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recrutas - AI Job Platform</title>
          <style>
            body { 
              font-family: system-ui; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              margin: 0;
              min-height: 100vh;
            }
          </style>
        </head>
        <body>
          <h1>🚀 Recrutas</h1>
          <p>AI-Powered Job Platform</p>
          <p>Server is running on port \${process.env.PORT || 5000}</p>
        </body>
        </html>
      \`);
    });
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedResponse;

  const originalJson = res.json;
  res.json = function(body, ...args) {
    capturedResponse = body;
    return originalJson.apply(res, [body, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith('/api')) {
      let logLine = \`\${req.method} \${requestPath} \${res.statusCode} in \${duration}ms\`;
      if (capturedResponse) {
        logLine += \` :: \${JSON.stringify(capturedResponse)}\`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }
      log(logLine);
    }
  });

  next();
});

// Initialize server
(async () => {
  try {
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      res.status(status).json({ message });
      console.error('Server error:', err);
    });

    // Serve static files
    serveStatic(app);

    // Start server on 0.0.0.0 for deployment compatibility
    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => {
      log(\`🚀 Recrutas production server running on port \${port}\`);
      log(\`🌐 Server accessible at http://0.0.0.0:\${port}\`);
    });

  } catch (startupError) {
    console.error('Failed to start production server:', startupError);
    process.exit(1);
  }
})();`;

    fs.writeFileSync('dist/index.js', productionServer);
    success('Created dist/index.js production entry point');

    // Step 5: Copy shared directory to dist
    log('Copying shared directory...');
    if (fs.existsSync('shared')) {
      fs.cpSync('shared', 'dist/shared', { recursive: true });
      success('Shared directory copied to dist');
    }

    // Step 6: Create production package.json
    log('Creating production package.json...');
    const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const productionPackage = {
      name: originalPackage.name,
      version: originalPackage.version,
      type: 'module',
      main: 'index.js',
      scripts: {
        start: 'NODE_ENV=production node index.js'
      },
      dependencies: {
        // Filter out development and build dependencies
        ...Object.fromEntries(
          Object.entries(originalPackage.dependencies || {}).filter(([key]) => {
            const excludeDeps = [
              'vite', '@vitejs/plugin-react', 'esbuild', 'tailwindcss',
              'autoprefixer', 'postcss', 'typescript', 'drizzle-kit',
              '@replit/vite-plugin-cartographer', '@replit/vite-plugin-runtime-error-modal'
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
    success('Production package.json created');

    // Step 7: Verify build integrity
    log('Verifying build integrity...');
    
    const requiredFiles = [
      { path: 'dist/index.js', name: 'Main server entry point' },
      { path: 'dist/index.html', name: 'Frontend HTML' },
      { path: 'dist/package.json', name: 'Production package.json' },
      { path: 'dist/routes.js', name: 'API routes' },
      { path: 'dist/shared', name: 'Shared directory' }
    ];

    let allFilesExist = true;
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file.path)) {
        success(`✓ ${file.name} exists`);
      } else {
        error(`✗ ${file.name} missing at ${file.path}`);
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      success('🎉 Production build completed successfully!');
      success('📁 dist/index.js is ready for deployment');
      success('🚀 Run "npm start" to test the production server');
      
      log('Deployment Instructions:');
      console.log('');
      console.log('  1. The dist/index.js file is the main entry point');
      console.log('  2. Server listens on 0.0.0.0 for deployment compatibility');
      console.log('  3. PORT environment variable is supported');
      console.log('  4. All Vite dependencies excluded from production build');
      console.log('');
      
    } else {
      error('❌ Build verification failed - some required files are missing');
      process.exit(1);
    }

  } catch (buildError) {
    error('Production build failed:', buildError.message);
    console.error(buildError);
    process.exit(1);
  }
}

buildProduction();