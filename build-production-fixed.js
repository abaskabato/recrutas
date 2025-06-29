/**
 * Production Build Script - Complete Fix for Vite Import Issues
 * Replaces esbuild bundling with TypeScript compilation to avoid Vite conflicts
 * Addresses all suggested fixes from deployment error
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message, prefix = '🔨') => {
  console.log(`${prefix} ${message}`);
};

const checkCommand = (command, name) => {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    log(`❌ ${name} not found. Please install it.`, '');
    return false;
  }
};

async function buildProduction() {
  log('Starting production build with Vite import conflict fixes');

  // Verify required tools
  const hasNode = checkCommand('node', 'Node.js');
  const hasNpm = checkCommand('npm', 'npm');
  
  if (!hasNode || !hasNpm) {
    process.exit(1);
  }

  try {
    // Step 1: Set production environment
    process.env.NODE_ENV = 'production';
    log('✅ Set NODE_ENV=production');

    // Step 2: Clean previous builds
    log('Cleaning previous builds...');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    if (fs.existsSync('dist-server')) {
      fs.rmSync('dist-server', { recursive: true, force: true });
    }

    // Step 3: Build frontend with Vite (this works fine)
    log('Building frontend with Vite...');
    execSync('npx vite build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    log('✅ Frontend build completed');

    // Step 4: Compile server with TypeScript (avoiding esbuild/Vite conflicts)
    log('Compiling server with TypeScript...');
    
    // Create dist-server directory
    fs.mkdirSync('dist-server', { recursive: true });
    
    // Use TypeScript compiler instead of esbuild to avoid Vite import issues
    execSync('npx tsc -p server/tsconfig.production.json', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    log('✅ Server TypeScript compilation completed');

    // Step 5: Copy production server entry point
    log('Copying production server files...');
    
    const serverIndexContent = `
// Production server entry point - No Vite dependencies
import('./index-production.js')
  .then(() => {
    console.log('Production server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start production server:', error);
    process.exit(1);
  });
`;

    fs.writeFileSync('dist-server/index.js', serverIndexContent);
    
    // Copy package.json dependencies info
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const productionPackage = {
      name: packageJson.name,
      version: packageJson.version,
      type: 'module',
      dependencies: packageJson.dependencies,
      scripts: {
        start: 'node index.js'
      }
    };
    
    fs.writeFileSync('dist-server/package.json', JSON.stringify(productionPackage, null, 2));
    log('✅ Production files copied');

    // Step 6: Verify build
    log('Verifying build...');
    
    const frontendExists = fs.existsSync('dist/index.html');
    const serverExists = fs.existsSync('dist-server/index.js');
    const serverProductionExists = fs.existsSync('dist-server/index-production.js');
    
    if (!frontendExists) {
      throw new Error('Frontend build failed - dist/index.html not found');
    }
    
    if (!serverExists) {
      throw new Error('Server build failed - dist-server/index.js not found');
    }
    
    if (!serverProductionExists) {
      throw new Error('Production server not compiled - dist-server/index-production.js not found');
    }
    
    log('✅ Build verification passed');

    // Step 7: Create deployment readme
    const deploymentReadme = `# Production Deployment

## Build Completed Successfully

### What was built:
- \`dist/\` - Frontend static files (built with Vite)
- \`dist-server/\` - Server files (compiled with TypeScript, no Vite dependencies)

### Deployment Instructions:

1. **For static hosting (Vercel, Netlify):**
   - Deploy the \`dist/\` folder
   - Configure API routes to point to your server

2. **For full-stack hosting (Railway, Render, Heroku):**
   - Deploy both \`dist/\` and \`dist-server/\`
   - Set start command: \`node dist-server/index.js\`
   - Set NODE_ENV=production

3. **Environment Variables:**
   - Copy all required environment variables
   - Ensure DATABASE_URL is set
   - Set NODE_ENV=production

### Key Fixes Applied:
- ✅ Replaced esbuild bundling with TypeScript compilation
- ✅ Created production-safe server entry point avoiding Vite imports
- ✅ Excluded Vite dependencies from production build
- ✅ Set NODE_ENV=production during build process
- ✅ Used dedicated TypeScript config for production server compilation

The server now runs without any Vite import conflicts in production.
`;

    fs.writeFileSync('DEPLOYMENT.md', deploymentReadme);
    
    log('🎉 Production build completed successfully!');
    log('📄 See DEPLOYMENT.md for deployment instructions');
    log('');
    log('Key achievements:');
    log('  ✅ No more esbuild/Vite import conflicts');
    log('  ✅ Production server uses TypeScript compilation');
    log('  ✅ Clean separation of development and production code');
    log('  ✅ Ready for deployment on any platform');

  } catch (error) {
    log(`❌ Build failed: ${error.message}`, '');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProduction();
}

export { buildProduction };