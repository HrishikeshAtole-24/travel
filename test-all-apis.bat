@echo off
echo ===============================================
echo Travel Booking API - Complete Test Suite
echo ===============================================
echo.

set BASE_URL=http://localhost:5000/api

echo [1/20] Health Check
curl -s %BASE_URL%/health
echo.
echo.

echo [2/20] Analytics Health
curl -s %BASE_URL%/analytics/health
echo.
echo.

echo [3/20] Basic Flight Search (BOM to DXB)
curl -s "%BASE_URL%/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
echo.
echo.

echo [4/20] Round Trip Search (DEL to LHR)
curl -s "%BASE_URL%/flights/search?origin=DEL&destination=LHR&departureDate=2025-12-25&returnDate=2026-01-05&adults=2"
echo.
echo.

echo [5/20] Non-Stop Flights Only
curl -s "%BASE_URL%/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1&nonStopOnly=true"
echo.
echo.

echo [6/20] Business Class Search
curl -s "%BASE_URL%/flights/search?origin=BOM&destination=LHR&departureDate=2025-12-25&adults=2&cabin=BUSINESS"
echo.
echo.

echo [7/20] Location Search - Mumbai
curl -s "%BASE_URL%/reference/locations/search?q=mumbai&type=AIRPORT"
echo.
echo.

echo [8/20] Location Search - Delhi
curl -s "%BASE_URL%/reference/locations/search?q=delhi&type=AIRPORT,CITY"
echo.
echo.

echo [9/20] Airport Info - BOM
curl -s "%BASE_URL%/reference/airports/BOM"
echo.
echo.

echo [10/20] Airport Info - DEL
curl -s "%BASE_URL%/reference/airports/DEL"
echo.
echo.

echo [11/20] City Airports - LON
curl -s "%BASE_URL%/reference/cities/LON/airports"
echo.
echo.

echo [12/20] City Airports - NYC
curl -s "%BASE_URL%/reference/cities/NYC/airports"
echo.
echo.

echo [13/20] Airline Info - Emirates
curl -s "%BASE_URL%/reference/airlines/EK"
echo.
echo.

echo [14/20] Airline Info - Air India
curl -s "%BASE_URL%/reference/airlines/AI"
echo.
echo.

echo [15/20] Airline Routes - Air India
curl -s "%BASE_URL%/reference/airlines/AI/routes"
echo.
echo.

echo [16/20] Cheapest Dates - BOM to DXB
curl -s "%BASE_URL%/analytics/cheapest-dates?origin=BOM&destination=DXB&departureDate=2025-12-01&duration=7"
echo.
echo.

echo [17/20] Cheapest Dates - DEL to LHR
curl -s "%BASE_URL%/analytics/cheapest-dates?origin=DEL&destination=LHR&departureDate=2025-12-15"
echo.
echo.

echo [18/20] Destinations from BOM
curl -s "%BASE_URL%/analytics/destinations?origin=BOM&departureDate=2025-12-15&maxPrice=50000"
echo.
echo.

echo [19/20] Destinations from DEL
curl -s "%BASE_URL%/analytics/destinations?origin=DEL&oneWay=true"
echo.
echo.

echo [20/20] Popular Routes from BOM
curl -s "%BASE_URL%/analytics/popular-routes?from=BOM&limit=10"
echo.
echo.

echo ===============================================
echo Test Suite Complete!
echo ===============================================
echo.
echo Note: Some Analytics APIs may return errors
echo in Amadeus TEST environment (not production)
echo.
pause
