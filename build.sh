#!/bin/bash
set -e

echo "Building frontend..."
npx vite build

echo "Building backend..."
npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:vite --external:./vite.ts

echo "Creating entry point..."
echo 'import("./production.js");' > dist/index.js

echo "Build complete!"