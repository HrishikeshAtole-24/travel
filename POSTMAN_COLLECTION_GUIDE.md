# Complete Travel Booking API - Postman Collection Guide

## 📋 Overview
This is a comprehensive Postman collection with **ALL** APIs from your backend, including:
- ✅ Authentication (Sign Up, Login, Verification)
- ✅ Flight Search & Price Validation
- ✅ Booking Management (Create, View, Cancel)
- ✅ Payment Integration (Razorpay, Stripe)
- ✅ Reference Data (Airports, Airlines, Cities)
- ✅ Analytics (Cheapest Dates, Popular Routes)
- ✅ Health Check endpoints

## 📂 Collection Structure

### 1. Authentication (8 APIs)
- **Sign Up** - Create new user account
- **Login** - Authenticate and get JWT token
- **Verify Email** - Verify email with OTP
- **Verify Phone** - Verify phone with OTP
- **Resend Email OTP** - Resend email verification code
- **Resend Phone OTP** - Resend phone verification code
- **Get Profile** - Get current user details (requires auth)
- **Logout** - Logout user

### 2. Health Check (2 APIs)
- **API Health** - Check API server status
- **Analytics Health** - Check analytics service status

### 3. Flight Search & Booking (6 APIs)
- **Search Flights - Basic** - Simple one-way search
- **Search Flights - Round Trip** - Round trip with return date
- **Search Flights - Non-Stop Only** - Direct flights only
- **Search Flights - Business Class** - Premium cabin search
- **Search Flights - With Filters** - Advanced filtering
- **Flight Price Validation** - Verify and confirm pricing

### 4. Booking Management (6 APIs)
- **Create Booking** - Create flight booking (guest or logged-in)
- **Create Booking and Pay** - Combined booking + payment flow
- **Get Booking by ID** - Retrieve booking details
- **Get Booking by Reference** - Retrieve by reference number
- **Get My Bookings** - All bookings for logged-in user (requires auth)
- **Cancel Booking** - Cancel and process refund

### 5. Payment Management (8 APIs)
- **Create Payment** - Initiate payment for booking
- **Payment Callback** - Handle payment gateway callback
- **Get Payment Details** - Retrieve payment info
- **Get Payment Status** - Check payment status
- **Process Refund** - Issue refund for payment
- **Get Payments by Booking** - All payments for a booking
- **Razorpay Webhook** - Razorpay webhook endpoint
- **Stripe Webhook** - Stripe webhook endpoint

### 6. Reference Data APIs (9 APIs)
- **Location Search - Mumbai** - Search airports/cities
- **Location Search - Delhi** - Search with multiple types
- **Airport Info - BOM** - Mumbai airport details
- **Airport Info - DEL** - Delhi airport details
- **City Airports - London** - All airports in London
- **City Airports - New York** - All airports in NYC
- **Airline Info - Emirates** - Emirates airline details
- **Airline Info - Air India** - Air India details
- **Airline Routes - Air India** - Air India route network

### 7. Analytics APIs (5 APIs)
- **Cheapest Dates - BOM to DXB** - Find cheapest travel dates
- **Cheapest Dates - DEL to LHR** - Price calendar
- **Destinations from BOM** - Available destinations
- **Destinations from DEL** - One-way destinations
- **Popular Routes from BOM** - Top routes from Mumbai

## 🔧 Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select `Travel Booking API - Complete Collection.postman_collection.json`
4. Click **Import**

### 2. Configure Environment Variable
Set the base URL variable:
- **Variable Name**: `baseUrl`
- **Value**: `http://localhost:5000/api`

### 3. Authentication Token (for protected routes)
After login, copy the JWT token from response and set:
- **Variable Name**: `authToken`
- **Value**: `your-jwt-token-here`

## 🎯 Common Workflows

### Workflow 1: User Registration & Login
1. **Sign Up** → Create account
2. **Verify Email** → Verify with OTP
3. **Verify Phone** → Verify with OTP
4. **Login** → Get JWT token
5. **Get Profile** → Verify login (use token)

### Workflow 2: Guest Booking (No Login Required)
1. **Search Flights** → Find flights
2. **Flight Price Validation** → Confirm price
3. **Create Booking and Pay** → Complete booking + payment in one step
4. **Get Booking by Reference** → Retrieve booking details

### Workflow 3: Authenticated User Booking
1. **Login** → Get JWT token
2. **Search Flights** → Find flights
3. **Create Booking** → Create booking (auto-linked to user)
4. **Create Payment** → Initiate payment
5. **Get My Bookings** → View all bookings

### Workflow 4: Payment Flow
1. **Create Booking** → Create the booking first
2. **Create Payment** → Initiate payment (returns payment URL)
3. **Payment Callback** → Gateway calls this after payment
4. **Get Payment Status** → Check payment status
5. **Get Payments by Booking** → View all payment attempts

## 📝 Important Notes

### Authentication Headers
Protected routes require JWT token in header:
```
Authorization: Bearer {{authToken}}
```

### Guest vs Authenticated Bookings
- **Guest**: Use `contactEmail` and `contactPhone` in booking request
- **Authenticated**: JWT token automatically links booking to user

### Payment Acquirers
Supported payment gateways:
- `RAZORPAY` - Razorpay integration
- `STRIPE` - Stripe integration

### Date Formats
- **departureDate**: `YYYY-MM-DD` (e.g., `2025-12-25`)
- **dateOfBirth**: `YYYY-MM-DD` (e.g., `1990-05-15`)
- **documentExpiry**: `YYYY-MM-DD`

### Phone Format
International format with country code:
```
+919876543210
```

## 🔍 Testing Tips

### 1. Test Authentication Flow
- Use unique email/phone for each test
- Save the token after login
- Test with and without token

### 2. Test Booking Flow
- Test as guest (no token)
- Test as authenticated user (with token)
- Test cancellation and refunds

### 3. Test Payment Integration
- Test different acquirers (Razorpay, Stripe)
- Test success and failure scenarios
- Verify webhook handling

### 4. Test Reference Data
- Test location search with different keywords
- Verify airport and airline info
- Check city airport listings

## 🚀 API Counts Summary

| Category | Number of APIs |
|----------|----------------|
| Authentication | 8 |
| Health Check | 2 |
| Flight Search | 6 |
| Booking Management | 6 |
| Payment Management | 8 |
| Reference Data | 9 |
| Analytics | 5 |
| **TOTAL** | **44 APIs** |

## 📞 Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Verify `.env` configuration
3. Ensure database is connected
4. Check payment gateway credentials

## 🎉 What's New in This Version

✅ **Added Authentication APIs** (Sign Up, Login, Verification)  
✅ **Added Booking Management** (Create, View, Cancel)  
✅ **Added Payment Integration** (Create, Verify, Refund, Webhooks)  
✅ **Complete Request Bodies** with example data  
✅ **Detailed Descriptions** for each endpoint  
✅ **Support for Guest & Authenticated flows**  
✅ **Combined Booking + Payment workflow**  

---

**File Location**: `Travel Booking API - Complete Collection.postman_collection.json`  
**Last Updated**: December 13, 2025  
**Version**: 2.0 (Complete Edition)
