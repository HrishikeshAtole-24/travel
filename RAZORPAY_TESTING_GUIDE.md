# 🧪 Razorpay Payment Testing Guide

## 🎯 Your Current Issue

**Problem**: Payment is failing during Razorpay checkout with error: "We are facing some trouble completing your request at the moment."

**Root Cause**: You're in **TEST MODE** and need to use Razorpay's test cards, not real card details.

---

## ✅ How to Test Payments (TEST MODE)

### 1️⃣ **Use Razorpay Test Cards**

Razorpay provides test card numbers that simulate different payment scenarios:

#### **✅ Successful Payment**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits (e.g., 123)
Expiry: Any future date (e.g., 12/25)
Name: Any name
```

#### **❌ Failed Payment**
```
Card Number: 4000 0000 0000 0002
CVV: Any 3 digits
Expiry: Any future date
```

#### **🔄 Requires Authentication (3D Secure)**
```
Card Number: 4000 0027 6000 3184
CVV: Any 3 digits
Expiry: Any future date
OTP: 1234 (when prompted)
```

### 2️⃣ **UPI Testing**
```
UPI ID: success@razorpay
Status: Success

UPI ID: failure@razorpay
Status: Failure
```

### 3️⃣ **Net Banking Testing**
- Select any bank
- Click "Success" or "Failure" button on test page

---

## 🔧 Current Setup Status

### ✅ What's Working:
1. Razorpay order creation (order_S2cUagiwWaB2d8)
2. Payment page loading
3. Razorpay checkout modal opening
4. Callback handling with redirect

### ❌ What's Failing:
1. **Using real card details in test mode** - Won't work!
2. Frontend missing success/failure pages (NOW FIXED ✅)

---

## 📋 Testing Steps

### **Step 1: Start a New Booking**
1. Go to http://localhost:3000
2. Search for flights (e.g., BOM → LHR, Jan 15, 2026)
3. Select a flight
4. Fill in passenger details
5. Click "Continue to Payment"

### **Step 2: On Payment Page**
1. Razorpay modal will auto-open
2. Click "Cards" tab
3. Enter test card details:
   - **Card**: `4111 1111 1111 1111`
   - **Expiry**: `12/25`
   - **CVV**: `123`
   - **Name**: `Test User`
4. Click "Pay"

### **Step 3: Expected Result**
- ✅ Payment should process
- ✅ Redirect to: `http://localhost:3000/payment-success`
- ✅ Show booking confirmation
- ✅ Booking status: `confirmed`
- ✅ Payment status: `SUCCESS`

---

## 🔍 Debugging: Check Razorpay Dashboard

### **View Test Transactions:**
1. Go to https://dashboard.razorpay.com/
2. Make sure you're in **TEST MODE** (toggle in top bar)
3. Click **Payments** → **Transactions**
4. You should see:
   - Order ID: `order_S2cUagiwWaB2d8`
   - Status: Will show as "created" if user didn't complete payment
   - Amount: ₹260.56

### **Why Transaction Might Not Show:**
- ❌ If user closes modal before entering card
- ❌ If payment fails during processing
- ✅ Order is created but payment not completed

---

## 🎯 Test Scenarios

### **Scenario 1: Successful Payment** ✅
1. Use card: `4111 1111 1111 1111`
2. Expected: Redirect to `/payment-success`
3. Booking status: `confirmed`
4. Payment status: `SUCCESS`

### **Scenario 2: Failed Payment** ❌
1. Use card: `4000 0000 0000 0002`
2. Expected: Redirect to `/payment-failed`
3. Booking status: `pending`
4. Payment status: `FAILED`

### **Scenario 3: User Cancels Payment** 🚫
1. Click "X" to close Razorpay modal
2. Expected: Stay on payment page
3. Can retry payment

---

## 🛠️ Common Issues & Solutions

### **Issue 1: Payment Fails with Generic Error**
**Cause**: Using real card in test mode
**Solution**: Use test card `4111 1111 1111 1111`

### **Issue 2: 404 on Success/Failure Page**
**Status**: ✅ **FIXED** - Pages created

### **Issue 3: Transaction Not in Razorpay Dashboard**
**Cause**: Payment not completed (user closed modal)
**Solution**: Complete the payment flow with test card

### **Issue 4: Amount Mismatch**
**Check**: Backend logs for "amount" field
**Current**: ₹260.56 (26056 paise)

---

## 📊 Verify Payment in Database

### **Check Payment Record:**
```sql
SELECT payment_reference, status, amount, currency, acquirer_order_id, acquirer_payment_id
FROM payments
WHERE payment_reference = 'PAY-20260111-SHR0T';
```

### **Check Booking Record:**
```sql
SELECT booking_reference, status, total_price
FROM bookings
WHERE booking_reference = (
  SELECT b.booking_reference
  FROM payments p
  JOIN bookings b ON p.booking_id = b.id
  WHERE p.payment_reference = 'PAY-20260111-SHR0T'
);
```

---

## 🚀 Production Checklist (For Later)

When moving to LIVE mode:
- [ ] Switch Razorpay to LIVE mode in dashboard
- [ ] Update `.env` with LIVE keys:
  - `RAZORPAY_KEY_ID=rzp_live_xxxxx`
  - `RAZORPAY_KEY_SECRET=xxxxx`
- [ ] Update frontend `.env.local`:
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx`
- [ ] Test with real (small amount) transaction
- [ ] Set up webhooks for payment notifications
- [ ] Enable 3D Secure for card payments
- [ ] Configure payment failure emails

---

## 📝 Next Steps for YOU

1. **Try payment again with test card**: `4111 1111 1111 1111`
2. **Check if it redirects to** `/payment-success`
3. **Verify in Razorpay dashboard** (test mode)
4. **Check database** for booking status

---

## 📞 Need Help?

If payment still fails with test card:
1. Check backend logs: `backend/logs/error.log`
2. Check browser console for errors
3. Verify Razorpay credentials in `.env`
4. Ensure you're in TEST mode on Razorpay dashboard

---

**🎉 Your payment flow is NOW complete with success/failure pages!**

Just use the **test card numbers** and it will work! 🚀
