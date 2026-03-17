@echo off
TITLE FiyatRadar Daily Pipeline
cd /d "%~dp0"

echo ============================================================
echo FiyatRadar Otomatik Guncelleme Basliyor...
echo Tarih: %date% %time%
echo ============================================================

:: 1. Veri Cekme ve Zenginlestirme (Sonsuz Dongu)
node master-orchestrator.js

echo ============================================================
echo Islem Tamamlandi!
echo Log dosyalarini kontrol edebilirsiniz.
echo ============================================================
pause
