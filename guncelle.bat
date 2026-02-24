@echo off
chcp 65001 >nul
title FiyatRadar — Veri Guncelleme
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   📡 FiyatRadar Veri Guncelleme          ║
echo  ║   Market Fiyatlarini Cekiyor...          ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Bu islem birkaç dakika sürebilir.
echo  Puppeteer tarayici acilir ve marketlerdeki
echo  fiyatlari otomatik olarak toplar.
echo.
echo  ─────────────────────────────────────────────
echo.

cd /d "%~dp0server"
node run-scrape.js

echo.
echo  ─────────────────────────────────────────────
echo  Islem tamamlandi. Kapatmak icin bir tusa basin.
pause
