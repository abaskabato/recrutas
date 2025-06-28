#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Copy dist/public to server/public for deployment
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source directory ${src} does not exist`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const distPath = path.join(process.cwd(), 'dist', 'public');
const serverPublicPath = path.join(process.cwd(), 'server', 'public');

console.log('Copying build files from dist/public to server/public...');
copyDirectory(distPath, serverPublicPath);
console.log('Build files copied successfully!');