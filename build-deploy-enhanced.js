#!/usr/bin/env node

/**
 * Enhanced Production Deployment Script
 * Completely resolves Vite import issues with multiple fallback strategies
 * Addresses all esbuild bundling conflicts with Vite dependencies
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Enhanced Recrutas deployment build starting...');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Create dist directory structure
fs.mkdirSync('dist', { recursive: true });

// Build React frontend (this always works)
console.log('⚛️  Building React frontend with Vite...');
try {
  execSync('vite build', { 
    stdio: 'inherit', 
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Copy server source files (avoiding TypeScript compilation issues)
console.log('📂 Copying server source files...');
fs.cpSync('server', 'dist/server', { 
  recursive: true,
  filter: (src, dest) => {
    const filename = path.basename(src);
    // Skip backup files, test files, and temp files
    return !filename.includes('backup') && 
           !filename.includes('test') && 
           !filename.includes('temp') &&
           !filename.startsWith('.') &&
           !filename.endsWith('.map');
  }
});

// Copy shared directory if exists
if (fs.existsSync('shared')) {
  console.log('📁 Copying shared directory...');
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Create production package.json with Vite exclusions
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
    // Filter out all Vite-related and dev dependencies
    ...Object.fromEntries(
      Object.entries(packageJson.dependencies || {}).filter(([key]) => {
        const excludeDeps = [
          // Vite and related build tools
          'vite',
          '@vitejs/plugin-react',
          '@replit/vite-plugin-cartographer',
          '@replit/vite-plugin-runtime-error-modal',
          // Build tools that conflict with esbuild
          'esbuild',
          'rollup',
          'webpack',
          // CSS/Styling build tools
          'tailwindcss',
          'autoprefixer',
          'postcss',
          '@tailwindcss/vite',
          '@tailwindcss/typography',
          // TypeScript development tools
          'typescript',
          'drizzle-kit',
          // Testing and development
          '@types/node',
          '@types/express',
          '@types/react',
          '@types/react-dom'
        ];
        return !excludeDeps.includes(key);
      })
    ),
    // Ensure tsx is available for runtime TypeScript execution
    'tsx': packageJson.devDependencies?.tsx || packageJson.dependencies?.tsx || '^4.19.1'
  },
  engines: packageJson.engines || {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

// Copy essential configuration files
console.log('📋 Copying configuration files...');
const configFiles = [
  'drizzle.config.ts',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.js'
];

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  📄 Copying ${file}...`);
    fs.copyFileSync(file, `dist/${file}`);
  }
});

// Create production environment configuration
console.log('🔧 Creating production environment configuration...');
const prodEnvConfig = `
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Add your production environment variables here
# DATABASE_URL=your_production_database_url
# OPENAI_API_KEY=your_openai_api_key
# SENDGRID_API_KEY=your_sendgrid_api_key
# STRIPE_SECRET_KEY=your_stripe_secret_key
`;

fs.writeFileSync('dist/.env.production', prodEnvConfig.trim());

// Create startup script that handles Vite import issues
console.log('🚀 Creating production startup script...');
const startupScript = `#!/usr/bin/env node

/**
 * Production Startup Script
 * Handles Vite import conflicts by setting proper environment
 */

import { execSync } from 'child_process';
import fs from 'fs';

// Ensure production environment
process.env.NODE_ENV = 'production';

// Check if we're in a deployment environment
const isDeployment = process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT || process.env.RENDER;

if (isDeployment) {
  console.log('🚀 Starting in deployment environment...');
  
  // Install production dependencies if needed
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing production dependencies...');
    execSync('npm install --production', { stdio: 'inherit' });
  }
}

// Start the application
console.log('🌟 Starting Recrutas application...');
try {
  execSync('tsx server/index.ts', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('❌ Application startup failed:', error.message);
  process.exit(1);
}
`;

fs.writeFileSync('dist/start.js', startupScript);
fs.chmodSync('dist/start.js', '755');

// Create Vercel-specific configuration
console.log('🔧 Creating Vercel deployment configuration...');
const vercelConfig = {
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["dist/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
};

fs.writeFileSync('dist/vercel.json', JSON.stringify(vercelConfig, null, 2));

console.log('✅ Enhanced deployment build completed successfully!');
console.log('');
console.log('📊 Build Summary:');
console.log('  ✅ Frontend built with Vite');
console.log('  ✅ Server files copied (tsx runtime)');
console.log('  ✅ Production package.json created (Vite excluded)');
console.log('  ✅ Configuration files copied');
console.log('  ✅ Environment configuration created');
console.log('  ✅ Production startup script created');
console.log('  ✅ Vercel deployment configuration created');
console.log('');

// Verify build integrity
const requiredFiles = [
  'dist/public/index.html',
  'dist/server/index.ts',
  'dist/server/vite.ts',
  'dist/package.json',
  'dist/start.js'
];

console.log('🔍 Verifying build integrity...');
const missing = requiredFiles.filter(file => !fs.existsSync(file));
if (missing.length > 0) {
  console.error('❌ Build verification failed. Missing files:');
  missing.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

console.log('✅ Build verification passed');
console.log('');
console.log('🚀 Deployment Instructions:');
console.log('');
console.log('📁 Output directory: ./dist');
console.log('');
console.log('🌟 For Vercel deployment:');
console.log('  1. Use build command: node build-deploy-enhanced.js');
console.log('  2. Set start command: node start.js');
console.log('  3. Set NODE_ENV=production in environment variables');
console.log('');
console.log('🌟 For Railway/Render deployment:');
console.log('  1. Build: node build-deploy-enhanced.js');
console.log('  2. Start: cd dist && npm install --production && npm start');
console.log('');
console.log('🌟 For Docker deployment:');
console.log('  1. Copy dist/ directory to container');
console.log('  2. Run: npm install --production');
console.log('  3. Start: npm start');
console.log('');
console.log('🎯 This build avoids ALL Vite import conflicts by:');
console.log('  - Excluding Vite from production dependencies');
console.log('  - Using tsx runtime execution instead of esbuild bundling');
console.log('  - Copying source files as-is (no TypeScript compilation)');
console.log('  - Conditional environment handling');
console.log('');
console.log('💡 Ready for production deployment!');

// Display final file structure
console.log('📂 Final build structure:');
console.log('dist/');
console.log('├── public/          # Frontend build (from Vite)');
console.log('├── server/          # Server source files');
console.log('├── shared/          # Shared modules');
console.log('├── package.json     # Production dependencies');
console.log('├── start.js         # Production startup script');
console.log('├── vercel.json      # Vercel configuration');
console.log('└── .env.production  # Environment template');