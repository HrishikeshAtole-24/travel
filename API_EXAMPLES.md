# 📡 API Examples & Testing Guide

## Base URL
```
http://localhost:5000/api
```

---

## 1. Basic Flight Search

### Request
```bash
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1
```

### Response
```json
{
  "meta": {
    "currency": "INR",
    "totalResults": 120,
    "page": 1,
    "pageSize": 50,
    "sorting": "PRICE_ASC",
    "suppliersUsed": ["amadeus"],
    "responseTimeMs": 1234
  },
  "search": {
    "origin": "BOM",
    "destination": "DXB",
    "departureDate": "2025-12-25",
    "tripType": "ONE_WAY",
    "adults": 1
  },
  "data": [...]
}
```

---

## 2. Round Trip Search

### Request
```bash
GET /api/flights/search?origin=DEL&destination=LHR&departureDate=2025-12-25&returnDate=2026-01-05&adults=2
```

### Parameters
- `origin`: DEL (Delhi)
- `destination`: LHR (London Heathrow)
- `departureDate`: 2025-12-25
- `returnDate`: 2026-01-05 ✅ (makes it round trip)
- `adults`: 2

---

## 3. Non-Stop Flights Only

### Request
```bash
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1&nonStopOnly=true
```

### What it does
- Filters out all flights with layovers
- Only returns direct flights

---

## 4. Sort by Duration

### Request
```bash
GET /api/flights/search?origin=DEL&destination=SIN&departureDate=2025-12-25&adults=1&sortBy=DURATION_ASC
```

### Sort Options
- `PRICE_ASC` - Cheapest first (default)
- `PRICE_DESC` - Most expensive first
- `DURATION_ASC` - Shortest duration first
- `DURATION_DESC` - Longest duration first
- `DEPARTURE_TIME_ASC` - Earliest departure first
- `DEPARTURE_TIME_DESC` - Latest departure first
- `BEST` - Best balance of price & duration

---

## 5. Filter by Price Range

### Request
```bash
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1&minPrice=15000&maxPrice=30000
```

### Parameters
- `minPrice`: 15000 (minimum ₹15,000)
- `maxPrice`: 30000 (maximum ₹30,000)
- Only flights between ₹15k-₹30k will be returned

---

## 6. Filter by Airlines

### Request
```bash
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1&airlines=EK,AI,6E
```

### Parameters
- `airlines`: EK,AI,6E (comma-separated IATA codes)
  - EK = Emirates
  - AI = Air India
  - 6E = IndiGo
- Only flights from these airlines will be shown

---

## 7. Filter by Maximum Stops

### Request
```bash
GET /api/flights/search?origin=DEL&destination=JFK&departureDate=2025-12-25&adults=1&maxStops=1
```

### Parameters
- `maxStops`: 1
- Shows only:
  - Direct flights (0 stops)
  - 1-stop flights
- Filters out 2+ stop flights

---

## 8. Business Class Search

### Request
```bash
GET /api/flights/search?origin=BOM&destination=LHR&departureDate=2025-12-25&adults=2&cabin=BUSINESS
```

### Cabin Options
- `ECONOMY` (default)
- `PREMIUM_ECONOMY`
- `BUSINESS`
- `FIRST`

---

## 9. Family Travel (Adults + Children + Infants)

### Request
```bash
GET /api/flights/search?origin=DEL&destination=DXB&departureDate=2025-12-25&adults=2&children=2&infants=1
```

### Parameters
- `adults`: 2 (required, minimum 1)
- `children`: 2 (optional)
- `infants`: 1 (optional, cannot exceed adults)

---

## 10. Refundable Tickets Only

### Request
```bash
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1&refundableOnly=true
```

### What it does
- Only returns flights with refundable fares
- Useful for flexible bookings

---

## 11. Pagination

### Request - Page 1
```bash
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1&page=1&pageSize=20
```

### Request - Page 2
```bash
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1&page=2&pageSize=20
```

### Parameters
- `page`: Page number (default: 1)
- `pageSize`: Results per page (default: 50, max: 100)

### Response includes pagination info
```json
{
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 120
  }
}
```

---

## 12. Combined Filters (Power Query)

### Request
```bash
GET /api/flights/search?origin=DEL&destination=LHR&departureDate=2025-12-25&adults=2&children=1&cabin=BUSINESS&nonStopOnly=true&maxPrice=250000&airlines=BA,AI&sortBy=BEST&page=1&pageSize=25
```

### What this does
- Route: DEL → LHR
- Date: 2025-12-25
- Passengers: 2 adults + 1 child
- Cabin: Business class
- Filter: Non-stop only
- Filter: Max price ₹2,50,000
- Filter: Only British Airways & Air India
- Sort: Best value (price + duration balance)
- Pagination: Page 1, 25 results

---

## 13. Testing with cURL

### Windows PowerShell
```powershell
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
```

### Windows CMD (escape &)
```cmd
curl "http://localhost:5000/api/flights/search?origin=BOM^&destination=DXB^&departureDate=2025-12-25^&adults=1"
```

### Linux/Mac
```bash
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
```

---

## 14. Testing with Postman

### Step 1: Create Request
- Method: `GET`
- URL: `http://localhost:5000/api/flights/search`

### Step 2: Add Query Params
| Key | Value |
|-----|-------|
| origin | BOM |
| destination | DXB |
| departureDate | 2025-12-25 |
| adults | 1 |

### Step 3: Send Request
✅ You should get industry-standard JSON response

---

## 15. Testing with JavaScript (Frontend)

### Fetch API
```javascript
const searchFlights = async () => {
  const params = new URLSearchParams({
    origin: 'BOM',
    destination: 'DXB',
    departureDate: '2025-12-25',
    adults: 1,
    sortBy: 'PRICE_ASC'
  });

  const response = await fetch(`http://localhost:5000/api/flights/search?${params}`);
  const data = await response.json();
  
  console.log('Total results:', data.meta.totalResults);
  console.log('Suppliers used:', data.meta.suppliersUsed);
  console.log('Offers:', data.data);
};
```

### Axios
```javascript
import axios from 'axios';

const searchFlights = async () => {
  const response = await axios.get('http://localhost:5000/api/flights/search', {
    params: {
      origin: 'BOM',
      destination: 'DXB',
      departureDate: '2025-12-25',
      adults: 1,
      sortBy: 'PRICE_ASC'
    }
  });
  
  console.log(response.data);
};
```

---

## 16. Response Structure Breakdown

```json
{
  "meta": {
    "currency": "INR",              // Currency code
    "totalResults": 120,             // Total offers found
    "page": 1,                       // Current page
    "pageSize": 50,                  // Results per page
    "sorting": "PRICE_ASC",          // Sort applied
    "suppliersUsed": ["amadeus"],    // Which suppliers were queried
    "requestId": "...",              // Unique request ID for tracking
    "responseTimeMs": 1234           // API response time
  },
  "search": {
    // Echo of your search parameters
    "origin": "BOM",
    "destination": "DXB",
    "departureDate": "2025-12-25",
    "returnDate": null,
    "tripType": "ONE_WAY",
    "adults": 1,
    "children": 0,
    "infants": 0,
    "cabin": "ECONOMY",
    "nonStopOnly": false
  },
  "data": [
    // Array of flight offers
    {
      "id": "OFFER_1",
      "source": {
        "supplier": "amadeus",       // Where this came from
        "supplierOfferId": "XYZ123"  // Original supplier ID
      },
      "itinerary": {
        "slices": [                  // Outbound, Inbound
          {
            "sliceId": "OUTBOUND",
            "durationMinutes": 210,
            "durationFormatted": "3h 30m",
            "segments": [            // Flight legs
              {
                "segmentId": "SEG1_1",
                "marketingAirlineCode": "EK",
                "flightNumber": "501",
                "departure": {
                  "airportCode": "BOM",
                  "terminal": "2",
                  "time": "2025-12-25T10:30:00+05:30"
                },
                "arrival": {
                  "airportCode": "DXB",
                  "terminal": "3",
                  "time": "2025-12-25T12:50:00+04:00"
                }
              }
            ]
          }
        ]
      },
      "pricing": {
        "totalAmount": 21500,        // Total price
        "totalCurrency": "INR",
        "baseAmount": 19000,          // Base fare
        "taxesAmount": 2500           // Taxes & fees
      },
      "computed": {
        "totalStops": 0,              // Number of stops
        "isNonStop": true,
        "totalDurationFormatted": "3h 30m"
      }
    }
  ],
  "dictionaries": {
    "airlines": {
      "EK": { "name": "Emirates" }
    },
    "airports": {
      "BOM": { "name": "...", "countryCode": "IN" }
    },
    "aircraft": {
      "77W": { "name": "Boeing 777-300ER" }
    }
  }
}
```

---

## 17. Common Airport Codes (for testing)

### India
- BOM - Mumbai
- DEL - Delhi
- BLR - Bangalore
- MAA - Chennai
- HYD - Hyderabad
- CCU - Kolkata
- GOI - Goa

### International
- DXB - Dubai
- LHR - London Heathrow
- JFK - New York JFK
- SIN - Singapore
- HKG - Hong Kong
- BKK - Bangkok
- SYD - Sydney

---

## 18. Performance Testing

### Check Cache Hit
```bash
# First call (cache miss)
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
# Note the responseTimeMs (e.g., 2000ms)

# Second call (cache hit)
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
# Note the responseTimeMs (should be ~10ms)
```

### Load Test (simple)
```bash
# Windows PowerShell
for ($i=1; $i -le 10; $i++) {
  curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
}
```

---

## 19. Error Handling Examples

### Invalid Airport Code
```bash
curl "http://localhost:5000/api/flights/search?origin=XXX&destination=DXB&departureDate=2025-12-25&adults=1"
```
Response: `400 Bad Request` with error details

### Missing Required Param
```bash
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&adults=1"
```
Response: `400 Bad Request` - "Invalid search parameters"

### Invalid Date
```bash
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2024-01-01&adults=1"
```
Response: `400 Bad Request` - "Invalid departure date"

---

## 20. Monitoring & Debugging

### Check Logs
```bash
# Backend logs show:
✅ Searching across 1 suppliers: amadeus
📡 Fetching from amadeus...
✅ amadeus: 50 offers fetched
✅ Flight search completed: 50 offers returned (1234ms)
```

### Check Redis Cache
```bash
redis-cli
> KEYS flights:*
> GET flights:bom:dxb:2025-12-25:ow:1:0:0:economy:price:1
```

---

**Happy Testing! 🚀**
