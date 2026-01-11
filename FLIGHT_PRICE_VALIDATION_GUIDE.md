# 🔍 **Flight Price Validation - Complete Guide**

## ❌ **Why It's Failing**

The flight offer you're sending is **incomplete**. Amadeus requires a **full flight offer** with:
- ✅ Itineraries with segments
- ✅ Traveler pricing
- ✅ Pricing details
- ✅ Validating airline codes

Your test payload is missing these required fields!

---

## ✅ **How to Test Flight Price Validation**

### **Step 1: Get a Real Flight Offer**

First, search for flights to get a complete offer:

```bash
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"
```

**Response** (copy ONE complete flight offer):
```json
{
  "data": [
    {
      "id": "1",
      "type": "flight-offer",
      "source": "GDS",
      "instantTicketingRequired": false,
      "nonHomogeneous": false,
      "oneWay": false,
      "lastTicketingDate": "2025-12-20",
      "numberOfBookableSeats": 9,
      "itineraries": [
        {
          "duration": "PT3H30M",
          "segments": [
            {
              "departure": {
                "iataCode": "BOM",
                "terminal": "2",
                "at": "2025-12-25T08:00:00"
              },
              "arrival": {
                "iataCode": "DXB",
                "terminal": "3",
                "at": "2025-12-25T10:30:00"
              },
              "carrierCode": "EK",
              "number": "508",
              "aircraft": {
                "code": "77W"
              },
              "operating": {
                "carrierCode": "EK"
              },
              "duration": "PT3H30M",
              "id": "1",
              "numberOfStops": 0,
              "blacklistedInEU": false
            }
          ]
        }
      ],
      "price": {
        "currency": "INR",
        "total": "15234.00",
        "base": "12450.00",
        "fees": [
          {
            "amount": "0.00",
            "type": "SUPPLIER"
          },
          {
            "amount": "0.00",
            "type": "TICKETING"
          }
        ],
        "grandTotal": "15234.00"
      },
      "pricingOptions": {
        "fareType": [
          "PUBLISHED"
        ],
        "includedCheckedBagsOnly": true
      },
      "validatingAirlineCodes": [
        "EK"
      ],
      "travelerPricings": [
        {
          "travelerId": "1",
          "fareOption": "STANDARD",
          "travelerType": "ADULT",
          "price": {
            "currency": "INR",
            "total": "15234.00",
            "base": "12450.00"
          },
          "fareDetailsBySegment": [
            {
              "segmentId": "1",
              "cabin": "ECONOMY",
              "fareBasis": "TLOWAE3",
              "class": "T",
              "includedCheckedBags": {
                "weight": 30,
                "weightUnit": "KG"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

### **Step 2: Use Complete Flight Offer for Price Validation**

Copy the **ENTIRE** flight offer from Step 1 and use it:

```bash
curl -X POST http://localhost:5000/api/flights/price \
  -H "Content-Type: application/json" \
  -d '{
    "flightOffer": {
      "id": "1",
      "type": "flight-offer",
      "source": "GDS",
      "instantTicketingRequired": false,
      "nonHomogeneous": false,
      "oneWay": false,
      "lastTicketingDate": "2025-12-20",
      "numberOfBookableSeats": 9,
      "itineraries": [
        {
          "duration": "PT3H30M",
          "segments": [
            {
              "departure": {
                "iataCode": "BOM",
                "terminal": "2",
                "at": "2025-12-25T08:00:00"
              },
              "arrival": {
                "iataCode": "DXB",
                "terminal": "3",
                "at": "2025-12-25T10:30:00"
              },
              "carrierCode": "EK",
              "number": "508",
              "aircraft": {
                "code": "77W"
              },
              "operating": {
                "carrierCode": "EK"
              },
              "duration": "PT3H30M",
              "id": "1",
              "numberOfStops": 0,
              "blacklistedInEU": false
            }
          ]
        }
      ],
      "price": {
        "currency": "INR",
        "total": "15234.00",
        "base": "12450.00",
        "fees": [
          {
            "amount": "0.00",
            "type": "SUPPLIER"
          }
        ],
        "grandTotal": "15234.00"
      },
      "pricingOptions": {
        "fareType": ["PUBLISHED"],
        "includedCheckedBagsOnly": true
      },
      "validatingAirlineCodes": ["EK"],
      "travelerPricings": [
        {
          "travelerId": "1",
          "fareOption": "STANDARD",
          "travelerType": "ADULT",
          "price": {
            "currency": "INR",
            "total": "15234.00",
            "base": "12450.00"
          },
          "fareDetailsBySegment": [
            {
              "segmentId": "1",
              "cabin": "ECONOMY",
              "fareBasis": "TLOWAE3",
              "class": "T",
              "includedCheckedBags": {
                "weight": 30,
                "weightUnit": "KG"
              }
            }
          ]
        }
      ]
    }
  }'
```

---

## 📋 **Required Fields**

For Amadeus Flight Price API, you MUST include:

| Field | Required | Description |
|-------|----------|-------------|
| `type` | ✅ Yes | Must be "flight-offer" |
| `id` | ✅ Yes | Unique offer ID |
| `source` | ✅ Yes | "GDS" |
| `itineraries` | ✅ Yes | Array with flight segments |
| `price` | ✅ Yes | Price breakdown |
| `travelerPricings` | ✅ Yes | Per-traveler pricing |
| `validatingAirlineCodes` | ✅ Yes | Airline codes |

---

## 🎯 **Correct Workflow**

### **Use Case**: User wants to book a flight

```
1. Search Flights
   GET /api/flights/search
   → Returns multiple flight offers
   
2. User Selects One Offer
   → Frontend stores complete offer
   
3. Validate Price Before Booking
   POST /api/flights/price
   → Send COMPLETE offer from step 1
   → Returns confirmed price
   
4. Create Booking (if price OK)
   POST /api/flights/book
   → Use validated offer from step 3
```

---

## ⚠️ **Why Your Test Failed**

Your payload:
```json
{
  "flightOffer": {
    "type": "flight-offer",
    "id": "1",
    "itineraries": [],  ❌ EMPTY! Must have segments
    "price": {
      "currency": "USD",
      "total": "150.00"
    }
  }
}
```

**Missing**:
- ❌ No itinerary segments (where/when the flight flies)
- ❌ No traveler pricing
- ❌ No fare details
- ❌ No departure/arrival info

**This is like asking**: "How much does this flight cost?" without saying which flight! 🤷‍♂️

---

## ✅ **Quick Test (Copy-Paste)**

### **Step 1: Get a real offer**
```bash
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1" > flight-offer.json
```

### **Step 2: Extract one offer and validate**
Open `flight-offer.json`, copy ONE complete offer from the `data` array, then:

```bash
curl -X POST http://localhost:5000/api/flights/price \
  -H "Content-Type: application/json" \
  -d '{
    "flightOffer": <PASTE_COMPLETE_OFFER_HERE>
  }'
```

---

## 📚 **Amadeus Documentation**

From: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/

### **Flight Offers Price API**
**Endpoint**: `POST /v1/shopping/flight-offers/pricing`

**Purpose**: 
- Confirms price is still available
- Returns updated price if changed
- Required before booking

**Input**:
```json
{
  "data": {
    "type": "flight-offers-pricing",
    "flightOffers": [
      {
        // COMPLETE flight offer from search
        // Must include ALL fields returned by search
      }
    ]
  }
}
```

**Why Complete Offer Needed**:
- Amadeus needs to verify exact flight/fare combination
- Price can change based on availability
- Different fare classes have different prices
- Taxes vary by route/airline

---

## 🔧 **Updated Postman Collection**

I'll create an updated test that works:

```json
{
  "name": "Flight Price Validation (Working)",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"flightOffer\": {\n    \"type\": \"flight-offer\",\n    \"id\": \"{{offerId}}\",\n    \"source\": \"GDS\",\n    \"itineraries\": {{itineraries}},\n    \"price\": {{price}},\n    \"travelerPricings\": {{travelerPricings}},\n    \"validatingAirlineCodes\": {{validatingAirlineCodes}}\n  }\n}"
    },
    "url": {
      "raw": "{{baseUrl}}/flights/price",
      "host": ["{{baseUrl}}"],
      "path": ["flights", "price"]
    }
  }
}
```

**Instructions**:
1. First run "Search Flights" request
2. Copy response from search
3. Paste into "Flight Price Validation" body
4. Run validation

---

## 💡 **Pro Tip**

In production, your frontend should:

1. **Store the complete offer** from search results
2. **Send the entire offer** for price validation
3. **Don't manually construct** flight offers
4. **Use what Amadeus returns** - it's always complete

---

## 🎓 **Summary**

❌ **Wrong**: Sending minimal/fake flight offer
```json
{
  "flightOffer": {
    "id": "1",
    "itineraries": [],
    "price": {"total": "150.00"}
  }
}
```

✅ **Correct**: Sending complete offer from search
```json
{
  "flightOffer": {
    // ENTIRE offer from /flights/search response
    // Includes all segments, pricing, traveler info, etc.
  }
}
```

---

## 🚀 **Next Steps**

1. ✅ Run flight search: `GET /api/flights/search`
2. ✅ Copy ONE complete offer from response
3. ✅ Send it to: `POST /api/flights/price`
4. ✅ Should work perfectly!

---

**The endpoint works fine - you just need a real, complete flight offer!** 🎉
