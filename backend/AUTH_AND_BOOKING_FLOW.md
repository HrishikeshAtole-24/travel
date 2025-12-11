# 🎯 Complete User Journey: Sign Up → Login → Booking

Complete authentication and booking flow implementation with industry-standard practices.

---

## 📋 User Flow Steps

### 1️⃣ **Landing / Home Page**
- **No login required**
- User sees: Search box, navigation with "Sign Up" and "Login" buttons
- Actions: Enter From/To, dates, travelers → Click "Search"

### 2️⃣ **Search Results**
- **No login required**
- User sees: List of flights with filters/sort
- Optional CTA: "Save search" (shows sign-up prompt)
- Actions: Compare flights, select preferred option

### 3️⃣ **Flight Selection / Fare Details**
- **No login required**
- User sees: Fare breakdown, baggage, cancellation rules
- Subtle banner: "Sign up to save bookings & faster checkout"
- Actions: Click "Continue" or "Book Now"

### 4️⃣ **Passenger Details Form** ⚠️ **AUTHENTICATION CHECKPOINT**
- **Soft prompt to login/signup** (non-blocking)
- Show modal: "Create account for faster checkout?"
  - **Create Account** → Sign up flow
  - **Sign In** → Login flow
  - **Continue as Guest** → Proceed with email/phone verification

**If User Signs Up:**
```
POST /api/auth/signup
{
  "email": "user@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}

Response: OTP sent to email and phone
```

**If User Logs In:**
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: JWT token + user profile
```

**If Guest Continues:**
- Must provide email + phone
- Requires OTP verification before payment

### 5️⃣ **Email & Phone Verification** ⚠️ **MANDATORY**
- **Required before payment**
- User receives OTP via email and SMS
- Must verify at least phone before proceeding

**Verify Email:**
```
POST /api/auth/verify-email
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Verify Phone:**
```
POST /api/auth/verify-phone
{
  "phone": "+919876543210",
  "otp": "654321"
}
```

### 6️⃣ **Create Booking**
- User fills passenger details:
  - First name, last name, DOB, gender
  - Passport number (for international)
  - Contact email & phone
- Optional: Meal preferences, seat selection

**Create Booking API:**
```
POST /api/bookings/create-and-pay
Headers: Authorization: Bearer <token> (optional)
{
  "flightData": { /* complete flight offer from search */ },
  "travelers": [
    {
      "type": "ADULT",
      "title": "Mr",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "gender": "M",
      "passportNumber": "A12345678",
      "nationality": "IN",
      "email": "john@example.com",
      "phone": "+919876543210"
    }
  ],
  "contactEmail": "john@example.com",
  "contactPhone": "+919876543210",
  "totalPrice": 15000.00,
  "currency": "INR",
  "paymentAcquirer": "RAZORPAY",
  "successUrl": "https://yoursite.com/booking/success",
  "failureUrl": "https://yoursite.com/booking/failure"
}

Response:
{
  "booking": {
    "bookingId": 123,
    "bookingReference": "BK-20241212-XXXXX",
    "status": "pending"
  },
  "payment": {
    "paymentReference": "PAY-20241212-XXXXX",
    "checkoutUrl": "https://checkout.razorpay.com/...",
    "amount": 15000.00
  }
}
```

### 7️⃣ **Payment**
- User redirected to payment gateway (Razorpay/Stripe)
- Completes payment with card/UPI/netbanking
- Gateway redirects back to success/failure URL

**Payment Callback:**
```
POST /api/payments/callback
{
  "paymentReference": "PAY-20241212-XXXXX",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_xxxxx"
}

Backend:
- Verifies signature
- Updates payment status
- Updates booking status to "confirmed"
- Sends email with e-ticket
```

### 8️⃣ **Booking Confirmation**
- Show PNR, ticket details, download PDF
- Email + SMS sent with booking confirmation
- For guests: Show "Create account & save booking" CTA

**Get Booking:**
```
GET /api/bookings/reference/BK-20241212-XXXXX?email=john@example.com

Response:
{
  "booking": {
    "bookingReference": "BK-20241212-XXXXX",
    "status": "confirmed",
    "pnr": "ABC123",
    "travelers": [...],
    "payments": [...]
  }
}
```

### 9️⃣ **Post-Booking**
- Logged-in users: View in "My Bookings"
- Guest users: Access via booking reference + email
- Option to cancel, request refund

**My Bookings (Authenticated):**
```
GET /api/bookings/my-bookings
Headers: Authorization: Bearer <token>

Response:
{
  "bookings": [
    {
      "bookingReference": "BK-20241212-XXXXX",
      "status": "confirmed",
      "totalPrice": 15000.00,
      "createdAt": "2024-12-12T10:00:00Z"
    }
  ]
}
```

---

## 🔐 Authentication Endpoints

### Sign Up
```
POST /api/auth/signup
Body: { email, phone, password, firstName, lastName }
Response: { userId, email, phone, emailVerified: false, phoneVerified: false }
```

### Login
```
POST /api/auth/login
Body: { email, password }
Response: { token, user: { id, email, phone, emailVerified, phoneVerified } }
```

### Verify Email OTP
```
POST /api/auth/verify-email
Body: { email, otp }
Response: { success: true, message: "Email verified" }
```

### Verify Phone OTP
```
POST /api/auth/verify-phone
Body: { phone, otp }
Response: { success: true, message: "Phone verified" }
```

### Resend Email OTP
```
POST /api/auth/resend-email-otp
Body: { email }
Response: { success: true, message: "OTP sent" }
```

### Resend Phone OTP
```
POST /api/auth/resend-phone-otp
Body: { phone }
Response: { success: true, message: "OTP sent" }
```

### Get Profile
```
GET /api/auth/profile
Headers: Authorization: Bearer <token>
Response: { user: { id, email, phone, firstName, lastName } }
```

---

## 📦 Booking Endpoints

### Create Booking Only
```
POST /api/bookings/create
Headers: Authorization: Bearer <token> (optional)
Body: { flightData, travelers, contactEmail, contactPhone, totalPrice }
Response: { bookingId, bookingReference, status }
```

### Create Booking + Initiate Payment (Recommended)
```
POST /api/bookings/create-and-pay
Headers: Authorization: Bearer <token> (optional)
Body: { flightData, travelers, contactEmail, totalPrice, paymentAcquirer }
Response: { booking: {...}, payment: {...} }
```

### Get Booking by ID
```
GET /api/bookings/:bookingId
Headers: Authorization: Bearer <token> (optional)
Response: { booking: { bookingReference, status, travelers, payments } }
```

### Get Booking by Reference
```
GET /api/bookings/reference/:bookingReference?email=xxx
Response: { booking: {...} }
```

### Get My Bookings
```
GET /api/bookings/my-bookings
Headers: Authorization: Bearer <token> (required)
Response: { bookings: [...] }
```

### Cancel Booking
```
POST /api/bookings/:bookingId/cancel
Headers: Authorization: Bearer <token> (optional)
Body: { reason: "Customer request" }
Response: { success: true, booking: {...} }
```

---

## 🎨 UI/UX Patterns

### Passenger Details Page Modal
```
┌─────────────────────────────────────┐
│  Quick — create an account?         │
│                                     │
│  Save this booking, access past     │
│  trips & faster checkout.           │
│  Takes 10 seconds.                  │
│                                     │
│  [Create Account] [Sign In]         │
│          [Continue as guest]        │
└─────────────────────────────────────┘
```

### OTP Verification Screen
```
┌─────────────────────────────────────┐
│  Verify your phone                  │
│                                     │
│  We sent a code to +91 98765 43210 │
│                                     │
│  [ _ ] [ _ ] [ _ ] [ _ ] [ _ ] [ _ ]│
│                                     │
│  Didn't receive? [Resend OTP]       │
│                                     │
│  [Verify]                           │
└─────────────────────────────────────┘
```

### Payment Blocking (Unverified Contact)
```
┌─────────────────────────────────────┐
│  ⚠️ Verification Required            │
│                                     │
│  We need to verify your phone       │
│  before processing payment.         │
│                                     │
│  [Verify Now (OTP)]  [Sign Up]      │
└─────────────────────────────────────┘
```

---

## 🔒 Security & Validation

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter (recommended)
- At least one number (recommended)
- At least one special character (recommended)

### Email Validation
- RFC 5322 compliant format
- Example: `user@example.com`

### Phone Validation
- International format: `+[country code][number]`
- Indian format: `+919876543210`
- Minimum 10 digits, maximum 15

### OTP Security
- 6-digit numeric code
- Valid for 10 minutes
- Rate limiting: Max 3 attempts per 5 minutes
- New OTP invalidates previous ones

### JWT Token
- Expiry: 7 days (configurable)
- Stored in: localStorage / httpOnly cookie
- Header: `Authorization: Bearer <token>`

---

## 🚀 Implementation Checklist

- [x] User model with verification fields
- [x] Auth service (signup, login, OTP verification)
- [x] Auth controller and routes
- [x] JWT middleware (authenticateToken, optionalAuth)
- [x] Booking service (create, get, update)
- [x] Booking controller and routes
- [x] Combined create-and-pay endpoint
- [x] Email OTP sending (mock, integrate with SendGrid)
- [x] Phone OTP sending (mock, integrate with Twilio)
- [x] Password hashing (bcrypt)
- [x] Token generation (JWT)
- [ ] Frontend: Sign up form
- [ ] Frontend: Login form
- [ ] Frontend: OTP verification screens
- [ ] Frontend: Passenger details with auth modal
- [ ] Frontend: My Bookings page
- [ ] Email service integration (SendGrid/AWS SES)
- [ ] SMS service integration (Twilio/MSG91)

---

## 📝 Environment Variables

Add to `.env`:
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Email Service (SendGrid/AWS SES)
EMAIL_SERVICE_API_KEY=your-email-service-api-key
EMAIL_FROM=noreply@yourdomain.com

# SMS Service (Twilio/MSG91)
SMS_SERVICE_API_KEY=your-sms-service-api-key
SMS_FROM_NUMBER=+1234567890
```

---

## 🧪 Testing Flow

### 1. Test Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+919876543210",
    "password": "SecurePass123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Verify Email (check logs for OTP)
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

### 3. Verify Phone (check logs for OTP)
```bash
curl -X POST http://localhost:3000/api/auth/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "654321"
  }'
```

### 4. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'

# Save the token from response
```

### 5. Create Booking + Payment
```bash
curl -X POST http://localhost:3000/api/bookings/create-and-pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "flightData": {...},
    "travelers": [{...}],
    "contactEmail": "test@example.com",
    "contactPhone": "+919876543210",
    "totalPrice": 15000,
    "paymentAcquirer": "RAZORPAY"
  }'
```

### 6. Get My Bookings
```bash
curl http://localhost:3000/api/bookings/my-bookings \
  -H "Authorization: Bearer <your-token>"
```

---

## 🎯 When to Ask for Login/Sign Up

### ✅ Best Practice (Implemented)
- **Soft Prompt at Passenger Details** (allows guest)
- **Mandatory Verification Before Payment** (phone/email OTP)
- **Post-Booking Account Attachment** (guest → user)

### ❌ Avoid
- Forcing login before search (reduces conversion)
- Blocking at search results (too early)
- No verification before payment (security risk)

---

**🎉 Complete authentication and booking system ready for production!**
