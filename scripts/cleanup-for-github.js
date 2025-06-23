#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up project for GitHub upload...');

// Files and directories to remove
const filesToRemove = [
  '.replit',
  'replit.nix',
  '.config',
  'cookies.txt',
  'temp-backup.ts',
  'attached_assets',
  'uploads',
  'node_modules',
  'dist',
  '.git',
  '.env'
];

// Test files to remove
const testFiles = [
  'test-ai-matching.js',
  'test-custom-exam-demo.js',
  'test-dynamic-matching.js',
  'test-exam-workflow.js',
  'test-hiring-cafe.js',
  'test-job-title-filtering.js',
  'test-new-job-visibility.js',
  'test-scraping.js'
];

// Combine all files to remove
const allFilesToRemove = [...filesToRemove, ...testFiles];

let removedCount = 0;
let totalSize = 0;

function removeFileOrDir(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`📁 Removed directory: ${filePath}`);
      } else {
        const size = stats.size;
        fs.unlinkSync(filePath);
        totalSize += size;
        console.log(`📄 Removed file: ${filePath} (${(size / 1024).toFixed(1)}KB)`);
      }
      removedCount++;
    }
  } catch (error) {
    console.log(`⚠️  Could not remove ${filePath}: ${error.message}`);
  }
}

// Remove files
allFilesToRemove.forEach(removeFileOrDir);

// Create GitHub-ready .gitignore if it doesn't exist
const gitignoreContent = `# Dependencies
node_modules/
.pnp
.pnp.js

# Production
/build
/dist

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary files
*.tmp
*.temp

# Upload directories
uploads/
temp/

# Database
*.db
*.sqlite

# Testing
coverage/
.nyc_output/

# Replit specific (excluded from GitHub)
.replit
replit.nix
.config/
`;

if (!fs.existsSync('.gitignore')) {
  fs.writeFileSync('.gitignore', gitignoreContent);
  console.log('📄 Created .gitignore file');
}

console.log(`\n✅ Cleanup complete!`);
console.log(`📊 Removed ${removedCount} files/directories`);
console.log(`💾 Freed ${(totalSize / (1024 * 1024)).toFixed(1)}MB of space`);
console.log(`\n🚀 Project is now ready for GitHub upload!`);
console.log(`\nNext steps:`);
console.log(`1. Create new GitHub repository named 'recrutas'`);
console.log(`2. Upload all remaining files to the repository`);
console.log(`3. Deploy to Vercel/Railway/Render using the deployment guides`);