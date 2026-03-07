# ✈️ SkyWings - Complete Travel Booking Platform

**Production-ready full-stack travel booking platform** built with modern technologies, featuring intelligent flight search, multi-supplier aggregation, payment processing, and AI-powered assistance.

> **Status:** 🚀 Production Ready | **Industry Standard:** MakeMyTrip/Booking.com Architecture

---

## 🌟 Overview

SkyWings is a comprehensive travel booking platform that rivals industry leaders like MakeMyTrip, Booking.com, and Goibibo. It features a powerful multi-supplier flight search API, intelligent booking management, secure payment processing, and an AI chatbot assistant.

### 🎯 Key Highlights

- 🔥 **Multi-supplier Architecture** - Parallel API calls with timeout protection
- 🌍 **9,000+ Airports Database** - Complete worldwide coverage with smart search
- 🤖 **AI Travel Assistant** - SkyBot powered by Groq AI (Llama 3.3 70B)
- 💳 **Dual Payment Gateways** - Razorpay & Stripe integration
- 📱 **Responsive Frontend** - Pure CSS3, zero frameworks, production-ready
- ⚡ **Industry-Standard APIs** - NDC/OTA compliant response formats
- 🔐 **Complete Auth System** - JWT with email/phone OTP verification
- 📊 **Analytics & Insights** - Cheapest dates, destinations, popular routes

---

## 📁 Project Structure

```
travel/
├── backend/                    # Node.js + Express API Server
│   ├── src/
│   │   ├── app.js             # Express app configuration
│   │   ├── server.js          # Server entry point
│   │   ├── assembly_line/     # Data normalization pipeline
│   │   │   ├── aggregator.js  # Multi-supplier aggregation
│   │   │   ├── mappers/       # Supplier → Standard format
│   │   │   ├── transformers/  # Data transformation
│   │   │   └── validators/    # Field validation
│   │   ├── config/            # Configuration modules
│   │   │   ├── database.js    # PostgreSQL (Supabase)
│   │   │   ├── redis.js       # Redis cache
│   │   │   ├── suppliers.config.js
│   │   │   └── winstonLogger.js
│   │   ├── controllers/       # HTTP request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── flight.controller.js
│   │   │   ├── booking.controller.js
│   │   │   ├── chat.controller.js
│   │   │   ├── analytics.controller.js
│   │   │   └── reference.controller.js
│   │   ├── services/          # Business logic layer
│   │   │   ├── flight.service.js
│   │   │   ├── booking.service.js
│   │   │   ├── auth.service.js
│   │   │   ├── email.service.js
│   │   │   ├── ai.service.js
│   │   │   └── ticket.service.js
│   │   ├── suppliers/         # Third-party integrations
│   │   │   ├── amadeus/       # Amadeus flight API
│   │   │   └── supplierFactory.js
│   │   ├── payments/          # Payment processing
│   │   │   ├── payment.service.js
│   │   │   ├── payment.controller.js
│   │   │   └── acquirers/     # Razorpay, Stripe
│   │   ├── models/            # Database models
│   │   │   ├── user.model.js
│   │   │   ├── booking.model.js
│   │   │   ├── payment.model.js
│   │   │   ├── airport.model.js
│   │   │   └── traveler.model.js
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── requestLogger.middleware.js
│   │   ├── core/              # Shared primitives
│   │   │   ├── ApiResponse.js
│   │   │   ├── ApiError.js
│   │   │   ├── StatusCodes.js
│   │   │   └── FlightResponseFormat.js
│   │   └── routes/            # API route definitions
│   ├── scripts/               # Utility scripts
│   │   └── import-all-airports.js
│   ├── views/                 # EJS templates (payment pages)
│   ├── logs/                  # Winston log files
│   ├── .env                   # Environment variables
│   └── package.json
│
└── frontend/                   # Next.js 14+ Frontend
    ├── app/
    │   ├── page.js            # Homepage
    │   ├── layout.js          # Root layout
    │   ├── globals.css        # Global styles & CSS variables
    │   ├── auth/              # Authentication pages
    │   │   ├── login/
    │   │   └── signup/
    │   ├── search/            # Flight search results
    │   ├── booking/           # Booking form
    │   │   └── details/[id]/  # Booking details
    │   ├── payment/           # Payment page
    │   ├── payment-success/   # Success page
    │   ├── payment-failed/    # Failure page
    │   ├── confirmation/      # Booking confirmation
    │   ├── my-bookings/       # User bookings list
    │   ├── profile/           # User profile
    │   ├── contact/           # Contact page
    │   ├── privacy-policy/    # Privacy policy
    │   ├── terms-and-conditions/
    │   ├── refund-policy/
    │   ├── components/        # Reusable components
    │   │   ├── Header/
    │   │   ├── Footer/
    │   │   ├── Hero/
    │   │   ├── FlightSearchWidget/
    │   │   ├── FlightCard/
    │   │   ├── SearchFilters/
    │   │   ├── Chatbot/       # AI chatbot component
    │   │   ├── PopularDestinations/
    │   │   ├── WhyChooseUs/
    │   │   └── ... (19 components)
    │   └── contexts/
    │       └── AuthContext.js # Authentication context
    ├── lib/
    │   └── api/               # API client functions
    │       ├── client.js
    │       ├── flights.js
    │       └── config.js
    ├── .env.local             # Frontend environment variables
    └── package.json
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime environment | 16+ |
| **Express.js** | Web framework | 4.18+ |
| **PostgreSQL** | Primary database | Latest |
| **Supabase** | Database hosting | Cloud |
| **Redis** | Caching layer (optional) | 4.7+ |
| **Amadeus API** | Flight data supplier | v1/v2 |
| **Groq AI** | AI chatbot (Llama 3.3 70B) | Latest |
| **Razorpay** | Payment gateway | Latest |
| **Stripe** | Payment gateway | Latest |
| **JWT** | Authentication | 9.0+ |
| **Winston** | Logging | 3.11+ |
| **Nodemailer** | Email service | 7.0+ |
| **PDFKit** | Ticket generation | 0.17+ |
| **Bcrypt** | Password hashing | 6.0+ |
| **EJS** | Template engine | 3.1+ |

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React framework | 16.1+ |
| **React** | UI library | 19.2+ |
| **Pure CSS3** | Styling (no frameworks!) | - |
| **Font Awesome** | Icons | 6.5+ |
| **Currency Symbol Map** | Currency formatting | 5.1+ |

### Infrastructure

| Service | Purpose | Status |
|---------|---------|--------|
| **Supabase** | PostgreSQL hosting | ✅ Active |
| **Render** | Backend hosting | ✅ Deployed |
| **Vercel** | Frontend hosting | ✅ Deployed |
| **Redis Cloud** | Optional cache | Optional |

---

## ✨ Features

### 🔐 Authentication & User Management
- ✅ Sign up with email & password
- ✅ Login with JWT tokens
- ✅ Email OTP verification
- ✅ Phone OTP verification (ready for SMS service)
- ✅ Password hashing with Bcrypt
- ✅ Protected routes & middleware
- ✅ User profile management
- ✅ Session management with configurable timeout
- ✅ Guest booking support (optional auth)

### ✈️ Flight Search & Booking
- ✅ **Multi-supplier architecture** (currently Amadeus, extensible)
- ✅ **Parallel API calls** with timeout protection
- ✅ **Smart deduplication** - keeps cheapest flight from duplicate offers
- ✅ **Advanced filtering:**
  - Price range
  - Number of stops (non-stop, 1 stop, 2+ stops)
  - Airlines
  - Departure time ranges
  - Cabin class
  - Refundable/non-refundable
- ✅ **Intelligent sorting:** Price, duration, departure time, "best value"
- ✅ **Pagination** with configurable page size
- ✅ **Round trip & one-way** support
- ✅ **Multi-passenger** support (up to 9 passengers)
- ✅ **Price validation** before booking
- ✅ **Complete booking flow:**
  - Traveler details (passport, DOB, nationality)
  - Contact information
  - Special requests
  - Seat preferences
- ✅ **Booking management:**
  - View all bookings
  - Filter by status (Confirmed, Pending, Cancelled)
  - Cancel bookings with reasons
  - Download e-tickets (PDF)
  - Email confirmations
- ✅ **Industry-standard response format** (NDC/OTA compliant)

### 🌍 Airport Database (9,000+ Airports)
- ✅ **Complete worldwide coverage:**
  - ~600 large airports (major hubs)
  - ~4,500 medium airports (regional)
  - ~4,000 small airports (optional import)
- ✅ **Intelligent search & autocomplete:**
  - Search by city name, airport name, IATA/ICAO codes
  - Smart ranking (exact matches first)
  - Priority scoring (major hubs prioritized)
  - Country filtering
  - Debounced API calls for performance
- ✅ **Rich airport data:**
  - IATA & ICAO codes
  - Full airport names
  - City, country, continent
  - GPS coordinates
  - Timezone information
  - Airport type & size
- ✅ **Popular airports API**
- ✅ **Country-wise filtering**
- ✅ **Database statistics & health check**

### 💳 Payment Processing
- ✅ **Dual gateway support:** Razorpay & Stripe
- ✅ **Factory pattern architecture** for easy gateway addition
- ✅ **Payment flow:**
  - Order creation
  - Hosted payment pages (EJS templates)
  - Signature verification
  - Webhook handling
  - Callback processing
- ✅ **Payment status tracking:**
  - CREATED, PENDING, PROCESSING
  - SUCCESS, FAILED, CANCELLED
  - REFUNDED, EXPIRED
- ✅ **Acquirer status mapping** (gateway-specific codes → standard status)
- ✅ **Refund processing**
- ✅ **Payment history & audit trail**
- ✅ **Secure payment pages** with SSL
- ✅ **Multi-currency support** (INR, USD, EUR)

### 🤖 AI Travel Assistant (SkyBot)
- ✅ **Groq AI integration** with Llama 3.3 70B Versatile model
- ✅ **Conversational interface** - persistent chat widget
- ✅ **Travel expertise:**
  - Flight recommendations
  - Destination suggestions
  - Travel tips & advice
  - Booking assistance
  - FAQ handling
- ✅ **Context-aware responses** with system prompts
- ✅ **Real-time streaming** responses
- ✅ **Chat history** persistence
- ✅ **Responsive chat UI** with animations

### 📊 Analytics & Insights
- ✅ **Cheapest dates API:**
  - Find best prices for flexible dates
  - 7-day rolling window
  - Price trends visualization-ready
- ✅ **Flight destinations API:**
  - Travel inspiration
  - Discover destinations from origin
  - Price range filtering
  - One-way/round-trip options
- ✅ **Popular routes API:**
  - Most searched routes
  - Route statistics
  - Regional trends
- ✅ **Analytics health check**

### 📚 Reference Data APIs
- ✅ **Location search** (autocomplete for cities/airports)
- ✅ **Airport information** by IATA code
- ✅ **City airports lookup** (all airports in a city)
- ✅ **Airline information** by code
- ✅ **Airline routes** (destinations served by airline)

### 📧 Email Notifications
- ✅ **Gmail SMTP integration**
- ✅ **Email templates:**
  - OTP verification
  - Booking confirmation
  - Payment receipts
  - Ticket delivery
  - Booking cancellation
- ✅ **HTML email support**
- ✅ **Attachment support** (PDF tickets)

### 🎫 Ticket Generation
- ✅ **PDF ticket generation** with PDFKit
- ✅ **Professional ticket design:**
  - Booking reference & PNR
  - Flight details (route, timings, airline)
  - Passenger information
  - Barcode for check-in
  - Baggage allowance
  - Booking & payment details
- ✅ **Download & email delivery**
- ✅ **Multi-passenger support**

### 🎨 Frontend Features
- ✅ **Responsive design** (mobile, tablet, desktop)
- ✅ **Pure CSS3** - no CSS frameworks, optimized performance
- ✅ **CSS variables** for consistent design system
- ✅ **19 reusable components:**
  - Header with auth state
  - Footer with links
  - Hero section
  - Flight search widget
  - Flight cards
  - Search filters
  - Date pickers
  - Airport autocomplete
  - Chatbot widget
  - Popular destinations
  - Airline partners
  - Offers & deals
  - FAQ accordion
  - And more...
- ✅ **Complete user flows:**
  - Homepage → Search → Results → Booking → Payment → Confirmation
  - My Bookings → Booking Details → Download Ticket
  - Login/Signup → Profile → Logout
- ✅ **Loading states & spinners**
- ✅ **Error handling & empty states**
- ✅ **Form validation**
- ✅ **Toast notifications**
- ✅ **Smooth animations & transitions**
- ✅ **Accessibility features** (ARIA labels, keyboard navigation)

### 🔧 Developer Experience
- ✅ **Comprehensive logging** with Winston (file-based)
- ✅ **Error handling middleware** with detailed stack traces
- ✅ **Request logging** for debugging
- ✅ **Environment-based configuration**
- ✅ **Graceful error recovery**
- ✅ **Database initialization scripts**
- ✅ **Airport data import scripts**
- ✅ **Test helpers & utilities**
- ✅ **Postman collection** with 60+ API examples
- ✅ **Batch scripts** for quick setup
- ✅ **20+ documentation files:**
  - Architecture guides
  - API references
  - Testing guides
  - Deployment guides
  - Implementation summaries

### 🚀 Deployment Ready
- ✅ **Vercel deployment** (frontend) - configured
- ✅ **Render deployment** (backend) - configured
- ✅ **Supabase database** - production-ready
- ✅ **Environment variable management**
- ✅ **CORS configuration** for production domains
- ✅ **SSL/HTTPS ready**
- ✅ **Keep-alive endpoints** (prevents service sleep)
- ✅ **Health check endpoints**
- ✅ **Production logging**

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 16+ installed
- **PostgreSQL** database (or Supabase account)
- **Amadeus API credentials** ([Get here](https://developers.amadeus.com))
- **Groq API key** ([Get here](https://console.groq.com))
- **Razorpay API keys** (optional, for payments)
- **Redis** (optional, for caching)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/travel.git
cd travel
```

### 2️⃣ Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see configuration section below)

# Import airport database (9,000+ airports)
npm run import:airports

# Start development server
npm run dev
```

The backend server will start at **http://localhost:5000**

### 3️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with backend URL

# Start development server
npm run dev
```

The frontend will start at **http://localhost:3000**

---

## ⚙️ Configuration

### Backend Environment Variables (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# PostgreSQL Database (Supabase)
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL=true
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (Optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Amadeus API (Flight Data)
AMADEUS_API_KEY=your_amadeus_api_key
AMADEUS_API_SECRET=your_amadeus_api_secret
AMADEUS_API_URL=https://test.api.amadeus.com

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_change_in_production

# Email (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Payment Gateways
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Groq AI (Chatbot)
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your_groq_api_key

# Session Configuration (in minutes)
SESSION_TIMEOUT_MINUTES=60
PAYMENT_EXTENSION_MINUTES=20

# Logging
LOG_LEVEL=info
```

### Frontend Environment Variables (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payment Gateway (Public Keys)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_GUEST_BOOKING=true
```

---

## 📡 API Endpoints

### Health Check
- `GET /api/health` - System health check

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify email OTP
- `POST /api/auth/verify-phone` - Verify phone OTP
- `POST /api/auth/resend-email-otp` - Resend email OTP
- `POST /api/auth/resend-phone-otp` - Resend phone OTP
- `GET /api/auth/profile` - Get user profile (protected)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/session-config` - Get session configuration

### Flight Search
- `GET /api/flights/search` - Search flights
  - Query params: `origin`, `destination`, `departureDate`, `returnDate`, `adults`, `children`, `infants`, `cabin`, `nonStopOnly`
- `POST /api/flights/price` - Validate flight price
- `GET /api/flights/:flightId` - Get flight details

### Booking Management
- `POST /api/bookings/create` - Create booking (optional auth)
- `POST /api/bookings/create-and-pay` - Create booking + initiate payment
- `GET /api/bookings/my-bookings` - Get user bookings (protected)
- `GET /api/bookings/reference/:bookingReference` - Get by reference
- `GET /api/bookings/:bookingReference/ticket` - Download ticket PDF
- `POST /api/bookings/:bookingReference/send-confirmation` - Email ticket
- `GET /api/bookings/:bookingId` - Get booking by ID (protected)
- `POST /api/bookings/:bookingId/cancel` - Cancel booking

### Payment Processing
- Payment gateway integration endpoints (see payment documentation)
- Webhook handlers for Razorpay & Stripe
- Payment status check & refund endpoints

### Airport Search
- `GET /api/airports/search` - Search airports (autocomplete)
  - Query params: `q`, `limit`, `country`
- `GET /api/airports/popular` - Get popular airports
- `GET /api/airports/stats` - Database statistics
- `GET /api/airports/db-status` - Database status check
- `GET /api/airports/country/:code` - Airports by country
- `GET /api/airports/:code` - Airport by IATA code

### Reference Data
- `GET /api/reference/locations/search` - Location autocomplete
- `GET /api/reference/airports/:iataCode` - Airport information
- `GET /api/reference/cities/:cityCode/airports` - City airports
- `GET /api/reference/airlines/:airlineCode` - Airline information
- `GET /api/reference/airlines/:airlineCode/routes` - Airline routes

### Analytics
- `GET /api/analytics/cheapest-dates` - Find cheapest dates
- `GET /api/analytics/destinations` - Flight destinations
- `GET /api/analytics/popular-routes` - Popular routes
- `GET /api/analytics/health` - Analytics health check

### AI Chatbot
- `POST /api/chat` - Send message to SkyBot
- `POST /api/chat/travel-tips` - Get travel tips
- `POST /api/chat/itinerary` - Generate itinerary
- `GET /api/chat/analytics` - Chat analytics

### Keep-Alive
- `GET /api/keep-active-service` - Prevent service sleep

**📚 Complete API documentation:** See [backend/README.md](backend/README.md) and Postman collection

---

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Test health check
curl http://localhost:5000/api/health

# Test flight search
curl "http://localhost:5000/api/flights/search?origin=BOM&destination=DXB&departureDate=2025-12-25&adults=1"

# Run all API tests (batch script)
test-all-apis.bat

# Test price validation
test-price-validation.bat
```

### Frontend Testing

1. Open browser: **http://localhost:3000**
2. Test complete user flow:
   - Homepage → Search flights
   - Filter & sort results
   - Select flight → Book
   - Fill passenger details
   - Process payment
   - View confirmation
   - Check My Bookings

### Postman Collection

Import the provided Postman collection for 60+ API examples:
- `Travel Booking API - Complete Collection.postman_collection.json`

---

## 📚 Documentation

### Main Guides
- **[START_HERE.md](START_HERE.md)** - Implementation summary
- **[QUICK_START.md](QUICK_START.md)** - Setup instructions
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture
- **[INDETAIL.md](INDETAIL.md)** - In-depth technical guide

### Backend Documentation
- **[backend/README.md](backend/README.md)** - Complete API documentation
- **[AMADEUS_IMPLEMENTATION_COMPLETE.md](backend/AMADEUS_IMPLEMENTATION_COMPLETE.md)** - Amadeus API integration
- **[AUTH_AND_BOOKING_FLOW.md](backend/AUTH_AND_BOOKING_FLOW.md)** - Authentication & booking flow
- **[PAYMENT_INTEGRATION_GUIDE.md](backend/PAYMENT_INTEGRATION_GUIDE.md)** - Payment gateway integration
- **[AIRPORTS_DATABASE.md](AIRPORTS_DATABASE.md)** - Airport database guide
- **[AI_CHATBOT_GUIDE.md](AI_CHATBOT_GUIDE.md)** - SkyBot AI implementation

### Frontend Documentation
- **[FRONTEND_COMPLETE.md](FRONTEND_COMPLETE.md)** - Frontend features & components
- **[RESPONSIVE_DESIGN_COMPLETE.md](frontend/RESPONSIVE_DESIGN_COMPLETE.md)** - Responsive design guide
- **[BOOKING_INTEGRATION_COMPLETE.md](BOOKING_INTEGRATION_COMPLETE.md)** - Booking flow integration

### Deployment Guides
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - General deployment guide
- **[RENDER_DEPLOYMENT_GUIDE.md](backend/RENDER_DEPLOYMENT_GUIDE.md)** - Backend (Render)
- **[VERCEL_DEPLOYMENT_GUIDE.md](frontend/VERCEL_DEPLOYMENT_GUIDE.md)** - Frontend (Vercel)

### Testing Guides
- **[API_TESTING_GUIDE.md](backend/API_TESTING_GUIDE.md)** - API testing
- **[BOOKING_TESTING_GUIDE.md](BOOKING_TESTING_GUIDE.md)** - Booking flow testing
- **[RAZORPAY_TESTING_GUIDE.md](RAZORPAY_TESTING_GUIDE.md)** - Payment testing
- **[POSTMAN_COLLECTION_GUIDE.md](POSTMAN_COLLECTION_GUIDE.md)** - Postman usage

### Troubleshooting
- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** - Known issues & solutions
- **[FIXES_SUMMARY.md](FIXES_SUMMARY.md)** - Bug fixes & improvements
- **[LOGGING_FIXED.md](LOGGING_FIXED.md)** - Logging configuration

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │Components│  │ Contexts │  │   API    │   │
│  │          │  │          │  │  (Auth)  │  │  Client  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express.js)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   API Routes                         │   │
│  │  /flights  /bookings  /payments  /auth  /chat       │   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Controllers                         │   │
│  │  (Request handlers, validation, response formatting)│   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Services                          │   │
│  │  (Business logic, multi-supplier calls, caching)    │   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Suppliers  │  │   Payments   │  │   Database   │     │
│  │  (Amadeus)   │  │(Razorpay/    │  │ (PostgreSQL) │     │
│  │              │  │  Stripe)     │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Amadeus  │  │ Groq AI  │  │  Redis   │  │  Gmail   │   │
│  │   API    │  │  (Chat)  │  │  Cache   │  │  SMTP    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

1. **Multi-Supplier Architecture**: Factory pattern for extensible supplier integration
2. **Assembly Line Pattern**: Mapper → Validator → Transformer → Aggregator
3. **Acquirer Factory Pattern**: Pluggable payment gateway architecture
4. **Repository Pattern**: Separation of data access logic
5. **Middleware Chain**: Request logging → Auth → Validation → Error handling
6. **Service Layer**: Business logic isolation from routes/controllers

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting PR
- Keep commits atomic and well-described

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 🙏 Acknowledgments

- **Amadeus for Developers** - Flight data API
- **Groq AI** - Llama 3.3 70B model for chatbot
- **Supabase** - PostgreSQL database hosting
- **OurAirports.com** - Airport database
- **Razorpay & Stripe** - Payment processing
- **Font Awesome** - Icon library
- **Next.js Team** - Amazing React framework
- **Express.js Community** - Robust backend framework

---

## 📞 Support

For questions, issues, or feature requests:

- **Email**: rishiatole4545@gmail.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/travel/issues)
- **Documentation**: See the 20+ documentation files in the project

---

## 🚀 Deployment Status

| Service | Platform | Status | URL |
|---------|----------|--------|-----|
| **Backend** | Render | ✅ Live | https://travel-booking-api-j4op.onrender.com |
| **Frontend** | Vercel | ✅ Live | https://travel-chi-rust.vercel.app |
| **Database** | Supabase | ✅ Active | Private |

---

## 📊 Project Statistics

- **Total Lines of Code**: 15,000+
- **API Endpoints**: 50+
- **Documentation Files**: 20+
- **Frontend Components**: 19
- **Database Tables**: 9
- **Payment Gateways**: 2
- **AI Models**: 1 (Llama 3.3 70B)
- **Airports**: 9,000+
- **Development Time**: Professional-grade build

---

**Built with ❤️ by Hrishikesh Atole**

**Status**: 🚀 Production Ready | **Last Updated**: March 2026 
