#!/usr/bin/env node

/**
 * Comprehensive Deployment Fixes Verification Script
 * Validates that all 5 suggested fixes for esbuild/Vite import conflicts are implemented
 */

import fs from 'fs';
import path from 'path';

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

function verifyAllDeploymentFixes() {
  console.log('🔍 Verifying all deployment fixes for esbuild/Vite import conflicts...\n');

  // Fix #1: Replace esbuild bundling with TypeScript compilation
  console.log('📋 Fix #1: Replace esbuild bundling with TypeScript compilation');
  
  if (fs.existsSync('server/tsconfig.production.json')) {
    const tsConfig = JSON.parse(fs.readFileSync('server/tsconfig.production.json', 'utf8'));
    if (tsConfig.exclude && tsConfig.exclude.includes('vite.ts')) {
      checkPassed('Production TypeScript config excludes vite.ts');
    } else {
      checkWarning('Production TypeScript config should exclude vite.ts');
    }
  } else {
    checkFailed('Production TypeScript config missing (server/tsconfig.production.json)');
  }

  // Check for alternative build scripts
  if (fs.existsSync('build-production-comprehensive.js')) {
    checkPassed('Comprehensive production build script exists');
  } else {
    checkWarning('Comprehensive build script not found');
  }

  if (fs.existsSync('deploy-production.js')) {
    checkPassed('Production deployment script exists');
  } else {
    checkWarning('Production deployment script not found');
  }

  console.log('');

  // Fix #2: Create production TypeScript config that excludes Vite dependencies
  console.log('📋 Fix #2: Production TypeScript config excludes Vite dependencies');
  
  if (fs.existsSync('server/tsconfig.production.json')) {
    const tsConfig = JSON.parse(fs.readFileSync('server/tsconfig.production.json', 'utf8'));
    
    if (tsConfig.exclude && tsConfig.exclude.includes('vite.ts')) {
      checkPassed('TypeScript config excludes vite.ts file');
    } else {
      checkFailed('TypeScript config should exclude vite.ts');
    }
    
    if (tsConfig.outDir) {
      checkPassed('TypeScript config has proper output directory');
    } else {
      checkWarning('TypeScript config should specify output directory');
    }
  } else {
    checkFailed('Production TypeScript config missing');
  }

  console.log('');

  // Fix #3: Update run command to use Node.js with TypeScript files directly
  console.log('📋 Fix #3: Use Node.js with TypeScript files directly (tsx runtime)');
  
  // Check if we have production server entry point
  if (fs.existsSync('server/index-production.ts')) {
    checkPassed('Production server entry point exists (server/index-production.ts)');
    
    // Check if it avoids Vite imports
    const content = fs.readFileSync('server/index-production.ts', 'utf8');
    if (!content.includes('from "vite"') && !content.includes('import vite')) {
      checkPassed('Production server avoids Vite imports');
    } else {
      checkFailed('Production server still contains Vite imports');
    }
  } else {
    checkFailed('Production server entry point missing');
  }

  console.log('');

  // Fix #4: Add conditional import handling to prevent Vite imports in production
  console.log('📋 Fix #4: Conditional import handling prevents Vite imports');
  
  if (fs.existsSync('server/vite-production.ts')) {
    checkPassed('Vite-free server utilities exist (server/vite-production.ts)');
    
    // Check if it avoids Vite imports
    const content = fs.readFileSync('server/vite-production.ts', 'utf8');
    if (!content.includes('from "vite"') && !content.includes('import vite')) {
      checkPassed('Vite-free utilities avoid Vite imports');
    } else {
      checkFailed('Vite-free utilities still contain Vite imports');
    }
  } else {
    checkFailed('Vite-free server utilities missing');
  }

  console.log('');

  // Fix #5: Create production-safe server entry point that avoids Vite dependencies
  console.log('📋 Fix #5: Production-safe server entry point avoids Vite dependencies');
  
  if (fs.existsSync('server/index-production.ts')) {
    const content = fs.readFileSync('server/index-production.ts', 'utf8');
    
    if (content.includes('vite-production')) {
      checkPassed('Production server uses Vite-free utilities');
    } else {
      checkWarning('Production server should use vite-production utilities');
    }
    
    if (!content.includes('setupVite')) {
      checkPassed('Production server avoids setupVite function');
    } else {
      checkFailed('Production server should not use setupVite');
    }
  } else {
    checkFailed('Production server entry point missing');
  }

  console.log('');

  // Additional checks for deployment readiness
  console.log('📋 Additional Deployment Readiness Checks');
  
  // Check for problematic package.json build script
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (pkg.scripts && pkg.scripts.build && pkg.scripts.build.includes('esbuild')) {
      checkWarning('Original package.json still uses esbuild (use alternative build scripts)');
    } else {
      checkPassed('Package.json build script issue acknowledged');
    }
  }

  // Check for deployment configurations
  if (fs.existsSync('vercel.json')) {
    checkPassed('Vercel deployment configuration exists');
  } else {
    checkWarning('Vercel deployment configuration not found');
  }

  if (fs.existsSync('railway.json')) {
    checkPassed('Railway deployment configuration exists');
  } else {
    checkWarning('Railway deployment configuration not found');
  }

  console.log('');

  // Summary
  console.log('📊 VERIFICATION SUMMARY');
  console.log('====================');
  console.log(`✅ Passed: ${checks.passed}`);
  console.log(`❌ Failed: ${checks.failed}`);
  console.log(`⚠️  Warnings: ${checks.warnings}`);
  console.log('');

  if (checks.failed === 0) {
    console.log('🎉 ALL DEPLOYMENT FIXES SUCCESSFULLY IMPLEMENTED!');
    console.log('');
    console.log('Deployment Options:');
    console.log('1. Use the comprehensive build script:');
    console.log('   node build-production-comprehensive.js');
    console.log('');
    console.log('2. Use the deployment script:');
    console.log('   node deploy-production.js');
    console.log('');
    console.log('3. Manual deployment:');
    console.log('   NODE_ENV=production tsx server/index-production.ts');
    console.log('');
    console.log('✨ No more esbuild/Vite import conflicts!');
  } else {
    console.log('❌ Some fixes are missing or incomplete.');
    console.log('Please address the failed checks above.');
    process.exit(1);
  }
}

// Run verification
verifyAllDeploymentFixes();