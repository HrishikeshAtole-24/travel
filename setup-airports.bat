@echo off
echo 🚀 Setting up Airport Database...
echo.

cd backend

echo ✅ Installing/updating dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo.
echo ✅ Starting backend server to create tables...
start "Backend Server" cmd /k "npm start"

echo ⏳ Waiting 10 seconds for server to initialize...
timeout /t 10 /nobreak > nul

echo.
echo ✅ Seeding airport data...
node seed-airports.js
if errorlevel 1 (
    echo ❌ Airport seeding failed
    pause
    exit /b 1
)

echo.
echo 🎉 Airport setup complete!
echo.
echo 🌐 Backend: http://localhost:5000
echo 🛫 Airport API: http://localhost:5000/api/airports/search?q=mumbai
echo.
echo 📱 Now run the frontend:
echo    cd frontend
echo    npm run dev
echo.
pause