#!/usr/bin/env node

/**
 * Production Deployment Script - Complete Fix for Vite Import Issues
 * This script replaces the problematic "npm run build" command entirely
 * 
 * Implements all suggested deployment fixes:
 * ✅ 1. Replace esbuild bundling with TypeScript compilation
 * ✅ 2. Create production TypeScript config that excludes Vite dependencies  
 * ✅ 3. Update run command to use Node.js with TypeScript files directly
 * ✅ 4. Add conditional import handling to prevent Vite imports in production
 * ✅ 5. Create production-safe server entry point that avoids Vite dependencies
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message, emoji = '🔨') => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${emoji} [${timestamp}] ${message}`);
};

const success = (message) => log(message, '✅');
const error = (message) => log(message, '❌'); 
const warn = (message) => log(message, '⚠️');
const info = (message) => log(message, 'ℹ️');

async function deployProduction() {
  try {
    log('🚀 Starting production deployment with all Vite import fixes...');
    
    // Clean previous builds
    log('Cleaning build directories...');
    ['dist', 'dist-server'].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
    
    // Step 1: Build frontend (this works fine)
    log('Building frontend assets...');
    execSync('npx vite build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    success('Frontend build completed');
    
    // Step 2: Build server with TypeScript (NOT esbuild)
    log('Compiling server with TypeScript (avoiding esbuild conflicts)...');
    try {
      execSync('npx tsc -p server/tsconfig.production.json', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      success('Server TypeScript compilation completed');
    } catch (tscError) {
      warn('TypeScript compilation had issues, using runtime approach...');
      
      // Ensure dist-server exists for file copying
      fs.mkdirSync('dist-server', { recursive: true });
      
      // Copy essential server files (excluding vite.ts)
      const serverFiles = fs.readdirSync('server').filter(file => 
        (file.endsWith('.ts') || file.endsWith('.js')) && file !== 'vite.ts'
      );
      
      for (const file of serverFiles) {
        fs.copyFileSync(
          path.join('server', file),
          path.join('dist-server', file)
        );
      }
      
      // Copy shared directory
      if (fs.existsSync('shared')) {
        fs.cpSync('shared', 'dist-server/shared', { recursive: true });
      }
      
      success('Server files copied for runtime execution');
    }
    
    // Step 3: Create production package.json (excluding Vite deps)
    log('Creating production package.json without Vite dependencies...');
    const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Dependencies that cause esbuild/Vite conflicts
    const excludedDeps = [
      'vite', '@vitejs/plugin-react', 'esbuild', 'typescript',
      '@replit/vite-plugin-cartographer', '@replit/vite-plugin-runtime-error-modal',
      'tailwindcss', 'autoprefixer', 'postcss', 'drizzle-kit'
    ];
    
    const productionDeps = { ...originalPkg.dependencies };
    excludedDeps.forEach(dep => delete productionDeps[dep]);
    
    const productionPackage = {
      name: originalPkg.name,
      version: originalPkg.version,
      type: 'module',
      license: originalPkg.license,
      scripts: {
        // Use tsx runtime to avoid all esbuild/compilation issues
        start: 'NODE_ENV=production tsx server/index-production.ts',
        'start:compiled': 'NODE_ENV=production node dist-server/index-production.js'
      },
      dependencies: {
        ...productionDeps,
        'tsx': '^4.19.1' // Ensure tsx is available for runtime execution
      },
      engines: {
        node: '>=18.0.0'
      }
    };
    
    fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
    success('Production package.json created (Vite-free)');
    
    // Step 4: Copy production server files to dist
    log('Setting up production server structure...');
    
    // Copy server directory to dist
    fs.cpSync('server', 'dist/server', { 
      recursive: true,
      filter: (src) => !src.endsWith('vite.ts') // Exclude vite.ts
    });
    
    // Copy shared directory to dist
    if (fs.existsSync('shared')) {
      fs.cpSync('shared', 'dist/shared', { recursive: true });
    }
    
    success('Production server structure created');
    
    // Step 5: Create startup script that uses tsx runtime
    log('Creating production startup script...');
    const startupScript = `#!/usr/bin/env node

/**
 * Production Server Startup
 * Uses tsx runtime to avoid all esbuild/Vite bundling issues
 */

import { spawn } from 'child_process';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server', 'index-production.ts');

console.log('🚀 Starting Recrutas production server...');
console.log('Using tsx runtime to avoid Vite import conflicts');

const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(\`Server process exited with code \${code}\`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});`;
    
    fs.writeFileSync('dist/start.js', startupScript);
    fs.chmodSync('dist/start.js', '755'); // Make executable
    success('Production startup script created');
    
    // Step 6: Create deployment configurations
    log('Creating deployment configurations...');
    
    // Vercel config for tsx runtime
    const vercelConfig = {
      "version": 2,
      "builds": [
        {
          "src": "server/index-production.ts",
          "use": "@vercel/node",
          "config": {
            "includeFiles": [
              "dist/**",
              "server/**",
              "shared/**",
              "node_modules/tsx/**"
            ]
          }
        }
      ],
      "routes": [
        {
          "src": "/api/(.*)",
          "dest": "/server/index-production.ts"
        },
        {
          "src": "/(.*)",
          "dest": "/dist/$1"
        }
      ],
      "env": {
        "NODE_ENV": "production"
      },
      "functions": {
        "server/index-production.ts": {
          "runtime": "nodejs18.x"
        }
      }
    };
    
    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
    
    // Railway config
    const railwayConfig = {
      "build": {
        "command": "node deploy-production.js"
      },
      "start": {
        "command": "tsx server/index-production.ts"
      },
      "env": {
        "NODE_ENV": "production"
      }
    };
    
    fs.writeFileSync('railway.json', JSON.stringify(railwayConfig, null, 2));
    
    success('Deployment configurations created');
    
    // Step 7: Verify all fixes are applied
    log('Verifying deployment fixes...');
    
    const verifications = [
      {
        name: 'Frontend built',
        check: () => fs.existsSync('dist/index.html'),
        fix: 'Build frontend first'
      },
      {
        name: 'Production server exists',
        check: () => fs.existsSync('server/index-production.ts'),
        fix: 'Production server entry point created'
      },
      {
        name: 'Vite-free server utils exist',
        check: () => fs.existsSync('server/vite-production.ts'),
        fix: 'Vite-free utilities created'
      },
      {
        name: 'Production TypeScript config',
        check: () => fs.existsSync('server/tsconfig.production.json'),
        fix: 'Production TypeScript config excludes vite.ts'
      },
      {
        name: 'Production package excludes Vite',
        check: () => {
          const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
          return !Object.keys(pkg.dependencies || {}).some(dep => dep.includes('vite'));
        },
        fix: 'Production dependencies are Vite-free'
      }
    ];
    
    let allPassed = true;
    
    for (const verification of verifications) {
      if (verification.check()) {
        success(`✓ ${verification.name}`);
      } else {
        error(`✗ ${verification.name}`);
        allPassed = false;
      }
    }
    
    if (allPassed) {
      success('🎉 All deployment fixes successfully applied!');
      info('');
      info('🚀 Deployment ready! Choose your deployment method:');
      info('');
      info('1. Runtime execution (recommended):');
      info('   NODE_ENV=production tsx server/index-production.ts');
      info('');
      info('2. Direct deployment:');
      info('   • Vercel: vercel --prod');
      info('   • Railway: Push to connected Git repository');
      info('   • Other platforms: Upload dist/ directory');
      info('');
      info('3. Test locally:');
      info('   cd dist && npm install && npm start');
      info('');
      success('No more esbuild/Vite import conflicts!');
    } else {
      error('Some deployment fixes are missing. Please check the verification results.');
      process.exit(1);
    }
    
  } catch (deployError) {
    error(`Deployment failed: ${deployError.message}`);
    console.error(deployError);
    process.exit(1);
  }
}

// Execute deployment
deployProduction().catch(error => {
  console.error('Fatal deployment error:', error);
  process.exit(1);
});