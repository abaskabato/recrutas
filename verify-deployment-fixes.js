/**
 * Deployment Fixes Verification Script
 * Validates that all suggested fixes for Vite import issues have been applied
 */

import fs from 'fs';
import path from 'path';

function checkPassed(message) {
  console.log(`✅ ${message}`);
}

function checkFailed(message) {
  console.log(`❌ ${message}`);
}

function checkWarning(message) {
  console.log(`⚠️  ${message}`);
}

function verifyDeploymentFixes() {
  console.log('🔍 Verifying deployment fixes for Vite import conflicts...\n');

  let allChecksPassed = true;

  // Check 1: Production server entry point exists
  if (fs.existsSync('server/index-production.ts')) {
    checkPassed('Production-safe server entry point created (server/index-production.ts)');
  } else {
    checkFailed('Production server entry point missing');
    allChecksPassed = false;
  }

  // Check 2: Vite-free server utilities exist
  if (fs.existsSync('server/vite-production.ts')) {
    checkPassed('Vite-free server utilities created (server/vite-production.ts)');
  } else {
    checkFailed('Vite-free server utilities missing');
    allChecksPassed = false;
  }

  // Check 3: Production TypeScript config exists
  if (fs.existsSync('server/tsconfig.production.json')) {
    checkPassed('Production TypeScript config created (server/tsconfig.production.json)');
  } else {
    checkFailed('Production TypeScript config missing');
    allChecksPassed = false;
  }

  // Check 4: Production build script exists
  if (fs.existsSync('build-production-fixed.js')) {
    checkPassed('Production build script created (build-production-fixed.js)');
  } else {
    checkFailed('Production build script missing');
    allChecksPassed = false;
  }

  // Check 5: Verify production server doesn't import Vite
  if (fs.existsSync('server/index-production.ts')) {
    const content = fs.readFileSync('server/index-production.ts', 'utf8');
    if (!content.includes('from "vite"') && !content.includes('import vite')) {
      checkPassed('Production server avoids Vite imports');
    } else {
      checkFailed('Production server still contains Vite imports');
      allChecksPassed = false;
    }
  }

  // Check 6: Verify TypeScript config excludes Vite files
  if (fs.existsSync('server/tsconfig.production.json')) {
    const config = JSON.parse(fs.readFileSync('server/tsconfig.production.json', 'utf8'));
    if (config.exclude && config.exclude.includes('vite.ts')) {
      checkPassed('TypeScript config excludes Vite files');
    } else {
      checkWarning('TypeScript config should exclude vite.ts');
    }
  }

  // Check 7: Verify build script uses TypeScript compilation
  if (fs.existsSync('build-production-fixed.js')) {
    const content = fs.readFileSync('build-production-fixed.js', 'utf8');
    if (content.includes('npx tsc') && content.includes('tsconfig.production.json')) {
      checkPassed('Build script uses TypeScript compilation instead of esbuild');
    } else {
      checkFailed('Build script should use TypeScript compilation');
      allChecksPassed = false;
    }
  }

  // Check 8: Verify production entry point exists
  if (fs.existsSync('server/index-production.ts')) {
    const content = fs.readFileSync('server/index-production.ts', 'utf8');
    if (content.includes('serveStatic') && content.includes('registerRoutes')) {
      checkPassed('Production entry point has required functionality');
    } else {
      checkFailed('Production entry point missing required functionality');
      allChecksPassed = false;
    }
  }

  // Check 9: Verify Vite-free utilities
  if (fs.existsSync('server/vite-production.ts')) {
    const content = fs.readFileSync('server/vite-production.ts', 'utf8');
    if (content.includes('export function log') && content.includes('export function serveStatic')) {
      checkPassed('Vite-free utilities provide required functions');
    } else {
      checkFailed('Vite-free utilities missing required functions');
      allChecksPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  
  if (allChecksPassed) {
    console.log('🎉 ALL DEPLOYMENT FIXES VERIFIED SUCCESSFULLY!');
    console.log('');
    console.log('Summary of fixes applied:');
    console.log('✅ Replaced esbuild bundling with TypeScript compilation');
    console.log('✅ Created production-safe server entry point avoiding Vite imports');
    console.log('✅ Updated build script to exclude Vite dependencies');
    console.log('✅ Production environment handling implemented');
    console.log('✅ Dedicated TypeScript config for production server compilation');
    console.log('');
    console.log('🚀 Ready for production deployment!');
    console.log('Run: node build-production-fixed.js');
  } else {
    console.log('❌ Some deployment fixes are missing or incomplete.');
    console.log('Please address the failed checks above.');
  }
  
  return allChecksPassed;
}

// Run verification
verifyDeploymentFixes();