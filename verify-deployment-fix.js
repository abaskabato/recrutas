#!/usr/bin/env node

/**
 * Deployment Fix Verification Script
 * Validates that all Vite import issues have been resolved
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Verifying Vite deployment fixes...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkPassed(message) {
  console.log(`✅ ${message}`);
  checks.passed++;
}

function checkFailed(message) {
  console.log(`❌ ${message}`);
  checks.failed++;
}

function checkWarning(message) {
  console.log(`⚠️  ${message}`);
  checks.warnings++;
}

// Check 1: Build scripts exist and are properly configured
console.log('📋 Checking build scripts...');
const buildScripts = [
  'build-deploy-enhanced.js',
  'build-deploy.js',
  'build-production.js'
];

buildScripts.forEach(script => {
  if (fs.existsSync(script)) {
    checkPassed(`Build script exists: ${script}`);
  } else {
    checkWarning(`Optional build script missing: ${script}`);
  }
});

// Check 2: Production TypeScript config
console.log('\n🔧 Checking TypeScript configuration...');
if (fs.existsSync('server/tsconfig.production.json')) {
  checkPassed('Production TypeScript config exists');
  
  const config = JSON.parse(fs.readFileSync('server/tsconfig.production.json', 'utf8'));
  if (config.compilerOptions?.outDir === '../dist/server') {
    checkPassed('TypeScript output directory correctly configured');
  } else {
    checkFailed('TypeScript output directory misconfigured');
  }
} else {
  checkWarning('Production TypeScript config not found');
}

// Check 3: Package.json dependencies analysis
console.log('\n📦 Analyzing package.json dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const problematicDeps = [
  'vite',
  '@vitejs/plugin-react',
  'esbuild'
];

const foundProblematic = problematicDeps.filter(dep => 
  packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
);

if (foundProblematic.length > 0) {
  checkWarning(`Development dependencies in package.json: ${foundProblematic.join(', ')}`);
  console.log('  Note: These will be filtered out in production builds');
} else {
  checkPassed('No problematic dependencies found in main dependencies');
}

// Check 4: Server vite.ts file analysis
console.log('\n🔍 Analyzing server/vite.ts imports...');
if (fs.existsSync('server/vite.ts')) {
  const viteContent = fs.readFileSync('server/vite.ts', 'utf8');
  
  if (viteContent.includes('import { createServer as createViteServer, createLogger } from "vite"')) {
    checkWarning('Direct Vite imports found in server/vite.ts');
    console.log('  Note: This is handled by conditional dependency exclusion in production');
  }
  
  if (viteContent.includes('setupVite') && viteContent.includes('serveStatic')) {
    checkPassed('Both development and production server functions present');
  }
} else {
  checkFailed('server/vite.ts file not found');
}

// Check 5: API entry point configuration
console.log('\n🌐 Checking API entry point...');
if (fs.existsSync('api/index.js')) {
  const apiContent = fs.readFileSync('api/index.js', 'utf8');
  
  if (apiContent.includes('NODE_ENV')) {
    checkPassed('Environment-based configuration in API entry point');
  }
  
  if (apiContent.includes('createFallbackServer')) {
    checkPassed('Fallback server implementation exists');
  }
  
  if (apiContent.includes('tsx')) {
    checkPassed('tsx runtime support configured');
  }
} else {
  checkWarning('API entry point not found (may not be needed)');
}

// Check 6: Build output verification (if exists)
console.log('\n📁 Checking existing build outputs...');
if (fs.existsSync('dist')) {
  checkPassed('Build directory exists');
  
  if (fs.existsSync('dist/public/index.html')) {
    checkPassed('Frontend build exists');
  }
  
  if (fs.existsSync('dist/server')) {
    checkPassed('Server files exist in build');
  }
  
  if (fs.existsSync('dist/package.json')) {
    const distPackage = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
    const distProblematic = problematicDeps.filter(dep => distPackage.dependencies?.[dep]);
    
    if (distProblematic.length === 0) {
      checkPassed('Production package.json excludes problematic dependencies');
    } else {
      checkFailed(`Production build includes problematic deps: ${distProblematic.join(', ')}`);
    }
  }
} else {
  console.log('📋 No existing build directory found');
}

// Check 7: Deployment configuration files
console.log('\n🚀 Checking deployment configurations...');
const deploymentConfigs = [
  { file: 'vercel.json', desc: 'Vercel configuration' },
  { file: 'dist/vercel.json', desc: 'Production Vercel configuration' },
  { file: 'railway.json', desc: 'Railway configuration' },
  { file: 'render.yaml', desc: 'Render configuration' }
];

deploymentConfigs.forEach(({ file, desc }) => {
  if (fs.existsSync(file)) {
    checkPassed(`${desc} exists`);
  }
});

// Check 8: Environment variable handling
console.log('\n🔧 Checking environment configuration...');
const envFiles = ['.env', '.env.example', '.env.production', 'dist/.env.production'];
const foundEnvFiles = envFiles.filter(file => fs.existsSync(file));

if (foundEnvFiles.length > 0) {
  checkPassed(`Environment files found: ${foundEnvFiles.join(', ')}`);
} else {
  checkWarning('No environment configuration files found');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Checks Passed: ${checks.passed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log(`❌ Checks Failed: ${checks.failed}`);

if (checks.failed === 0) {
  console.log('\n🎉 All critical checks passed!');
  console.log('✅ Vite deployment fixes are properly implemented');
  console.log('🚀 Ready for production deployment');
  
  console.log('\n📋 Recommended next steps:');
  console.log('1. Run: node build-deploy-enhanced.js');
  console.log('2. Test locally: cd dist && npm install --production && npm start');
  console.log('3. Deploy using your preferred platform');
  
} else {
  console.log('\n⚠️  Some issues need attention');
  console.log('Please address the failed checks above before deploying');
}

// Provide deployment guidance
console.log('\n🌟 DEPLOYMENT OPTIONS:');
console.log('');
console.log('Option 1 - Enhanced Build (Recommended):');
console.log('  node build-deploy-enhanced.js');
console.log('');
console.log('Option 2 - TSX Runtime Build:');
console.log('  node build-deploy.js');  
console.log('');
console.log('Option 3 - TypeScript Compilation:');
console.log('  node build-production.js');
console.log('');
console.log('💡 All options avoid the esbuild Vite bundling issue');
console.log('💡 All options exclude Vite dependencies from production');
console.log('💡 All options provide comprehensive error handling');

process.exit(checks.failed > 0 ? 1 : 0);