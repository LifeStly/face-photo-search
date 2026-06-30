@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Face Photo Search

echo ============================================
echo   Face Photo Search
echo ============================================
echo.

REM 1) Check Node.js
where node >nul 2>&1
if errorlevel 1 (
  echo [!] Node.js not found
  echo.
  echo Please install Node.js version 20 or higher.
  echo Opening download page...
  start https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Node.js: !NODE_VER!
echo.

REM 2) Install deps if missing
if not exist "node_modules" (
  echo [+] First run: installing dependencies ^(this may take 1-3 minutes^)...
  call npm install
  if errorlevel 1 ( echo [!] npm install failed & pause & exit /b 1 )
  echo.
)

REM 3) Download face-api models if missing
if not exist "models\face_recognition_model.bin" (
  echo [+] Downloading face-api models ^(~30MB, one time only^)...
  call npm run models
  if errorlevel 1 ( echo [!] Model download failed & pause & exit /b 1 )
  echo.
)

REM 4) Build production if not built
if not exist "apps\web\.next\BUILD_ID" (
  echo [+] Building production bundle ^(first run, ~1-2 minutes^)...
  call npm run build
  if errorlevel 1 ( echo [!] Build failed & pause & exit /b 1 )
  echo.
)

REM 5) Start server in new window + open browser
echo [+] Starting server at http://localhost:3000
echo     Close this window to stop the app.
echo.

REM Open browser after a short delay
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"

call npm run start
endlocal
