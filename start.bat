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
  echo [!] Node.js ไม่พบ
  echo.
  echo กรุณาติดตั้ง Node.js เวอร์ชัน 20 ขึ้นไป
  echo เปิดหน้าดาวน์โหลด...
  start https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Node.js: !NODE_VER!
echo.

REM 2) Install deps if missing
if not exist "node_modules" (
  echo [+] ครั้งแรก: ติดตั้ง dependencies ^(ใช้เวลา 1-3 นาที^)...
  call npm install
  if errorlevel 1 ( echo [!] npm install ล้มเหลว & pause & exit /b 1 )
  echo.
)

REM 3) Download face-api models if missing
if not exist "models\face_recognition_model.bin" (
  echo [+] ดาวน์โหลด face-api models ^(~30MB ครั้งเดียว^)...
  call npm run models
  if errorlevel 1 ( echo [!] download models ล้มเหลว & pause & exit /b 1 )
  echo.
)

REM 4) Build production if not built
if not exist "apps\web\.next\BUILD_ID" (
  echo [+] Build production ^(ครั้งแรก ใช้เวลา 1-2 นาที^)...
  call npm run build
  if errorlevel 1 ( echo [!] build ล้มเหลว & pause & exit /b 1 )
  echo.
)

REM 5) Start server in new window + open browser
echo [+] เปิดเซิร์ฟเวอร์ที่ http://localhost:3000
echo     ปิดโปรแกรมโดยปิดหน้าต่าง terminal
echo.

REM Open browser after a short delay
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"

call npm run start
endlocal
