# Travel Backend In-Depth Guide

## 1. Product Snapshot
- **Business goal**: Provide a single API for searching flights, creating bookings, and handling payments for a travel brand. It hides supplier complexity (e.g., Amadeus), stores reservations, and drives payment workflows.
- **Who uses it**: Front-end apps (web, mobile, agency tools), partner integrations, Postman testers, and internal operations teams.
- **Tech stack**: Node.js + Express service layer, PostgreSQL (Neon) for persistence, Redis cache, third-party flight supplier (Amadeus), and payment gateways (Razorpay, Stripe). Logging uses Winston; views for hosted payment pages live under EJS templates.

## 2. Architecture Overview
```text
Clients (Web, Mobile, Admin) 
        |
  [HTTP /api/* endpoints]
        |
  Express Router [src/routes/index.js]
        |
  Controllers [src/controllers/*]        <-- input validation & response shaping
        |
  Services [src/services/*, src/payments/*]
        |        \
        |         \-- Supplier Factory [src/suppliers] → Amadeus APIs
        |         
  Repositories / Models [src/repository, src/models] → PostgreSQL (Neon)
        |
  Cache Repository [src/repository/cache.repo.js] → Redis (optional)
        |
  Logging & Config [src/config/*] → Environment (.env), Winston, Redis, DB
```

## 2.1 Backend Folder Structure Flowchart
```text
backend/
├── src/
│   ├── app.js                          # Express app setup, middleware, routes
│   ├── server.js                       # Server entry point, DB initialization
│   │
│   ├── assembly_line/                  # Data normalization pipeline
│   │   ├── aggregator.js               # Merge, dedupe, sort, paginate offers
│   │   ├── index.js                    # Export all assembly functions
│   │   ├── mappers/
│   │   │   └── flight.mapper.js        # Amadeus → Standard format
│   │   ├── transformers/
│   │   │   └── flight.transform.js     # Calculate totals, durations, layovers
│   │   └── validators/
│   │       └── flight.validator.js     # Field validation (Zod/Joi-ready)
│   │
│   ├── config/                         # Configuration modules
│   │   ├── database.js                 # PostgreSQL (Neon) connection pool
│   │   ├── dotenv.js                   # Environment variable loader
│   │   ├── redis.js                    # Redis client (optional cache)
│   │   ├── suppliers.config.js         # Supplier management & activation
│   │   └── winstonLogger.js            # Winston logging setup
│   │
│   ├── controllers/                    # HTTP request handlers
│   │   ├── analytics.controller.js     # Analytics endpoints
│   │   ├── auth.controller.js          # Authentication (signup, login, verify)
│   │   ├── booking.controller.js       # Booking management
│   │   ├── flight.controller.js        # Flight search & pricing
│   │   └── reference.controller.js     # Reference data (airports, airlines)
│   │
│   ├── core/                           # Shared primitives
│   │   ├── AcquirerStatusMapping.js    # Payment acquirer status mapping
│   │   ├── ApiError.js                 # Custom error classes
│   │   ├── ApiResponse.js              # Standard response builder
│   │   ├── AsyncHandler.js             # Promise error wrapper
│   │   ├── FlightResponseFormat.js     # Industry-standard flight response
│   │   ├── PaymentStatusCodes.js       # Payment status constants
│   │   ├── StandardPaymentStatus.js    # Standard payment statuses
│   │   └── StatusCodes.js              # HTTP status codes
│   │
│   ├── middleware/                     # Express middleware
│   │   ├── auth.middleware.js          # JWT authentication
│   │   ├── error.middleware.js         # Global error handler
│   │   └── requestLogger.middleware.js # Request logging
│   │
│   ├── models/                         # Database models & table creation
│   │   ├── acquirer-status-mapping.model.js
│   │   ├── acquirer.model.js
│   │   ├── booking.model.js
│   │   ├── index.js                    # Database initialization script
│   │   ├── payment.model.js
│   │   ├── standard-status.model.js
│   │   ├── traveler.model.js
│   │   └── user.model.js
│   │
│   ├── payments/                       # Payment processing module
│   │   ├── payment.controller.js       # Payment endpoints
│   │   ├── payment.routes.js           # Payment route definitions
│   │   ├── payment.service.js          # Payment business logic
│   │   ├── acquirers/
│   │   │   ├── AcquirerFactory.js      # Acquirer factory pattern
│   │   │   ├── IAcquirerClient.js      # Acquirer interface contract
│   │   │   ├── RegisterAcquirers.js    # Register all acquirers
│   │   │   ├── razorpay/               # Razorpay integration
│   │   │   └── stripe/                 # Stripe integration
│   │   ├── order/                      # Order management
│   │   └── payed/                      # Payment completion handlers
│   │
│   ├── repository/                     # Data access layer
│   │   ├── cache.repo.js               # Redis caching operations
│   │   └── flight.repo.js              # Flight-specific DB queries
│   │
│   ├── routes/                         # Route definitions
│   │   ├── analytics.routes.js         # Analytics API routes
│   │   ├── auth.routes.js              # Authentication routes
│   │   ├── booking.routes.js           # Booking routes
│   │   ├── flight.routes.js            # Flight routes
│   │   ├── index.js                    # Route combiner (mounts all routes)
│   │   ├── payment-page.routes.js      # Payment hosted pages
│   │   └── reference.routes.js         # Reference data routes
│   │
│   ├── services/                       # Business logic orchestrators
│   │   ├── auth.service.js             # Authentication logic
│   │   ├── booking.service.js          # Booking creation & management
│   │   └── flight.service.js           # Multi-supplier aggregation
│   │
│   ├── suppliers/                      # External API integrations
│   │   ├── supplierFactory.js          # Dynamic supplier selection
│   │   └── amadeus/
│   │       ├── amadeus.client.js       # HTTP client + token management
│   │       ├── amadeus.flight.js       # Flight API calls
│   │       └── index.js                # Clean export interface
│   │
│   └── utils/                          # Utility functions
│       ├── AirportUtils.js             # Airport data helpers
│       ├── DateUtils.js                # Date formatting
│       ├── DictionariesManager.js      # Airline/airport dictionaries
│       ├── emailService.js             # Email sending (nodemailer)
│       └── httpClient.js               # Axios base configuration
│
├── views/                              # EJS templates for hosted pages
│   ├── payment-error.ejs               # Payment failure page
│   └── razorpay-payment.ejs            # Razorpay checkout page
│
├── logs/                               # Winston log files
├── .env                                # Environment variables (gitignored)
├── .env.example                        # Environment template
├── package.json                        # Dependencies & scripts
└── README.md                           # Backend documentation
```


3. Backend Folder Responsibilities
src/app.js: Bootstraps Express, registers payment acquirers, mounts /api routes, attaches global error middleware.
src/server.js: Loads env vars, starts database + Redis connections, runs table initializers in src/models/index.js, and listens on the configured port.
src/routes: Route definitions split by domain (auth, flights, bookings, payments, reference data, analytics). index.js combines them and exposes /api/health.
src/controllers: Thin adapters translating HTTP requests into service calls and standard responses via src/core/ApiResponse.js.
src/services: Business logic orchestrators. Example: flight.service.js aggregates suppliers, caching, and formatting; booking.service.js coordinates database writes.
src/payments: Payment module with controllers, service logic, acquirer factory, and specific acquirer clients (Razorpay, Stripe).
src/suppliers: Supplier factory and Amadeus implementation. Responsible for calling external APIs and returning normalized payloads.
src/assembly_line: “Assembly line” pipeline (mappers, validators, transformers, aggregator) that normalizes and enriches supplier responses before they reach clients.
src/models: Table creation helpers and data access utilities for users, bookings, travelers, payments, acquirer status mappings, etc.
src/repository: Shared repositories (cache, flight) abstracting Redis and other storage operations.
src/core: Shared primitives (error classes, status codes, response builders, payment status mappings).
src/config: Environment bootstrapping (dotenv), database pool setup, Redis client, supplier configuration manager, Winston logger.
views: EJS templates for hosted payment success/error pages.
4. Key Request–Response Flows
Flight Search (GET /api/flights/search)
Route: src/routes/flight.routes.js forwards to controller.
Controller: flight.controller.js builds search and filter objects.
Service: flight.service.js validates params, checks Redis cache, fetches active suppliers via suppliers.config.js, and runs fetchFromSupplier in parallel.
Normalization: Supplier raw data travels through the assembly line (mappers, validators, transformers) and FlightAggregator deduplicates, filters, sorts, and paginates.
Response: FlightResponseBuilder crafts an industry-style payload with offers, dictionaries, pagination, and metadata. Result is cached for ~5 minutes.
Flight Price Confirmation (POST /api/flights/price)
Client sends a selected flightOffer from search results.
Controller validates presence and calls flightService.priceFlights.
Service selects the Amadeus supplier and calls getFlightPrice, returning confirmed pricing data ready for booking.
Booking Creation (POST /api/bookings/create)
Controller in booking.controller.js accepts flightData, traveler details, and contact info; user ID is optional.
bookingService.createBooking starts a DB transaction: inserts booking record, generates booking reference, stores travelers, logs contact info, and commits.
Response returns booking ID/reference, status (pending), pricing, and contact summary.
Payment Initiation (POST /api/payments/create)
Payment controller validates bookingId, chooses acquirer (RAZORPAY default), and forwards to paymentService.initiatePayment.
Payment service loads booking, ensures status is pending, creates a payment record, talks to the selected acquirer via AcquirerFactory, and stores order IDs & checkout data.
Booking status flips to payment_initiated. Response includes payment reference and checkout instructions (URL/form data).
Callbacks/webhooks (payment.controller.js) verify payment, update statuses, and confirm bookings (confirmed on success). Refunds, status checks, and webhooks follow the same service.
5. Supplier Integration & Normalization
Supplier activation: suppliers.config.js controls which suppliers are active, their priority, timeouts, and credentials. Additional suppliers can be toggled with isActive or added via SupplierConfigManager.addSupplier.
Factory pattern: supplierFactory.js keeps controllers/services unaware of specific supplier classes.
Amadeus adapter: suppliers/amadeus wraps flight search, pricing, orders, reference, and analytics endpoints into a consistent interface.
Assembly line: assembly_line mappers translate supplier-specific payloads into internal structures; validators enforce required fields; transformers calculate totals, durations, layovers; aggregator handles deduplication between suppliers. Result: clients always receive the same schema regardless of upstream source.
Dictionaries: utils/DictionariesManager.js constructs airline/airport/aircraft lookups so UIs can display readable names.
6. Data, Cache, and Payments
Database (PostgreSQL via Neon)
Connection: config/database.js uses pg with SSL defaults suited for Neon.
Initialization: models/index.js creates tables (users, bookings, travelers, payments, acquirers, standard_status_codes, acquirer_status_mapping) on startup.
Access: Services call getPool() and either run SQL directly (e.g., bookings) or leverage model helpers like payment.model.js.
Cache (Redis)
Optional but recommended. config/redis.js attempts connection; failures degrade gracefully with warnings.
Repository: repository/cache.repo.js provides set, get, delete, and clear. Flight search caches results for faster repeated queries.
Payment Gateways
Acquirer abstraction: payments/acquirers defines a common interface (createOrder, verifyPayment, checkStatus, processRefund, handleWebhook) implemented for Razorpay and Stripe.
Status harmonization: core/PaymentStatusCodes.js maps acquirer-specific codes into standard statuses; models/acquirer-status-mapping.model.js stores DB mappings for analytics and callbacks.
Hosted pages: views contains EJS templates for success/failure redirections when acquirer cannot redirect directly to SPA screens.
7. Scalability, Security, and Future Expansion
Scalability
Add more suppliers by registering them in suppliers.config.js and implementing adapters; aggregator already supports many results.
Redis caching reduces supplier calls and enables rate control. Consider sharding or multi-region caches for global latency.
Stateless Express nodes can sit behind a load balancer; ensure shared Redis/DB resources handle connection pools.
Background workers could prefetch popular routes or sync bookings from external systems.
Security
Use HTTPS everywhere; store env secrets via vault solutions or managed secret stores.
Enable authentication middleware (currently optional in bookings) for user-protected endpoints.
Validate and sanitize user input; controllers already use typed responses, but add JOI/Zod validation if stricter rules are needed.
Log sensitive data cautiously; mask payment details before logging. Winston logger supports transports for centralized logging.
Enforce CORS and rate limiting in src/app.js if public APIs are exposed.
Keep dependencies patched (npm audit, automated updates).
Future Expansion Ideas
Multi-currency pricing: Extend supplier calls with currency parameters and implement FX service for fallback conversions.
Ancillary services: Add baggage, seat selection, insurance modules, likely new tables and supplier endpoints (already planned in assembly line).
Loyalty & Profiles: Enhance user.model.js and add loyalty tables for repeat travelers.
Automated queueing: Introduce queues (e.g., RabbitMQ) for payment confirmations, ticketing, and supplier retries.
Analytics dashboards: Leverage existing analytics APIs to feed BI tools; consider materialized views in PostgreSQL for aggregated metrics.
Monitoring & alerts: Add Prometheus metrics, health dashboards, and alerting on supplier timeouts or payment failures.

---

## 8. Complete API Endpoints Reference

### 🔐 Authentication APIs (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Create new user account with email, phone, password | Public |
| POST | `/api/auth/login` | Authenticate user and receive JWT token | Public |
| POST | `/api/auth/verify-email` | Verify email with OTP sent during signup | Public |
| POST | `/api/auth/verify-phone` | Verify phone number with OTP | Public |
| POST | `/api/auth/resend-email-otp` | Resend email verification OTP | Public |
| POST | `/api/auth/resend-phone-otp` | Resend phone verification OTP | Public |
| GET | `/api/auth/profile` | Get current user profile details | Yes (JWT) |
| POST | `/api/auth/logout` | Logout user (client-side token removal) | Yes (JWT) |

### ✈️ Flight APIs (`/api/flights`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/flights/search` | Search flights with filters (origin, destination, dates, cabin, stops, price range) | Public |
| POST | `/api/flights/price` | Validate/confirm flight price before booking | Public |
| GET | `/api/flights/:flightId` | Get detailed flight information by ID | Public |

**Search Query Parameters:**
- `origin`, `destination` (required) - IATA codes
- `departureDate` (required), `returnDate` (optional)
- `adults`, `children`, `infants` - Passenger counts
- `cabin` - ECONOMY, BUSINESS, FIRST
- `nonStopOnly` - true/false
- `sortBy` - PRICE_ASC, DURATION_ASC, DEPARTURE_TIME_ASC, BEST
- `maxPrice`, `minPrice`, `airlines`, `maxStops`

### 📋 Booking APIs (`/api/bookings`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/bookings/create` | Create new flight booking with traveler details | Optional |
| POST | `/api/bookings/create-and-pay` | Create booking and initiate payment in one step | Optional |
| GET | `/api/bookings/:bookingId` | Get booking details by booking ID | Optional |
| GET | `/api/bookings/reference/:bookingReference` | Get booking by reference number (email verification for guests) | Public |
| GET | `/api/bookings/my-bookings` | Get all bookings for logged-in user | Yes (JWT) |
| POST | `/api/bookings/:bookingId/cancel` | Cancel a booking (refund if applicable) | Optional |

### 💳 Payment APIs (`/api/payments`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/payments/create` | Create/initiate payment for a booking | Public |
| POST | `/api/payments/callback` | Handle payment callback/verification (POST) | Public (Gateway) |
| GET | `/api/payments/callback` | Handle payment redirect callback (GET) | Public (Gateway) |
| GET | `/api/payments/:paymentReference` | Get payment details by reference | Public |
| GET | `/api/payments/:paymentReference/status` | Check current payment status | Public |
| POST | `/api/payments/:paymentReference/refund` | Process refund for a payment | Admin |
| GET | `/api/payments/booking/:bookingId` | Get all payments associated with a booking | Public |
| POST | `/api/payments/webhook/razorpay` | Razorpay webhook endpoint (signature verified) | Public (Webhook) |
| POST | `/api/payments/webhook/stripe` | Stripe webhook endpoint (signature verified) | Public (Webhook) |

**Supported Payment Gateways:**
- Razorpay (Default)
- Stripe

### 🌍 Reference Data APIs (`/api/reference`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/reference/locations/search` | Search airports/cities for autocomplete (min 3 chars) | Public |
| GET | `/api/reference/airports/:iataCode` | Get airport details by IATA code (e.g., BOM, DEL) | Public |
| GET | `/api/reference/cities/:cityCode/airports` | Get all airports in a city (e.g., LON, NYC) | Public |
| GET | `/api/reference/airlines/:airlineCode` | Get airline information by IATA code (e.g., AI, EK) | Public |
| GET | `/api/reference/airlines/:airlineCode/routes` | Get routes served by an airline | Public |

**Location Search Query:**
- `q` - Search keyword (required, min 3 chars)
- `type` - AIRPORT, CITY, or AIRPORT,CITY (default: both)

### 📊 Analytics APIs (`/api/analytics`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/analytics/cheapest-dates` | Get cheapest dates to fly (price calendar) | Public |
| GET | `/api/analytics/destinations` | Get flight destination suggestions from origin | Public |
| GET | `/api/analytics/popular-routes` | Get popular routes from an origin city | Public |
| GET | `/api/analytics/health` | Analytics API health check | Public |

**Cheapest Dates Query:**
- `origin`, `destination` (required)
- `departureDate`, `duration`, `oneWay`, `nonStop`, `maxPrice`

**Destinations Query:**
- `origin` (required)
- `departureDate`, `duration`, `oneWay`, `nonStop`, `maxPrice`

### 🏥 Health Check APIs (`/api`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/health` | Main API health check with all endpoint listings | Public |

**Response includes:**
- API status (OK/Error)
- Timestamp
- Available endpoint categories
- Database connection status
- Redis cache status

---

## 9. Request/Response Examples

### Flight Search Example
```http
GET /api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-31&adults=1&cabin=ECONOMY
```

**Response:**
```json
{
  "meta": {
    "currency": "INR",
    "totalResults": 45,
    "page": 1,
    "pageSize": 50,
    "sorting": "PRICE_ASC",
    "suppliersUsed": ["amadeus"],
    "requestId": "1735398000_BOM-DXB",
    "responseTimeMs": 2341
  },
  "search": {
    "origin": "BOM",
    "destination": "DXB",
    "departureDate": "2025-12-31",
    "tripType": "ONE_WAY",
    "adults": 1,
    "cabin": "ECONOMY"
  },
  "data": [
    {
      "id": "OFFER_1",
      "pricing": {
        "totalAmount": 10873.65,
        "currency": "INR"
      },
      "itinerary": { /* flight segments */ }
    }
  ],
  "dictionaries": {
    "airlines": { /* airline codes */ },
    "airports": { /* airport codes */ }
  }
}
```

### Create Booking Example
```http
POST /api/bookings/create
Content-Type: application/json

{
  "flightData": { /* validated flight offer */ },
  "travelers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "gender": "MALE",
      "nationality": "IN",
      "documentType": "PASSPORT",
      "documentNumber": "P1234567",
      "documentExpiry": "2030-12-31",
      "email": "john@example.com",
      "phone": "+917000000000"
    }
  ],
  "contactEmail": "john@example.com",
  "contactPhone": "+917000000000",
  "totalPrice": 10873.65,
  "currency": "INR"
}
```

**Response:**
```json
{
  "success": true,
  "bookingId": 123,
  "bookingReference": "BK-20251228-45678",
  "status": "pending",
  "totalPrice": 10873.65,
  "currency": "INR",
  "createdAt": "2025-12-28T10:30:00Z"
}
```

### Create Payment Example
```http
POST /api/payments/create
Content-Type: application/json

{
  "bookingId": 123,
  "acquirer": "RAZORPAY",
  "customerEmail": "john@example.com",
  "customerName": "John Doe",
  "customerPhone": "+917000000000",
  "successUrl": "https://yourapp.com/payment/success",
  "failureUrl": "https://yourapp.com/payment/failure"
}
```

**Response:**
```json
{
  "success": true,
  "paymentReference": "PAY-20251228-98765",
  "status": "CREATED",
  "checkoutUrl": "https://checkout.razorpay.com/v1/checkout.js",
  "orderId": "order_xyz123",
  "amount": 10873.65,
  "currency": "INR"
}
```

---

