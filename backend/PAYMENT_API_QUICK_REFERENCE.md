# 🚀 Payment Gateway API Quick Reference

## 📍 Base URL
```
http://localhost:3000/api/payments
```

---

## 🔥 Core APIs

### 1️⃣ Create Payment
```http
POST /api/payments/create
Content-Type: application/json

{
  "bookingId": 1,
  "acquirer": "RAZORPAY" | "STRIPE",
  "customerEmail": "test@example.com",
  "customerName": "John Doe",
  "customerPhone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "acquirer": "RAZORPAY",
    "amount": 15000.00,
    "checkoutUrl": "https://checkout.razorpay.com/...",
    "checkoutData": { ... }
  }
}
```

---

### 2️⃣ Check Status
```http
GET /api/payments/:paymentReference/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "status": "SUCCESS",
    "amount": 15000.00
  }
}
```

---

### 3️⃣ Process Refund
```http
POST /api/payments/:paymentReference/refund
Content-Type: application/json

{
  "amount": 5000.00,
  "reason": "Customer cancellation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refundId": "rfnd_xxxxx",
    "refundAmount": 5000.00,
    "status": "PARTIAL_REFUND"
  }
}
```

---

## 🔗 Additional Endpoints

### Get Payment Details
```http
GET /api/payments/:paymentReference
```

### Get Payments by Booking
```http
GET /api/payments/booking/:bookingId
```

### Razorpay Webhook
```http
POST /api/payments/webhook/razorpay
X-Razorpay-Signature: {signature}
```

### Stripe Webhook
```http
POST /api/payments/webhook/stripe
Stripe-Signature: {signature}
```

---

## 🧪 Test Cards

### Razorpay
| Card | Type |
|------|------|
| `4111 1111 1111 1111` | Success |
| `4000 0000 0000 0002` | Declined |

### Stripe
| Card | Type |
|------|------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |

---

## 📊 Payment Statuses

| Status | Description |
|--------|-------------|
| `CREATED` | Payment record created |
| `PENDING` | Awaiting customer action |
| `PROCESSING` | Payment being processed |
| `SUCCESS` | Payment completed |
| `FAILED` | Payment failed |
| `REFUNDED` | Fully refunded |
| `PARTIAL_REFUND` | Partially refunded |

---

## 🔑 Environment Variables

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## ⚡ Quick Test

```bash
# Create payment
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"bookingId": 1, "acquirer": "RAZORPAY", "customerEmail": "test@example.com"}'

# Check status
curl http://localhost:3000/api/payments/PAY-20241212-XXXXX/status

# Process refund
curl -X POST http://localhost:3000/api/payments/PAY-20241212-XXXXX/refund \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "reason": "Test"}'
```

---

## 📚 Full Documentation

- **PAYMENT_INTEGRATION_GUIDE.md** - Complete guide
- **PAYMENT_API_TESTING.md** - Testing examples
- **PAYMENT_IMPLEMENTATION_SUMMARY.md** - Technical details

---

**✨ Pure REST APIs - No SDKs Required!**
