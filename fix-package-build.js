#!/usr/bin/env node

/**
 * Fix Package Build Script
 * Updates package.json to use the working deployment fix instead of the problematic build process
 */

import fs from 'fs';

function fixPackageBuild() {
  try {
    console.log('🔧 Fixing package.json build script...');
    
    // Read current package.json
    const packagePath = 'package.json';
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    // Update the build script to use our working deployment fix
    packageJson.scripts.build = 'node build-deployment-final-fix.js';
    
    // Ensure start script uses the correct path
    packageJson.scripts.start = 'NODE_ENV=production node dist/index.js';
    
    // Write the updated package.json back
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    
    console.log('✅ Updated package.json build script to use working deployment fix');
    console.log('📋 Build script changed to: node build-deployment-final-fix.js');
    console.log('📋 Start script confirmed as: NODE_ENV=production node dist/index.js');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fix package.json:', error.message);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = fixPackageBuild();
  process.exit(success ? 0 : 1);
}

export { fixPackageBuild };