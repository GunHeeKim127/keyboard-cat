@echo off
setlocal
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" if exist "dist-electron\main.js" if exist "dist\index.html" (
  start "" "node_modules\electron\dist\electron.exe" .
  exit /b 0
)
if exist "release\windows-1.3.21\win-unpacked\Keyboard Cat.exe" (
  start "" "release\windows-1.3.21\win-unpacked\Keyboard Cat.exe"
  exit /b 0
)

echo Build the app first: npm install ^&^& npm run build
pause
