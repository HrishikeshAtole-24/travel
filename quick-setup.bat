@echo off
echo 🚀 Starting Travel App - Quick Setup
echo.

echo 📍 Step 1: Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm start"

echo ⏳ Waiting 8 seconds for server to start...
timeout /t 8 /nobreak > nul

echo.
echo 📍 Step 2: Testing airport API...
curl -s "http://localhost:5000/api/airports/search?q=del&limit=5" || echo "❌ API not responding yet"

echo.
echo 📍 Step 3: Seeding Airport Data...
node seed-airports.js

echo.
echo 📍 Step 4: Testing API again...
curl -s "http://localhost:5000/api/airports/search?q=del&limit=5"

echo.
echo 📍 Step 5: Starting Frontend...
cd ..\frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Setup Complete!
echo 🌐 Frontend: http://localhost:3000
echo 🛫 Backend: http://localhost:5000
echo.
pause