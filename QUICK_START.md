# 🚀 Quick Start Guide

## What Was Built

✅ **Multi-supplier flight search API** (industry-standard like MMT, Booking.com)
✅ **Parallel supplier calls** with timeout protection
✅ **Smart deduplication** & aggregation
✅ **NDC/OTA-compliant response format**
✅ **Filtering, sorting, pagination**

---

## 1️⃣ Install Dependencies

```bash
cd backend
npm install
```

---

## 2️⃣ Configure Environment

```bash
# Copy example
cp .env.example .env

# Edit .env with your credentials
```

**Required variables:**
```env
PORT=5000
NODE_ENV=development

# MySQL (make sure MySQL is running)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=travel_booking

# Redis (make sure Redis is running)
REDIS_HOST=localhost
REDIS_PORT=6379

# Amadeus API (get keys from https://developers.amadeus.com)
AMADEUS_API_KEY=your_api_key
AMADEUS_API_SECRET=your_api_secret
AMADEUS_BASE_URL=https://test.api.amadeus.com/v1
```

---

## 3️⃣ Start Services

### Start MySQL
```bash
# Windows (if using XAMPP)
# Start XAMPP and enable MySQL

# Or using MySQL service
net start MySQL80
```

### Start Redis
```bash
# Windows (if installed via installer)
redis-server

# Or if installed via chocolatey
choco install redis
redis-server
```

### Create Database
```sql
CREATE DATABASE travel_booking;
```

---

## 4️⃣ Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ MySQL Connected
✅ Redis Connected
🚀 Server running on port 5000
✅ Server is live at http://localhost:5000
```

---

## 5️⃣ Test API

### Basic Flight Search
```bash
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
```

### With Filters
```bash
curl "http://localhost:5000/api/flights/search?origin=DEL&destination=LHR&departureDate=2025-12-25&adults=2&nonStopOnly=true&sortBy=PRICE_ASC"
```

### With Pagination
```bash
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&page=1&pageSize=20"
```

---

## 📊 Expected Response

```json
{
  "meta": {
    "currency": "INR",
    "totalResults": 120,
    "page": 1,
    "pageSize": 50,
    "sorting": "PRICE_ASC",
    "suppliersUsed": ["amadeus"],
    "requestId": "1733751234567_BOM-DXB",
    "responseTimeMs": 1234
  },
  "search": {
    "origin": "BOM",
    "destination": "DXB",
    "departureDate": "2025-12-25",
    "tripType": "ONE_WAY",
    "adults": 1
  },
  "data": [
    {
      "id": "OFFER_1",
      "source": {
        "supplier": "amadeus",
        "supplierOfferId": "XYZ123"
      },
      "itinerary": {
        "slices": [
          {
            "sliceId": "OUTBOUND",
            "durationMinutes": 210,
            "segments": [...]
          }
        ]
      },
      "pricing": {
        "totalAmount": 21500,
        "totalCurrency": "INR"
      }
    }
  ],
  "dictionaries": {
    "airlines": {...},
    "airports": {...},
    "aircraft": {...}
  }
}
```

---

## 🔧 Troubleshooting

### Error: "Failed to connect to MySQL"
✅ Make sure MySQL is running
✅ Check DB credentials in `.env`
✅ Create database: `CREATE DATABASE travel_booking;`

### Error: "Failed to connect to Redis"
✅ Make sure Redis server is running: `redis-server`
✅ Check Redis host/port in `.env`

### Error: "Amadeus authentication failed"
✅ Get API keys from https://developers.amadeus.com
✅ Use **test environment** keys
✅ Check key/secret in `.env`

---

## 🎯 Next Steps

1. ✅ Test different routes (BOM-DXB, DEL-LHR, etc.)
2. ✅ Try different filters (nonStopOnly, maxPrice, airlines)
3. ✅ Check logs to see supplier calls
4. 📖 Read `IMPLEMENTATION_SUMMARY.md` for architecture details
5. 📖 Read `backend/README_NEW.md` for complete documentation

---

## 📁 Key Files to Understand

| File | Purpose |
|------|---------|
| `src/services/flight.service.js` | **Main wrapper logic** - calls all suppliers |
| `src/assembly_line/aggregator.js` | Merges, dedupes, sorts results |
| `src/assembly_line/mappers/flight.mapper.js` | Converts supplier → standard format |
| `src/config/suppliers.config.js` | Manage active suppliers |
| `src/core/FlightResponseFormat.js` | Industry-standard response builder |

---

## 🚀 Adding New Suppliers

When ready to add Sabre/Travelport:

1. Create `src/suppliers/sabre/sabre.flight.js`
2. Add mapper in `src/assembly_line/mappers/flight.mapper.js`
3. Add config in `src/config/suppliers.config.js`:
   ```javascript
   sabre: {
     name: 'Sabre',
     code: 'sabre',
     isActive: true,
     timeout: 7000
   }
   ```
4. Update `src/suppliers/supplierFactory.js`

**No changes needed in service layer!** 🎉

---

**Ready to build a travel empire! 🔥**
