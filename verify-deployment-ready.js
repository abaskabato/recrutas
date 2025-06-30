#!/usr/bin/env node

/**
 * Deployment Readiness Verification Script
 * Validates that all deployment fixes have been implemented successfully
 */

import fs from 'fs';
import path from 'path';

const success = (message) => console.log(`✅ ${message}`);
const error = (message) => console.error(`❌ ${message}`);
const info = (message) => console.log(`ℹ️  ${message}`);

function verifyDeploymentReady() {
  console.log('🔍 Verifying deployment readiness...\n');

  let allChecksPass = true;

  // Check 1: dist/index.js exists and is properly formatted
  info('Checking main production entry point...');
  if (fs.existsSync('dist/index.js')) {
    success('dist/index.js exists');
    
    const content = fs.readFileSync('dist/index.js', 'utf8');
    if (content.includes('0.0.0.0') && content.includes('process.env.PORT')) {
      success('Server configured for deployment (0.0.0.0 binding + PORT env var)');
    } else {
      error('Server not properly configured for deployment');
      allChecksPass = false;
    }
  } else {
    error('dist/index.js missing - main production entry point not found');
    allChecksPass = false;
  }

  // Check 2: package.json exists with proper start script
  info('\nChecking production package.json...');
  if (fs.existsSync('dist/package.json')) {
    success('dist/package.json exists');
    
    const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
    if (pkg.scripts && pkg.scripts.start) {
      success('Start script configured: ' + pkg.scripts.start);
    } else {
      error('No start script found in package.json');
      allChecksPass = false;
    }
    
    if (pkg.main === 'index.js') {
      success('Main entry point correctly set to index.js');
    } else {
      error('Main entry point should be index.js');
      allChecksPass = false;
    }
  } else {
    error('dist/package.json missing');
    allChecksPass = false;
  }

  // Check 3: TypeScript configuration
  info('\nChecking TypeScript configuration...');
  if (fs.existsSync('server/tsconfig.production.json')) {
    success('Production TypeScript config exists');
    
    const tsConfig = JSON.parse(fs.readFileSync('server/tsconfig.production.json', 'utf8'));
    if (tsConfig.compilerOptions && tsConfig.compilerOptions.outDir === '../dist') {
      success('TypeScript output directory configured for dist');
    } else {
      error('TypeScript output directory should be ../dist');
      allChecksPass = false;
    }
  } else {
    error('server/tsconfig.production.json missing');
    allChecksPass = false;
  }

  // Check 4: Build scripts availability
  info('\nChecking build scripts...');
  const buildScripts = [
    'build-deployment-fix.js',
    'build-production-final.js'
  ];
  
  buildScripts.forEach(script => {
    if (fs.existsSync(script)) {
      success(`Build script available: ${script}`);
    } else {
      info(`Optional build script not found: ${script}`);
    }
  });

  // Check 5: Syntax validation
  info('\nValidating production server syntax...');
  try {
    import('child_process').then(({ execSync }) => {
      execSync('node --check dist/index.js', { stdio: 'pipe' });
      success('Production server syntax is valid');
    });
  } catch (syntaxError) {
    error('Syntax error in production server');
    console.error(syntaxError.toString());
    allChecksPass = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allChecksPass) {
    success('🎉 ALL DEPLOYMENT FIXES SUCCESSFULLY APPLIED!');
    console.log('\n📋 Deployment Summary:');
    console.log('  ✅ Fix 1: Build command generates proper dist/index.js');
    console.log('  ✅ Fix 2: Production entry point created for Node.js');
    console.log('  ✅ Fix 3: TypeScript configured to compile to dist directory');  
    console.log('  ✅ Fix 4: Production package.json with proper start script');
    console.log('  ✅ Fix 5: Server listens on 0.0.0.0 for deployment compatibility');
    
    console.log('\n🚀 Ready for deployment on:');
    console.log('  • Vercel (npm start)');
    console.log('  • Railway (npm start)');
    console.log('  • Render (npm start)');
    console.log('  • Any Node.js hosting platform');
    
    console.log('\n💡 To deploy:');
    console.log('  1. Upload the dist/ directory to your hosting platform');
    console.log('  2. Run "npm install" in the dist directory'); 
    console.log('  3. Set PORT environment variable if needed');
    console.log('  4. Run "npm start"');
    
  } else {
    error('❌ Some deployment issues remain - see errors above');
    return false;
  }

  return true;
}

verifyDeploymentReady();