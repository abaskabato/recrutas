@echo off
echo Cleaning up Recrutas project for GitHub...

echo Removing large directories...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "uploads" rmdir /s /q "uploads"
if exist "attached_assets" rmdir /s /q "attached_assets"
if exist ".git" rmdir /s /q ".git"
if exist "dist" rmdir /s /q "dist"

echo Removing Replit configuration files...
if exist ".replit" del ".replit"
if exist "replit.nix" del "replit.nix"
if exist ".config" rmdir /s /q ".config"

echo Removing temporary files...
if exist "cookies.txt" del "cookies.txt"
if exist "temp-backup.ts" del "temp-backup.ts"

echo Removing test files...
if exist "test-*.js" del "test-*.js"

echo Cleanup complete! Project is now ready for GitHub upload.
echo File size should now be under GitHub's upload limit.
pause