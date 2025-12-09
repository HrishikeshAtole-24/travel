# 🧪 API Testing Guide

Complete testing guide for all Amadeus APIs implemented in the travel booking system.

## 📋 Prerequisites

1. **Start the backend server**:
```bash
cd backend
npm start
```

2. **Base URL**: `http://localhost:3000/api`

3. **Tools**: Use Postman, Thunder Client (VS Code), or curl

---

## 🔥 Core Flight APIs

### 1. Search Flights
```http
GET http://localhost:3000/api/flights/search?origin=BOM&destination=DEL&departureDate=2024-06-15&adults=1
```

**Query Parameters**:
- `origin` (required): Origin IATA code
- `destination` (required): Destination IATA code
- `departureDate` (required): Departure date (YYYY-MM-DD)
- `returnDate` (optional): Return date for round-trip
- `adults` (required): Number of adults (default: 1)
- `children` (optional): Number of children
- `infants` (optional): Number of infants
- `travelClass` (optional): ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
- `nonStop` (optional): true/false
- `maxPrice` (optional): Maximum price filter
- `sortBy` (optional): price, duration, departure, arrival
- `sortOrder` (optional): asc, desc

**Example Response**:
```json
{
  "success": true,
  "message": "Flight search completed",
  "data": [
    {
      "offerId": "1",
      "source": "amadeus",
      "airline": {
        "code": "AI",
        "name": "Air India"
      },
      "price": {
        "total": 5000,
        "currency": "USD",
        "perPerson": 5000
      },
      "outbound": {
        "departure": {
          "airport": "BOM",
          "city": "Mumbai",
          "time": "2024-06-15T10:00:00"
        },
        "arrival": {
          "airport": "DEL",
          "city": "Delhi",
          "time": "2024-06-15T12:10:00"
        },
        "duration": "2h 10m",
        "stops": 0
      }
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 50,
    "suppliers": {
      "amadeus": { "count": 50, "status": "success" }
    }
  }
}
```

---

### 2. Get Flight Price (Validation)
```http
POST http://localhost:3000/api/flights/price
Content-Type: application/json

{
  "flightOffer": {
    // Copy flight offer object from search results
  }
}
```

**Use Case**: Validate and get final price before booking

---

### 3. Create Booking
```http
POST http://localhost:3000/api/flights/book
Content-Type: application/json

{
  "flightOffer": {
    // Priced flight offer from step 2
  },
  "travelers": [
    {
      "id": "1",
      "dateOfBirth": "1990-05-20",
      "name": {
        "firstName": "JOHN",
        "lastName": "DOE"
      },
      "gender": "MALE",
      "contact": {
        "emailAddress": "john.doe@example.com",
        "phones": [{
          "deviceType": "MOBILE",
          "countryCallingCode": "91",
          "number": "9876543210"
        }]
      },
      "documents": [{
        "documentType": "PASSPORT",
        "number": "L1234567",
        "expiryDate": "2030-12-31",
        "issuanceCountry": "IN",
        "nationality": "IN",
        "holder": true
      }]
    }
  ],
  "contacts": {
    "emailAddress": "john.doe@example.com",
    "phones": [{
      "deviceType": "MOBILE",
      "countryCallingCode": "91",
      "number": "9876543210"
    }]
  }
}
```

---

## 🌍 Reference Data APIs

### 4. Location Search (Autocomplete)
```http
GET http://localhost:3000/api/reference/locations/search?q=mumbai&type=AIRPORT
```

**Query Parameters**:
- `q` (required): Search keyword (min 3 characters)
- `type` (optional): AIRPORT, CITY, or AIRPORT,CITY (default: AIRPORT,CITY)

**Example Response**:
```json
{
  "success": true,
  "message": "Found 5 locations",
  "data": [
    {
      "code": "BOM",
      "name": "Chhatrapati Shivaji Maharaj International Airport",
      "city": "Mumbai",
      "country": "IN",
      "type": "AIRPORT",
      "detailedName": "Mumbai/IN: Chhatrapati Shivaji Maharaj"
    }
  ]
}
```

**Use Case**: Airport/city autocomplete in search form

---

### 5. Get Airport Info
```http
GET http://localhost:3000/api/reference/airports/BOM
```

**Example Response**:
```json
{
  "success": true,
  "message": "Airport information retrieved",
  "data": {
    "code": "BOM",
    "name": "Chhatrapati Shivaji Maharaj International Airport",
    "city": "Mumbai",
    "cityCode": "BOM",
    "country": "India",
    "countryCode": "IN",
    "timezone": "+05:30",
    "location": {
      "latitude": 19.0896,
      "longitude": 72.8656
    }
  }
}
```

---

### 6. Get Airports by City
```http
GET http://localhost:3000/api/reference/cities/LON/airports
```

**Example Response**:
```json
{
  "success": true,
  "message": "Found 6 airports",
  "data": {
    "city": {
      "code": "LON",
      "name": "London",
      "country": "GB"
    },
    "airports": [
      {
        "code": "LHR",
        "name": "Heathrow Airport",
        "type": "AIRPORT",
        "distance": 0,
        "distanceUnit": "KM"
      },
      {
        "code": "LGW",
        "name": "Gatwick Airport",
        "type": "AIRPORT",
        "distance": 45,
        "distanceUnit": "KM"
      }
    ]
  }
}
```

**Use Case**: Show all airports when user searches for a city

---

### 7. Get Airline Info
```http
GET http://localhost:3000/api/reference/airlines/AI
```

**Example Response**:
```json
{
  "success": true,
  "message": "Airline information retrieved",
  "data": {
    "code": "AI",
    "icaoCode": "AIC",
    "name": "Air India",
    "commonName": "Air India",
    "type": "AIRLINE"
  }
}
```

---

### 8. Get Airline Routes
```http
GET http://localhost:3000/api/reference/airlines/AI/routes?date=2024-06-15
```

**Example Response**:
```json
{
  "success": true,
  "message": "Found 45 routes",
  "data": [
    {
      "destination": "DEL",
      "type": "DOMESTIC"
    },
    {
      "destination": "LHR",
      "type": "INTERNATIONAL"
    }
  ]
}
```

---

## 📊 Analytics APIs

### 9. Get Cheapest Dates (Price Calendar)
```http
GET http://localhost:3000/api/analytics/cheapest-dates?origin=BOM&destination=DEL&departureDate=2024-06-01&duration=7
```

**Query Parameters**:
- `origin` (required): Origin IATA code
- `destination` (required): Destination IATA code
- `departureDate` (optional): Starting search date
- `duration` (optional): Trip duration in days
- `oneWay` (optional): true/false
- `nonStop` (optional): true/false
- `maxPrice` (optional): Maximum price filter

**Example Response**:
```json
{
  "success": true,
  "message": "Found 30 date options",
  "data": [
    {
      "departureDate": "2024-06-05",
      "returnDate": "2024-06-12",
      "price": {
        "total": "4500.00",
        "currency": "USD"
      }
    },
    {
      "departureDate": "2024-06-08",
      "returnDate": "2024-06-15",
      "price": {
        "total": "4800.00",
        "currency": "USD"
      }
    }
  ]
}
```

**Use Case**: Show "Flexible Dates" calendar with prices

---

### 10. Get Flight Destinations (Travel Inspiration)
```http
GET http://localhost:3000/api/analytics/destinations?origin=BOM&departureDate=2024-06-15&maxPrice=50000
```

**Example Response**:
```json
{
  "success": true,
  "message": "Found 25 destinations",
  "data": [
    {
      "destination": "DEL",
      "departureDate": "2024-06-15",
      "returnDate": "2024-06-22",
      "price": {
        "total": "5000.00",
        "currency": "USD"
      }
    },
    {
      "destination": "GOI",
      "departureDate": "2024-06-15",
      "returnDate": "2024-06-22",
      "price": {
        "total": "8000.00",
        "currency": "USD"
      }
    }
  ]
}
```

**Use Case**: "Where can I fly?" or "Explore destinations" page

---

### 11. Get Popular Routes
```http
GET http://localhost:3000/api/analytics/popular-routes?from=BOM&limit=10
```

**Example Response**:
```json
{
  "success": true,
  "message": "Found 10 popular routes",
  "data": [
    {
      "from": "BOM",
      "to": "DEL",
      "startingPrice": {
        "amount": "5000.00",
        "currency": "USD"
      }
    },
    {
      "from": "BOM",
      "to": "BLR",
      "startingPrice": {
        "amount": "6500.00",
        "currency": "USD"
      }
    }
  ]
}
```

---

## 🛠️ Utility APIs

### 12. API Health Check
```http
GET http://localhost:3000/api/health
```

**Example Response**:
```json
{
  "status": "OK",
  "message": "Travel Booking API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "endpoints": {
    "flights": "/api/flights",
    "reference": "/api/reference",
    "analytics": "/api/analytics"
  }
}
```

---

### 13. Analytics Health Check
```http
GET http://localhost:3000/api/analytics/health
```

**Example Response**:
```json
{
  "success": true,
  "message": "Analytics API health check",
  "data": {
    "status": "healthy",
    "tokenValid": true,
    "message": "Amadeus API connection successful"
  }
}
```

---

## 🧪 Testing Workflow

### Complete Flight Booking Flow

1. **Search Locations** (for autocomplete):
```bash
curl "http://localhost:3000/api/reference/locations/search?q=mum&type=AIRPORT"
```

2. **Search Flights**:
```bash
curl "http://localhost:3000/api/flights/search?origin=BOM&destination=DEL&departureDate=2024-06-15&adults=1"
```

3. **Get Flight Price** (validate):
```bash
curl -X POST http://localhost:3000/api/flights/price \
  -H "Content-Type: application/json" \
  -d '{"flightOffer": {...}}'
```

4. **Create Booking**:
```bash
curl -X POST http://localhost:3000/api/flights/book \
  -H "Content-Type: application/json" \
  -d '{
    "flightOffer": {...},
    "travelers": [...],
    "contacts": {...}
  }'
```

---

## 🔍 Quick Test Commands

### Test All Reference APIs
```bash
# Airport autocomplete
curl "http://localhost:3000/api/reference/locations/search?q=del"

# Airport info
curl "http://localhost:3000/api/reference/airports/DEL"

# City airports
curl "http://localhost:3000/api/reference/cities/NYC/airports"

# Airline info
curl "http://localhost:3000/api/reference/airlines/EK"

# Airline routes
curl "http://localhost:3000/api/reference/airlines/AI/routes"
```

### Test All Analytics APIs
```bash
# Cheapest dates
curl "http://localhost:3000/api/analytics/cheapest-dates?origin=BOM&destination=DEL&departureDate=2024-06-01"

# Destinations inspiration
curl "http://localhost:3000/api/analytics/destinations?origin=BOM&maxPrice=50000"

# Popular routes
curl "http://localhost:3000/api/analytics/popular-routes?from=BOM&limit=5"
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Keyword must be at least 3 characters"
**Solution**: Location search requires minimum 3 characters
```bash
# ❌ Wrong
curl "http://localhost:3000/api/reference/locations/search?q=bo"

# ✅ Correct
curl "http://localhost:3000/api/reference/locations/search?q=bom"
```

### Issue 2: "Invalid IATA code"
**Solution**: Ensure IATA codes are exactly 3 characters (airports) or 2 characters (airlines)
```bash
# ❌ Wrong
curl "http://localhost:3000/api/reference/airports/BOMB"

# ✅ Correct
curl "http://localhost:3000/api/reference/airports/BOM"
```

### Issue 3: No results from Amadeus
**Solution**: Check Amadeus test environment credentials in `.env`
```env
AMADEUS_API_KEY=your_test_api_key
AMADEUS_API_SECRET=your_test_api_secret
AMADEUS_API_URL=https://test.api.amadeus.com
```

---

## 📊 Postman Collection

Import this JSON into Postman for quick testing:

```json
{
  "info": {
    "name": "Travel Booking API - Complete",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Flights",
      "item": [
        {
          "name": "Search Flights",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/flights/search?origin=BOM&destination=DEL&departureDate=2024-06-15&adults=1"
          }
        }
      ]
    },
    {
      "name": "Reference",
      "item": [
        {
          "name": "Search Locations",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/reference/locations/search?q=mumbai&type=AIRPORT"
          }
        },
        {
          "name": "Get Airport Info",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/reference/airports/BOM"
          }
        }
      ]
    },
    {
      "name": "Analytics",
      "item": [
        {
          "name": "Cheapest Dates",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/analytics/cheapest-dates?origin=BOM&destination=DEL&departureDate=2024-06-01&duration=7"
          }
        },
        {
          "name": "Destinations",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/analytics/destinations?origin=BOM&maxPrice=50000"
          }
        }
      ]
    }
  ]
}
```

---

## ✅ Testing Checklist

- [ ] Health check endpoint works
- [ ] Flight search returns results
- [ ] Location autocomplete works
- [ ] Airport info retrieval works
- [ ] City airports lookup works
- [ ] Airline info retrieval works
- [ ] Cheapest dates search works
- [ ] Destinations inspiration works
- [ ] Popular routes works
- [ ] Error handling (invalid codes, missing params)
- [ ] Token refresh (wait 30 mins and test)

---

**All 13 Amadeus APIs ready for testing! 🎉**
