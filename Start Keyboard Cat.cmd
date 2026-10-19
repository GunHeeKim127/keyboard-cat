@echo off
setlocal
cd /d "%~dp0"
if exist "release\win-unpacked\Keyboard Cat.exe" (
  start "" "release\win-unpacked\Keyboard Cat.exe"
  exit /b 0
)
echo Build the app first: npm install ^&^& npm run dist
pause
