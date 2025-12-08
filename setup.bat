@echo off
echo ===================================
echo Travel Booking Platform - Setup
echo ===================================
echo.

echo [1/4] Setting up Backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed.
)

if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit backend/.env with your configurations!
) else (
    echo .env file already exists.
)

cd ..

echo.
echo ===================================
echo Setup Complete!
echo ===================================
echo.
echo Next Steps:
echo 1. Edit backend/.env with your configurations
echo 2. Setup MySQL database: CREATE DATABASE travel_booking;
echo 3. Start Redis server: redis-server
echo 4. Run backend: cd backend && npm run dev
echo.
echo Frontend setup coming soon!
echo.
pause
