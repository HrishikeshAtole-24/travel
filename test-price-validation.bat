@echo off
echo ================================================
echo Flight Price Validation - Complete Test
echo ================================================
echo.

echo Step 1: Searching for flights...
echo.

curl -s "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1" > temp_flights.json

echo ✅ Flight search completed
echo.
echo Step 2: Extracting first flight offer...
echo.

REM Note: This is a manual step - you need to copy ONE complete offer from temp_flights.json
echo 📋 Please follow these steps:
echo.
echo 1. Open temp_flights.json in your editor
echo 2. Find the "data" array
echo 3. Copy ONE COMPLETE flight offer (the entire object)
echo 4. Use it in the price validation request below
echo.
echo ================================================
echo Example Price Validation Request:
echo ================================================
echo.
echo curl -X POST http://localhost:5000/api/flights/price \
echo   -H "Content-Type: application/json" \
echo   -d "{\"flightOffer\": PASTE_COMPLETE_OFFER_HERE}"
echo.
echo ================================================
echo.

echo 💡 Tip: The offer must include:
echo    - itineraries with segments
echo    - travelerPricings
echo    - price details
echo    - validatingAirlineCodes
echo.

pause
