@echo off
echo ═══════════════════════════════════════════════════════════════
echo   AIRPORT DATA IMPORTER - ALL AIRPORTS WORLDWIDE
echo   Source: OurAirports.com (9,000+ commercial airports)
echo ═══════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0backend"

echo [1/2] Installing dependencies...
call npm install csv-parse --save
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/2] Running airport importer...
echo.
node scripts/import-all-airports.js %*

echo.
echo ═══════════════════════════════════════════════════════════════
echo   DONE! Your database now has ALL airports worldwide.
echo.
echo   Test it:
echo   GET http://localhost:3000/api/airports/search?q=new
echo   GET http://localhost:3000/api/airports/stats
echo ═══════════════════════════════════════════════════════════════
pause
