@echo off
chcp 65001 >nul
title FiyatRadar — Tüm Serverlar
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   📡 FiyatRadar                          ║
echo  ║   Market Fiyat Karsilastirma             ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  [1] Backend API Server  → http://localhost:3001
echo  [2] Frontend Dev Server → http://localhost:5173
echo.
echo  ─────────────────────────────────────────────
echo.

cd /d "%~dp0"

:: Start backend in a new window
start "FiyatRadar API" cmd /k "cd /d %~dp0server && title FiyatRadar API Server && echo. && echo  📡 API Server baslatiliyor... && echo. && node index.js"

:: Wait 2 seconds for backend to start
timeout /t 2 /nobreak >nul

:: Start frontend
echo  🌐 Frontend baslatiliyor...
echo  Tarayicida acmak icin: http://localhost:5173
echo.
npm run dev

pause
