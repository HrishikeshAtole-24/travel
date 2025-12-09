# 🚀 Amadeus API Integration Guide

Complete guide for all Amadeus APIs implemented in the travel booking system.

## 📋 Table of Contents

1. [Core Flight APIs](#core-flight-apis)
2. [Reference Data APIs](#reference-data-apis)
3. [Analytics & Insights APIs](#analytics--insights-apis)
4. [Usage Examples](#usage-examples)
5. [Response Formats](#response-formats)
6. [Error Handling](#error-handling)

---

## 🔥 Core Flight APIs

### 1️⃣ OAuth Authentication (Automatic)
**Endpoint**: `POST /v1/security/oauth2/token`  
**Purpose**: Get access token for API authentication  
**Auto-handled**: Yes (token refreshes automatically)

```javascript
// No manual action needed - handled by amadeus.client.js
// Token is automatically refreshed every 30 minutes
```

---

### 2️⃣ Flight Offers Search
**Endpoint**: `GET /v2/shopping/flight-offers`  
**Purpose**: Search for multiple flight offers  
**Usage**:

```javascript
const amadeus = require('./suppliers/amadeus');

const searchParams = {
  origin: 'BOM',              // Mumbai
  destination: 'DEL',         // Delhi
  departureDate: '2024-06-15',
  returnDate: '2024-06-20',   // Optional (for round-trip)
  adults: 1,                  // Required
  children: 0,                // Optional
  infants: 0,                 // Optional
  travelClass: 'ECONOMY',     // ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
  nonStop: false,             // true for non-stop flights only
  currencyCode: 'USD',        // Currency for prices
  maxPrice: 50000,            // Maximum price filter
  max: 250                    // Max results (default 250)
};

const result = await amadeus.searchFlights(searchParams);
```

**Response**: Array of flight offers with pricing, itineraries, segments

---

### 3️⃣ Flight Offers Pricing
**Endpoint**: `POST /v1/shopping/flight-offers/pricing`  
**Purpose**: Validate and get final price before booking  
**Usage**:

```javascript
// Get the selected flight offer from search results
const selectedOffer = searchResults.data[0];

// Validate final price
const pricedOffer = await amadeus.getFlightPrice(selectedOffer);

console.log('Final Price:', pricedOffer.data.flightOffers[0].price);
```

**Why needed**: Prices can change between search and booking. Always validate.

---

### 4️⃣ Flight Order Creation (Booking)
**Endpoint**: `POST /v1/booking/flight-orders`  
**Purpose**: Create a flight booking  
**Usage**:

```javascript
const travelers = [
  {
    id: '1',
    dateOfBirth: '1990-05-20',
    name: {
      firstName: 'JOHN',
      lastName: 'DOE'
    },
    gender: 'MALE',
    contact: {
      emailAddress: 'john.doe@example.com',
      phones: [{
        deviceType: 'MOBILE',
        countryCallingCode: '91',
        number: '9876543210'
      }]
    },
    documents: [{
      documentType: 'PASSPORT',
      number: 'L1234567',
      expiryDate: '2030-12-31',
      issuanceCountry: 'IN',
      nationality: 'IN',
      holder: true
    }]
  }
];

const contacts = {
  emailAddress: 'john.doe@example.com',
  phones: [{
    deviceType: 'MOBILE',
    countryCallingCode: '91',
    number: '9876543210'
  }]
};

const booking = await amadeus.createFlightOrder(
  pricedOffer.data.flightOffers[0],
  travelers,
  contacts
);

console.log('Booking Confirmed! PNR:', booking.data.id);
```

---

### 5️⃣ Get Flight Order
**Endpoint**: `GET /v1/booking/flight-orders/{orderId}`  
**Purpose**: Retrieve booking details  
**Usage**:

```javascript
const orderId = 'eJzTd9f3NjIJdzUGAAp%2fAiY=';
const orderDetails = await amadeus.getFlightOrder(orderId);

console.log('Booking Status:', orderDetails.data.flightOffers);
```

---

### 6️⃣ Cancel Flight Order
**Endpoint**: `DELETE /v1/booking/flight-orders/{orderId}`  
**Purpose**: Cancel a booking  
**Usage**:

```javascript
const orderId = 'eJzTd9f3NjIJdzUGAAp%2fAiY=';
const cancellation = await amadeus.cancelFlightOrder(orderId);

console.log('Booking Cancelled:', cancellation);
```

---

## 🌍 Reference Data APIs

### 7️⃣ Location Search (Autocomplete)
**Endpoint**: `GET /v1/reference-data/locations`  
**Purpose**: Search airports and cities for autocomplete  
**Usage**:

```javascript
// Search for airports/cities starting with "mum"
const locations = await amadeus.searchLocations('mum', 'AIRPORT,CITY');

locations.data.forEach(loc => {
  console.log(`${loc.iataCode} - ${loc.name} (${loc.subType})`);
  // Output: BOM - Mumbai (AIRPORT)
});
```

**Use Cases**:
- Airport/city autocomplete in search form
- Validate user input
- Get IATA codes from city names

---

### 8️⃣ Airport Information
**Endpoint**: `GET /v1/reference-data/locations/airports`  
**Purpose**: Get detailed airport info by IATA code  
**Usage**:

```javascript
const airportInfo = await amadeus.getAirportInfo('BOM');

console.log('Airport Name:', airportInfo.data[0].name);
console.log('City:', airportInfo.data[0].address.cityName);
console.log('Country:', airportInfo.data[0].address.countryCode);
```

---

### 9️⃣ Airports by City
**Endpoint**: `GET /v1/reference-data/locations/cities/{cityCode}`  
**Purpose**: Get all airports in a city  
**Usage**:

```javascript
// Get all airports in London (LON has multiple airports)
const cityAirports = await amadeus.getAirportsByCity('LON');

cityAirports.included.forEach(airport => {
  console.log(`${airport.iataCode} - ${airport.name}`);
  // Output: LHR - Heathrow, LGW - Gatwick, etc.
});
```

---

### 🔟 Airline Information
**Endpoint**: `GET /v1/reference-data/airlines`  
**Purpose**: Get airline details by code  
**Usage**:

```javascript
const airlineInfo = await amadeus.getAirlineInfo('AI');

console.log('Airline Name:', airlineInfo.data[0].businessName);
console.log('Common Name:', airlineInfo.data[0].commonName);
// Output: Air India
```

---

## 📊 Analytics & Insights APIs

### 1️⃣1️⃣ Cheapest Dates to Fly
**Endpoint**: `GET /v1/shopping/flight-dates`  
**Purpose**: Find cheapest dates to fly (price calendar)  
**Usage**:

```javascript
const cheapestDates = await amadeus.getFlightCheapestDates({
  origin: 'BOM',
  destination: 'DEL',
  departureDate: '2024-06-01',  // Starting search date
  oneWay: false,                 // false for round-trip
  duration: '7',                 // Trip duration (for round-trip)
  nonStop: false,
  maxPrice: 50000
});

cheapestDates.data.forEach(option => {
  console.log(`${option.departureDate} → ${option.returnDate}: ${option.price.total}`);
});
```

**Use Case**: Show "Flexible Dates" calendar with prices

---

### 1️⃣2️⃣ Flight Destinations (Inspiration)
**Endpoint**: `GET /v1/shopping/flight-destinations`  
**Purpose**: Find popular destinations from an origin  
**Usage**:

```javascript
// "Where can I fly from Mumbai?"
const destinations = await amadeus.getFlightDestinations('BOM', {
  departureDate: '2024-06-15',
  oneWay: true,
  maxPrice: 30000
});

destinations.data.forEach(dest => {
  console.log(`${dest.destination} - From ${dest.price.total}`);
  // Output: DEL - From 5000, GOI - From 8000, etc.
});
```

**Use Case**: "Explore destinations" or "Travel inspiration" page

---

### 1️⃣3️⃣ Airline Routes
**Endpoint**: `GET /v1/airline/destinations`  
**Purpose**: Get routes served by an airline  
**Usage**:

```javascript
// Get all destinations Air India flies to
const routes = await amadeus.getAirlineRoutes('AI', '2024-06-15');

routes.data.forEach(route => {
  console.log(`${route.type}: ${route.destination}`);
});
```

**Use Case**: Show airline-specific route maps

---

## 💡 Usage Examples

### Example 1: Complete Flight Search Flow

```javascript
const FlightService = require('./services/flight.service');

async function searchAndBook() {
  try {
    // 1. Search flights
    const searchResults = await FlightService.searchFlights({
      origin: 'BOM',
      destination: 'DEL',
      departureDate: '2024-06-15',
      returnDate: '2024-06-20',
      adults: 1,
      travelClass: 'ECONOMY'
    });

    console.log(`Found ${searchResults.data.length} flights`);

    // 2. User selects a flight
    const selectedOffer = searchResults.data[0];

    // 3. Validate final price
    const amadeus = require('./suppliers/amadeus');
    const pricedOffer = await amadeus.getFlightPrice(selectedOffer);

    console.log('Final Price:', pricedOffer.data.flightOffers[0].price.total);

    // 4. Create booking
    const booking = await amadeus.createFlightOrder(
      pricedOffer.data.flightOffers[0],
      travelers,
      contacts
    );

    console.log('✅ Booking confirmed! PNR:', booking.data.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}
```

---

### Example 2: Airport Autocomplete

```javascript
const express = require('express');
const router = express.Router();
const amadeus = require('../suppliers/amadeus');

router.get('/api/airports/search', async (req, res) => {
  try {
    const { q } = req.query;  // q=mum

    if (!q || q.length < 3) {
      return res.status(400).json({ error: 'Keyword must be at least 3 characters' });
    }

    const locations = await amadeus.searchLocations(q, 'AIRPORT');

    const suggestions = locations.data.map(loc => ({
      code: loc.iataCode,
      name: loc.name,
      city: loc.address.cityName,
      country: loc.address.countryCode
    }));

    res.json(suggestions);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Example 3: Cheapest Dates Calendar

```javascript
router.get('/api/flights/cheapest-dates', async (req, res) => {
  try {
    const { origin, destination, month } = req.query;

    const cheapestDates = await amadeus.getFlightCheapestDates({
      origin,
      destination,
      departureDate: `${month}-01`,
      oneWay: false,
      duration: '7'
    });

    // Group by week for calendar display
    const calendar = cheapestDates.data.map(option => ({
      departure: option.departureDate,
      return: option.returnDate,
      price: option.price.total,
      currency: option.price.currency
    }));

    res.json(calendar);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📦 Response Formats

### Flight Offer Structure

```javascript
{
  "type": "flight-offer",
  "id": "1",
  "source": "GDS",
  "instantTicketingRequired": false,
  "nonHomogeneous": false,
  "oneWay": false,
  "lastTicketingDate": "2024-06-10",
  "numberOfBookableSeats": 5,
  "itineraries": [
    {
      "duration": "PT2H10M",
      "segments": [
        {
          "departure": {
            "iataCode": "BOM",
            "at": "2024-06-15T10:00:00"
          },
          "arrival": {
            "iataCode": "DEL",
            "at": "2024-06-15T12:10:00"
          },
          "carrierCode": "AI",
          "number": "860",
          "aircraft": {
            "code": "321"
          },
          "duration": "PT2H10M",
          "numberOfStops": 0
        }
      ]
    }
  ],
  "price": {
    "currency": "USD",
    "total": "150.00",
    "base": "120.00",
    "fees": [
      {
        "amount": "30.00",
        "type": "SUPPLIER"
      }
    ],
    "grandTotal": "150.00"
  },
  "pricingOptions": {
    "fareType": ["PUBLISHED"],
    "includedCheckedBagsOnly": true
  },
  "validatingAirlineCodes": ["AI"],
  "travelerPricings": [
    {
      "travelerId": "1",
      "fareOption": "STANDARD",
      "travelerType": "ADULT",
      "price": {
        "currency": "USD",
        "total": "150.00",
        "base": "120.00"
      },
      "fareDetailsBySegment": [
        {
          "segmentId": "1",
          "cabin": "ECONOMY",
          "fareBasis": "YIF",
          "class": "Y",
          "includedCheckedBags": {
            "quantity": 1
          }
        }
      ]
    }
  ]
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| 401 | Unauthorized | Token expired (auto-handled) |
| 400 | Invalid Parameters | Check required parameters |
| 404 | Not Found | Invalid IATA code or flight ID |
| 429 | Rate Limit Exceeded | Implement request throttling |
| 500 | Server Error | Retry with exponential backoff |

### Error Handling Example

```javascript
try {
  const result = await amadeus.searchFlights(params);
} catch (error) {
  if (error.response) {
    // API error response
    console.error('Status:', error.response.status);
    console.error('Error:', error.response.data.errors);
    
    if (error.response.status === 400) {
      // Invalid parameters
      return res.status(400).json({
        error: 'Invalid search parameters',
        details: error.response.data.errors
      });
    }
  } else {
    // Network or other error
    console.error('Error:', error.message);
    return res.status(500).json({
      error: 'Failed to search flights'
    });
  }
}
```

---

## 🔐 Environment Variables Required

```env
# Amadeus API Credentials (Test Environment)
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here
AMADEUS_API_URL=https://test.api.amadeus.com
```

---

## 🚦 API Limits (Test Environment)

- **Requests per second**: 10 TPS
- **Requests per month**: 1,000 (Free tier)
- **Flight offers per search**: Max 250
- **Token validity**: 30 minutes

---

## 📚 Resources

- **Amadeus Developers Portal**: https://developers.amadeus.com
- **API Reference**: https://developers.amadeus.com/self-service/category/flights
- **Test Credentials**: https://developers.amadeus.com/get-started/get-started-with-self-service-apis-335

---

## ✅ Implementation Checklist

- [x] OAuth2 token management
- [x] Flight search (v2)
- [x] Flight pricing validation
- [x] Flight booking creation
- [x] Booking retrieval
- [x] Booking cancellation
- [x] Location search (autocomplete)
- [x] Airport information
- [x] City airports lookup
- [x] Airline information
- [x] Cheapest dates search
- [x] Flight destinations (inspiration)
- [x] Airline routes
- [x] Error handling & logging
- [x] Health check endpoint

---

**All 13 Amadeus APIs successfully implemented! 🎉**
