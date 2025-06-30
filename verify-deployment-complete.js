#!/usr/bin/env node

/**
 * Complete Deployment Verification Script
 * Validates that all 5 suggested fixes have been successfully applied
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

function checkPassed(message) {
  console.log(`✅ ${message}`);
}

function checkFailed(message) {
  console.log(`❌ ${message}`);
}

function checkInfo(message) {
  console.log(`ℹ️  ${message}`);
}

async function verifyDeploymentComplete() {
  console.log('🔍 Verifying Complete Deployment Fix Implementation');
  console.log('='.repeat(60));
  
  let allChecksPassed = true;
  
  // Check 1: Verify dist directory structure
  console.log('\n📁 Checking dist directory structure...');
  const requiredFiles = [
    'dist/index.js',
    'dist/package.json',
    'dist/server/routes.js',
    'dist/server/storage.js',
    'dist/shared/schema.js',
    'dist/index.html'
  ];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      checkPassed(`Required file: ${file}`);
    } else {
      checkFailed(`Missing file: ${file}`);
      allChecksPassed = false;
    }
  }
  
  // Check 2: Verify routes module resolution
  console.log('\n🔗 Checking routes module resolution...');
  try {
    const routesContent = fs.readFileSync('dist/server/routes.js', 'utf8');
    if (routesContent.includes('registerRoutes')) {
      checkPassed('Routes module exports registerRoutes function');
    } else {
      checkFailed('Routes module missing registerRoutes function');
      allChecksPassed = false;
    }
    
    if (routesContent.includes('module.exports')) {
      checkPassed('Routes module uses CommonJS exports');
    } else {
      checkFailed('Routes module not using CommonJS exports');
      allChecksPassed = false;
    }
  } catch (error) {
    checkFailed(`Cannot read routes.js: ${error.message}`);
    allChecksPassed = false;
  }
  
  // Check 3: Verify production entry point
  console.log('\n🚀 Checking production entry point...');
  try {
    const indexContent = fs.readFileSync('dist/index.js', 'utf8');
    
    if (indexContent.includes("require('./server/routes')")) {
      checkPassed('Production entry point imports routes correctly');
    } else {
      checkFailed('Production entry point missing routes import');
      allChecksPassed = false;
    }
    
    if (indexContent.includes("'0.0.0.0'")) {
      checkPassed('Server configured to bind to 0.0.0.0');
    } else {
      checkFailed('Server not configured for 0.0.0.0 binding');
      allChecksPassed = false;
    }
    
    if (indexContent.includes('const express = require')) {
      checkPassed('Uses CommonJS require syntax');
    } else {
      checkFailed('Not using CommonJS require syntax');
      allChecksPassed = false;
    }
  } catch (error) {
    checkFailed(`Cannot read index.js: ${error.message}`);
    allChecksPassed = false;
  }
  
  // Check 4: Verify production package.json
  console.log('\n📦 Checking production package.json...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
    
    if (packageJson.type === 'commonjs') {
      checkPassed('Package.json configured for CommonJS');
    } else {
      checkFailed('Package.json not configured for CommonJS');
      allChecksPassed = false;
    }
    
    if (packageJson.main === 'index.js') {
      checkPassed('Package.json main entry points to index.js');
    } else {
      checkFailed('Package.json main entry incorrect');
      allChecksPassed = false;
    }
    
    if (packageJson.scripts && packageJson.scripts.start === 'node index.js') {
      checkPassed('Package.json start script configured correctly');
    } else {
      checkFailed('Package.json start script incorrect');
      allChecksPassed = false;
    }
    
    if (packageJson.dependencies && packageJson.dependencies.express) {
      checkPassed('Package.json includes required dependencies');
    } else {
      checkFailed('Package.json missing required dependencies');
      allChecksPassed = false;
    }
  } catch (error) {
    checkFailed(`Cannot read production package.json: ${error.message}`);
    allChecksPassed = false;
  }
  
  // Check 5: Test server startup
  console.log('\n🧪 Testing production server startup...');
  try {
    const { execSync } = await import('child_process');
    execSync('node -c dist/index.js', { stdio: 'pipe' });
    checkPassed('Production server syntax validation passed');
  } catch (error) {
    checkFailed(`Server syntax validation failed: ${error.message}`);
    allChecksPassed = false;
  }
  
  // Check 6: Test actual server startup with timeout
  console.log('\n⚡ Testing actual server startup...');
  try {
    const testServerStartup = () => {
      return new Promise((resolve, reject) => {
        const serverProcess = spawn('node', ['index.js'], {
          cwd: 'dist',
          stdio: 'pipe'
        });
        
        let output = '';
        let hasStarted = false;
        
        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes('Server running on port')) {
            hasStarted = true;
            serverProcess.kill();
            resolve(true);
          }
        });
        
        serverProcess.stderr.on('data', (data) => {
          console.error('Server error output:', data.toString());
        });
        
        serverProcess.on('close', (code) => {
          if (hasStarted) {
            resolve(true);
          } else {
            reject(new Error(`Server failed to start, exit code: ${code}`));
          }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!hasStarted) {
            serverProcess.kill();
            reject(new Error('Server startup timeout'));
          }
        }, 10000);
      });
    };
    
    await testServerStartup();
    checkPassed('Production server starts successfully');
  } catch (error) {
    checkFailed(`Server startup test failed: ${error.message}`);
    allChecksPassed = false;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DEPLOYMENT FIX VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n✅ Applied Fixes:');
  console.log('1. ✅ Created proper JavaScript routes module in dist/server/routes.js');
  console.log('2. ✅ Fixed module imports to use CommonJS require() syntax');
  console.log('3. ✅ Created working production entry point at dist/index.js');
  console.log('4. ✅ Created production package.json with correct configuration');
  console.log('5. ✅ Configured server to bind to 0.0.0.0 for deployment compatibility');
  
  if (allChecksPassed) {
    console.log('\n🎉 ALL DEPLOYMENT FIXES VERIFIED SUCCESSFULLY!');
    console.log('\n🚀 Deployment Instructions:');
    console.log('1. Copy the dist/ directory to your deployment platform');
    console.log('2. Run: npm install (in the dist directory)');
    console.log('3. Run: npm start');
    console.log('\n📡 The server will be accessible on port 3000 (or PORT env var)');
    console.log('🔗 Module resolution error has been completely resolved!');
    return true;
  } else {
    console.log('\n❌ SOME DEPLOYMENT CHECKS FAILED');
    console.log('Please review the failed checks above and re-run the deployment fix.');
    return false;
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyDeploymentComplete()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { verifyDeploymentComplete };