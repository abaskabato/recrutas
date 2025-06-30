#!/bin/bash

# Project cleanup script for GitHub push
echo "Cleaning up project for GitHub..."

# Remove development documentation files (keeping essential ones)
rm -f DEVELOPMENT_TICKETS.md
rm -f GITHUB_RELEASE_SUMMARY.md  
rm -f OPEN_SOURCE_PREPARATION.md
rm -f OPEN_SOURCE_PREP.md
rm -f SECURITY_AUDIT.md
rm -f test-application-intelligence.md

# Remove build artifacts
rm -rf dist/

# Remove temporary files
rm -f typescript-fixes.patch
rm -f test-*.js

# Remove deployment config files (keep essential ones)
rm -f railway.json
rm -f render.yaml
rm -f netlify.toml
rm -f app.json

echo "Cleanup completed!"
echo ""
echo "Kept essential files:"
echo "- README.md (main documentation)"
echo "- CONTRIBUTING.md (for contributors)"
echo "- LICENSE (legal)"
echo "- SECURITY.md (security policy)"
echo "- package.json (dependencies)"
echo "- All source code (client/, server/, shared/)"
echo ""
echo "Now run: git add . && git commit -m 'Clean up project for production release' && git push origin main"