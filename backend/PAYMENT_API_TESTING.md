# 🧪 Payment API Testing Guide

Complete testing guide for Razorpay and Stripe payment integrations using **pure REST APIs** (no SDKs).

## 📋 Prerequisites

1. **Environment Setup**
```bash
# Copy and configure payment credentials
cp .env.payment.example .env.local

# Add your credentials:
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

2. **Database Setup**
```bash
# Run payment table setup
psql -d your_database -f setup-payments.sql
```

3. **Start Server**
```bash
cd backend
npm start
```

---

## 🔥 Razorpay Testing

### Test Credentials
```
Test Key ID: rzp_test_xxxxxxxxxxxxxxx
Test Key Secret: Your test secret
```

### 1️⃣ Create Order (Payment Intent)

**API Endpoint:** `POST /api/payments/create`

**Request:**
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 1,
    "acquirer": "RAZORPAY",
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "customerPhone": "+919876543210",
    "successUrl": "http://localhost:3000/payment/success",
    "failureUrl": "http://localhost:3000/payment/failure"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "acquirer": "RAZORPAY",
    "amount": 15000.00,
    "currency": "INR",
    "checkoutUrl": "https://checkout.razorpay.com/v1/checkout.js",
    "checkoutData": {
      "key": "rzp_test_xxxxx",
      "order_id": "order_xxxxxxxxxxxxx",
      "amount": 1500000,
      "currency": "INR",
      "name": "Travel Booking",
      "description": "Flight Booking Payment",
      "prefill": {
        "name": "Test User",
        "email": "test@example.com",
        "contact": "+919876543210"
      }
    },
    "expiresAt": "2024-12-12T12:00:00Z"
  }
}
```

**Direct Razorpay API Call:**
```bash
curl -X POST https://api.razorpay.com/v1/orders \
  -u rzp_test_xxxxx:your_key_secret \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500000,
    "currency": "INR",
    "receipt": "PAY-20241212-XXXXX",
    "notes": {
      "booking_id": "1",
      "customer_email": "test@example.com"
    }
  }'
```

### 2️⃣ Check Status

**API Endpoint:** `GET /api/payments/:paymentReference/status`

**Request:**
```bash
curl http://localhost:3000/api/payments/PAY-20241212-XXXXX/status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "status": "PENDING",
    "amount": 15000.00,
    "currency": "INR",
    "acquirerStatus": {
      "order": {
        "id": "order_xxxxx",
        "status": "created",
        "amount": 1500000
      },
      "payment": null
    }
  }
}
```

**Direct Razorpay API Call:**
```bash
# Check order status
curl https://api.razorpay.com/v1/orders/order_xxxxx \
  -u rzp_test_xxxxx:your_key_secret

# Check payments for order
curl https://api.razorpay.com/v1/orders/order_xxxxx/payments \
  -u rzp_test_xxxxx:your_key_secret
```

### 3️⃣ Process Refund

**API Endpoint:** `POST /api/payments/:paymentReference/refund`

**Request:**
```bash
curl -X POST http://localhost:3000/api/payments/PAY-20241212-XXXXX/refund \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000.00,
    "reason": "Customer requested cancellation"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "refundId": "rfnd_xxxxxxxxxxxxx",
    "refundAmount": 5000.00,
    "totalRefunded": 5000.00,
    "status": "PARTIAL_REFUND"
  }
}
```

**Direct Razorpay API Call:**
```bash
curl -X POST https://api.razorpay.com/v1/payments/pay_xxxxx/refund \
  -u rzp_test_xxxxx:your_key_secret \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500000,
    "speed": "normal",
    "notes": {
      "reason": "Customer requested cancellation"
    }
  }'
```

### Razorpay Test Cards

| Card Number | Scenario | CVV | Expiry |
|-------------|----------|-----|--------|
| 4111 1111 1111 1111 | Success | Any 3 digits | Future date |
| 5555 5555 5555 4444 | Success (Mastercard) | Any 3 digits | Future date |
| 4012 0010 3714 1112 | 3D Secure Required | Any 3 digits | Future date |
| 4000 0000 0000 0002 | Declined | Any 3 digits | Future date |

**Test OTP for 3D Secure:** Any value

---

## 💳 Stripe Testing

### Test Credentials
```
Test Publishable Key: pk_test_xxxxxxxxxxxxx
Test Secret Key: sk_test_xxxxxxxxxxxxx
```

### 1️⃣ Create Payment Intent (Order)

**API Endpoint:** `POST /api/payments/create`

**Request:**
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 1,
    "acquirer": "STRIPE",
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "successUrl": "http://localhost:3000/payment/success",
    "failureUrl": "http://localhost:3000/payment/failure"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "acquirer": "STRIPE",
    "amount": 15000.00,
    "currency": "INR",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxxxx",
    "checkoutData": {
      "sessionId": "cs_test_xxxxx",
      "publishableKey": "pk_test_xxxxx",
      "clientSecret": "pi_xxxxx_secret_xxxxx"
    },
    "expiresAt": "2024-12-12T12:00:00Z"
  }
}
```

**Direct Stripe API Calls:**

```bash
# Step 1: Create Payment Intent
curl https://api.stripe.com/v1/payment_intents \
  -u sk_test_xxxxx: \
  -d amount=1500000 \
  -d currency=inr \
  -d "description=Flight Booking Payment" \
  -d "receipt_email=test@example.com" \
  -d "metadata[payment_reference]=PAY-20241212-XXXXX" \
  -d "automatic_payment_methods[enabled]=true"

# Step 2: Create Checkout Session
curl https://api.stripe.com/v1/checkout/sessions \
  -u sk_test_xxxxx: \
  -d mode=payment \
  -d "line_items[0][price_data][currency]=inr" \
  -d "line_items[0][price_data][product_data][name]=Flight Booking" \
  -d "line_items[0][price_data][unit_amount]=1500000" \
  -d "line_items[0][quantity]=1" \
  -d "customer_email=test@example.com" \
  -d "success_url=http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}" \
  -d "cancel_url=http://localhost:3000/payment/failure"
```

### 2️⃣ Check Status

**API Endpoint:** `GET /api/payments/:paymentReference/status`

**Request:**
```bash
curl http://localhost:3000/api/payments/PAY-20241212-XXXXX/status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "status": "PENDING",
    "amount": 15000.00,
    "currency": "INR",
    "acquirerStatus": {
      "id": "pi_xxxxx",
      "status": "requires_payment_method",
      "amount": 1500000,
      "currency": "inr"
    }
  }
}
```

**Direct Stripe API Calls:**

```bash
# Check payment intent status
curl https://api.stripe.com/v1/payment_intents/pi_xxxxx \
  -u sk_test_xxxxx:

# Check checkout session status
curl https://api.stripe.com/v1/checkout/sessions/cs_test_xxxxx \
  -u sk_test_xxxxx:
```

### 3️⃣ Process Refund

**API Endpoint:** `POST /api/payments/:paymentReference/refund`

**Request:**
```bash
curl -X POST http://localhost:3000/api/payments/PAY-20241212-XXXXX/refund \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000.00,
    "reason": "Customer requested cancellation"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-20241212-XXXXX",
    "refundId": "re_xxxxxxxxxxxxx",
    "refundAmount": 5000.00,
    "totalRefunded": 5000.00,
    "status": "PARTIAL_REFUND"
  }
}
```

**Direct Stripe API Call:**
```bash
curl https://api.stripe.com/v1/refunds \
  -u sk_test_xxxxx: \
  -d payment_intent=pi_xxxxx \
  -d amount=500000 \
  -d reason=requested_by_customer \
  -d "metadata[refund_reason]=Customer requested cancellation"
```

### Stripe Test Cards

| Card Number | Scenario | CVC | Expiry |
|-------------|----------|-----|--------|
| 4242 4242 4242 4242 | Success | Any 3 digits | Future date |
| 4000 0027 6000 3184 | 3D Secure Required | Any 3 digits | Future date |
| 4000 0000 0000 0002 | Declined (Generic) | Any 3 digits | Future date |
| 4000 0000 0000 9995 | Declined (Insufficient funds) | Any 3 digits | Future date |
| 4000 0000 0000 0069 | Expired Card | Any 3 digits | Future date |

---

## 🔗 Webhook Testing

### Razorpay Webhook Setup

1. **Use ngrok for local testing:**
```bash
ngrok http 3000
```

2. **Configure webhook in Razorpay Dashboard:**
   - URL: `https://xxxx.ngrok.io/api/payments/webhook/razorpay`
   - Events: `payment.authorized`, `payment.captured`, `payment.failed`, `refund.processed`

3. **Test webhook:**
```bash
curl -X POST http://localhost:3000/api/payments/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: generated_signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_xxxxx",
          "order_id": "order_xxxxx",
          "status": "captured",
          "amount": 1500000
        }
      }
    }
  }'
```

### Stripe Webhook Setup

1. **Use Stripe CLI for local testing:**
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook/stripe
```

2. **Or use ngrok:**
   - URL: `https://xxxx.ngrok.io/api/payments/webhook/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

3. **Test webhook:**
```bash
stripe trigger payment_intent.succeeded
```

---

## 📊 Complete Test Flow

### End-to-End Payment Test

```bash
# Step 1: Create payment
RESPONSE=$(curl -s -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 1,
    "acquirer": "RAZORPAY",
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "customerPhone": "+919876543210"
  }')

# Extract payment reference
PAY_REF=$(echo $RESPONSE | jq -r '.data.paymentReference')
echo "Payment Reference: $PAY_REF"

# Extract checkout URL
CHECKOUT_URL=$(echo $RESPONSE | jq -r '.data.checkoutUrl')
echo "Checkout URL: $CHECKOUT_URL"

# Step 2: Check status (should be PENDING)
curl http://localhost:3000/api/payments/$PAY_REF/status

# Step 3: Simulate payment completion
# (Open checkout URL in browser and complete payment)

# Step 4: Check status again (should be SUCCESS)
curl http://localhost:3000/api/payments/$PAY_REF/status

# Step 5: Get payment details
curl http://localhost:3000/api/payments/$PAY_REF

# Step 6: Process refund
curl -X POST http://localhost:3000/api/payments/$PAY_REF/refund \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "reason": "Test refund"
  }'
```

---

## 🎯 Postman Collection

Import this collection for easy testing:

```json
{
  "info": {
    "name": "Payment Gateway APIs",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Payment (Razorpay)",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"bookingId\": 1,\n  \"acquirer\": \"RAZORPAY\",\n  \"customerEmail\": \"test@example.com\",\n  \"customerName\": \"Test User\",\n  \"customerPhone\": \"+919876543210\"\n}"
        },
        "url": "http://localhost:3000/api/payments/create"
      }
    },
    {
      "name": "Create Payment (Stripe)",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"bookingId\": 1,\n  \"acquirer\": \"STRIPE\",\n  \"customerEmail\": \"test@example.com\",\n  \"customerName\": \"Test User\"\n}"
        },
        "url": "http://localhost:3000/api/payments/create"
      }
    },
    {
      "name": "Check Payment Status",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/payments/{{paymentReference}}/status"
      }
    },
    {
      "name": "Process Refund",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"amount\": 5000,\n  \"reason\": \"Customer requested cancellation\"\n}"
        },
        "url": "http://localhost:3000/api/payments/{{paymentReference}}/refund"
      }
    }
  ]
}
```

---

## ✅ API Implementation Summary

### Razorpay REST API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v1/orders` | Create order (payment intent) |
| GET | `/v1/orders/:id` | Fetch order details |
| GET | `/v1/orders/:id/payments` | Get payments for order |
| GET | `/v1/payments/:id` | Fetch payment details |
| POST | `/v1/payments/:id/refund` | Process refund |
| POST | `/v1/payments/:id/capture` | Capture authorized payment |

**Authentication:** HTTP Basic Auth (`key_id:key_secret`)

### Stripe REST API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v1/payment_intents` | Create payment intent |
| GET | `/v1/payment_intents/:id` | Retrieve payment intent |
| POST | `/v1/checkout/sessions` | Create checkout session |
| GET | `/v1/checkout/sessions/:id` | Retrieve checkout session |
| POST | `/v1/refunds` | Create refund |
| POST | `/v1/payment_intents/:id/capture` | Capture payment intent |

**Authentication:** Bearer token (`Authorization: Bearer sk_test_xxxxx`)
**Content-Type:** `application/x-www-form-urlencoded`

---

## 🐛 Common Issues & Solutions

### Issue 1: "Invalid API Key"
**Solution:** Verify credentials in `.env` file

### Issue 2: "Signature verification failed"
**Solution:** Ensure webhook secret is correctly configured

### Issue 3: "Amount too small"
**Solution:** Minimum amount for Razorpay: ₹1 (100 paise), Stripe: $0.50 (50 cents)

### Issue 4: "Payment not found"
**Solution:** Check if payment record exists in database

---

## 📚 Documentation References

- **Razorpay API:** https://razorpay.com/docs/api/
- **Stripe API:** https://docs.stripe.com/api
- **Payment Status Flow:** See PAYMENT_INTEGRATION_GUIDE.md

---

**All APIs are production-ready and use pure REST calls - No SDKs required!** 🚀
