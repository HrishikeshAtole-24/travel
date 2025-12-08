# 🚀 Travel Booking Platform - Backend API

Professional-grade travel booking platform built with **Node.js + Express**, featuring supplier integration (Amadeus) and assembly line architecture.

## 🏗️ Architecture

```
Suppliers (Amadeus, Sabre, etc.) 
    ↓
Assembly Line (Mapper → Validator → Transformer)
    ↓
Service Layer (Business Logic)
    ↓
Repository (DB + Cache)
    ↓
API Response
```

## 📁 Project Structure

```
/src
 ├── config/          # Database, Redis, Logger config
 ├── core/            # ApiResponse, ApiError, StatusCodes
 ├── routes/          # API route definitions
 ├── controllers/     # Request/Response handlers
 ├── services/        # Business logic
 ├── repository/      # DB queries + Redis cache
 ├── suppliers/       # Third-party API integrations
 ├── assembly_line/   # Data normalization pipeline
 ├── models/          # MySQL database models
 ├── utils/           # Utility functions
 └── middleware/      # Error handling, logging, auth
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Cache**: Redis
- **API Provider**: Amadeus
- **Logger**: Winston
- **HTTP Client**: Axios

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Travel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

4. **Setup MySQL Database**
   ```sql
   CREATE DATABASE travel_booking;
   ```

5. **Start Redis**
   ```bash
   redis-server
   ```

6. **Run the server**
   ```bash
   npm run dev
   ```

## 🔑 Environment Variables

Create a `.env` file with the following:

```env
PORT=5000
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=travel_booking

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Amadeus API
AMADEUS_API_KEY=your_api_key
AMADEUS_API_SECRET=your_api_secret
AMADEUS_BASE_URL=https://test.api.amadeus.com/v1

# JWT
JWT_SECRET=your_secret_key
```

## 🚀 API Endpoints

### Health Check
```
GET /api/health
```

### Flight Search
```
GET /api/flights/search?origin=DEL&destination=BOM&departureDate=2024-12-15&adults=1
```

### Flight Details
```
GET /api/flights/:flightId
```

## 🧩 Supplier Architecture

The system uses a **plug-and-play supplier architecture**:

```javascript
const supplier = supplierFactory('amadeus');
const flights = await supplier.searchFlights(params);
```

**Adding a new supplier** (e.g., Sabre):
1. Create `/suppliers/sabre/` folder
2. Implement `sabre.client.js` and `sabre.flight.js`
3. Add to `supplierFactory.js`

No changes needed in service layer! 🔥

## 🏭 Assembly Line Flow

```
Raw Amadeus Data 
    → Mapper (standardize format)
    → Validator (validate data)
    → Transformer (enhance & normalize)
    → Final Response
```

## 💾 Caching Strategy

- **Flight Search**: Cached for 30 minutes
- **Flight Details**: Cached for 1 hour
- Cache key format: `flights:{origin}:{destination}:{date}`

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP
);
```

### Bookings Table
```sql
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  flight_id VARCHAR(100),
  booking_reference VARCHAR(50),
  total_price DECIMAL(10,2),
  status ENUM('pending', 'confirmed', 'cancelled'),
  created_at TIMESTAMP
);
```

## 🔐 Authentication

Protected routes require JWT token:

```bash
Authorization: Bearer <your_token>
```

## 📝 Logging

Winston logger writes to:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- Console - Development mode

## 🧪 Testing

```bash
npm test
```

## 🎯 Next Steps

1. ✅ Build DB Models (MySQL Schema)
2. ✅ Implement Redis Cache Layer
3. ✅ Create Amadeus Token Manager
4. ✅ Create Flight Search Endpoint

**What's Next?**
- Add booking creation endpoint
- Add payment gateway integration
- Add user authentication system
- Add email notifications

## 📄 License

ISC

---

**Built with 🔥 by Team Travel**
