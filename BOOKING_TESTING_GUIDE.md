# 🚀 Quick Start - Testing the Booking Flow

## Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:3000`
- Valid API credentials configured

## Step-by-Step Testing Guide

### 1. Start the Servers

**Backend:**
```bash
cd backend
npm start
# Server should start on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm run dev
# Server should start on http://localhost:3000
```

### 2. Test Complete Booking Flow

#### A. As Logged-in User

1. **Sign Up / Login**
   - Go to http://localhost:3000/auth/login
   - Login with existing account or sign up
   - Token will be stored automatically

2. **Search for Flights**
   - Go to homepage: http://localhost:3000
   - Enter search criteria:
     - From: BOM (Mumbai)
     - To: DXB (Dubai)
     - Date: Future date (e.g., 2026-12-31)
     - Passengers: 1
   - Click Search

3. **Select a Flight**
   - Browse search results
   - Click "Book Now" on any flight
   - You'll be redirected to `/booking`

4. **Fill Booking Form**
   - Form should pre-fill with your user data
   - Complete all required fields:
     - ✅ First Name, Last Name
     - ✅ Date of Birth
     - ✅ Gender
     - ✅ Nationality (e.g., "IN")
     - ✅ Document Type (Passport)
     - ✅ Document Number
     - ✅ Document Expiry
     - ✅ Email & Phone
   - Add special requests (optional)
   - Click "Continue to Payment"

5. **Payment**
   - You'll be redirected to Razorpay payment page
   - Complete test payment using test credentials
   - After payment, redirected to confirmation

6. **Confirmation Page**
   - See success message
   - Booking reference displayed
   - Flight details summary shown
   - Click "View My Bookings"

7. **My Bookings**
   - See your new booking in the list
   - Try filtering tabs (All, Upcoming, Completed, Cancelled)
   - Click "View Details" on your booking

8. **Booking Details**
   - See complete booking information
   - Flight details, traveler info, payment history
   - Try cancelling:
     - Click "Cancel Booking"
     - Enter cancellation reason
     - Confirm cancellation
     - Booking status should update

#### B. As Guest User

1. **Search & Select** (Same as above)

2. **Fill Booking Form**
   - No pre-filled data
   - Enter all details manually
   - Submit

3. **Access Booking Later**
   - Use booking reference + email to retrieve booking
   - Go to booking details page directly with ID

## 🧪 API Testing (Using cURL or Postman)

### 1. Create Booking (Authenticated)

```bash
curl --location 'http://localhost:5000/api/bookings/create' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data-raw '{
  "flightData": {
    "flightId": "UL142-UL231",
    "origin": "BOM",
    "destination": "DXB",
    "departureDate": "2026-12-31",
    "departureTime": "03:10",
    "arrivalDate": "2026-12-31",
    "arrivalTime": "17:10",
    "airline": "UL",
    "flightNumber": "142",
    "cabin": "ECONOMY",
    "stops": 1
  },
  "travelers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-05-15",
      "gender": "MALE",
      "nationality": "IN",
      "documentType": "PASSPORT",
      "documentNumber": "P1234567",
      "documentExpiry": "2030-12-31",
      "email": "john@example.com",
      "phone": "+919876543210"
    }
  ],
  "contactEmail": "john@example.com",
  "contactPhone": "+919876543210",
  "totalPrice": 128.95,
  "currency": "EUR"
}'
```

### 2. Create Booking and Pay (Guest or Authenticated)

```bash
curl --location 'http://localhost:5000/api/bookings/create-and-pay' \
--header 'Content-Type: application/json' \
--data-raw '{
  "flightData": {
    "flightId": "flight-123",
    "origin": "BOM",
    "destination": "DXB",
    "departureDate": "2026-12-25",
    "departureTime": "20:45",
    "arrivalDate": "2026-12-26",
    "arrivalTime": "17:10",
    "airline": "UL",
    "flightNumber": "144",
    "cabin": "ECONOMY",
    "stops": 1
  },
  "travelers": [
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "dateOfBirth": "1985-08-20",
      "gender": "FEMALE",
      "nationality": "IN",
      "documentType": "PASSPORT",
      "documentNumber": "P7654321",
      "documentExpiry": "2029-12-31",
      "email": "jane@example.com",
      "phone": "+919876543211"
    }
  ],
  "contactEmail": "jane@example.com",
  "contactPhone": "+919876543211",
  "totalPrice": 12000,
  "currency": "INR",
  "specialRequests": "Window seat preferred",
  "paymentAcquirer": "RAZORPAY",
  "successUrl": "http://localhost:3000/confirmation",
  "failureUrl": "http://localhost:3000/payment-failed"
}'
```

### 3. Get My Bookings

```bash
curl --location 'http://localhost:5000/api/bookings/my-bookings' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 4. Get Booking by ID

```bash
curl --location 'http://localhost:5000/api/bookings/14' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 5. Get Booking by Reference

```bash
curl --location 'http://localhost:5000/api/bookings/reference/BK123456?email=john@example.com'
```

### 6. Cancel Booking

```bash
curl --location 'http://localhost:5000/api/bookings/1/cancel' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data '{
  "reason": "Change of travel plans"
}'
```

## 🔍 What to Look For

### ✅ Success Indicators:
- Forms pre-fill correctly for logged-in users
- All validations work (required fields, formats)
- Loading states show during API calls
- Success messages appear after operations
- Navigation flows smoothly between pages
- Status badges show correct colors
- Modal opens/closes properly
- Cancel booking updates status immediately
- Payment redirect works
- Confirmation page shows booking details

### ❌ Common Issues to Check:
- CORS errors (backend CORS should allow frontend origin)
- 401 Unauthorized (check if token is valid)
- 400 Bad Request (check required fields are provided)
- 404 Not Found (check API endpoints match)
- Missing booking reference (check response format)
- Payment redirect fails (check Razorpay config)
- Validation errors not showing

## 🐛 Troubleshooting

### Issue: "Failed to create booking"
**Solutions:**
- Check backend logs for detailed error
- Verify all required fields are filled
- Check date format (YYYY-MM-DD)
- Verify nationality is 2-letter code
- Ensure phone has country code (+91...)

### Issue: "Booking not found"
**Solutions:**
- Check if booking was actually created (check DB)
- Verify booking ID/reference is correct
- Check authentication token is valid
- Try accessing by reference + email instead

### Issue: Payment redirect not working
**Solutions:**
- Check Razorpay credentials in backend .env
- Verify successUrl and failureUrl are correct
- Check browser console for errors
- Test in sandbox mode first

### Issue: Cancel booking doesn't work
**Solutions:**
- Verify booking status allows cancellation
- Check if reason field is provided
- Ensure user owns the booking (or is authenticated)
- Check backend logs for errors

## 📊 Expected Response Examples

### Create Booking Success:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Booking created successfully",
  "data": {
    "bookingId": 14,
    "bookingReference": "BK123456",
    "status": "pending",
    "totalPrice": 128.95,
    "currency": "EUR"
  }
}
```

### Create Booking and Pay Success:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Booking created and payment initiated",
  "data": {
    "booking": {
      "bookingId": 15,
      "bookingReference": "BK789012",
      "status": "payment_initiated"
    },
    "payment": {
      "paymentReference": "PAY123456",
      "paymentUrl": "https://razorpay.com/checkout/...",
      "amount": 12000,
      "currency": "INR"
    }
  }
}
```

### Get My Bookings Success:
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": 14,
        "bookingReference": "BK123456",
        "status": "confirmed",
        "flightData": {...},
        "travelers": [...],
        "totalPrice": 128.95,
        "createdAt": "2026-01-05T10:30:00Z"
      }
    ]
  }
}
```

## 🎯 Testing Checklist

- [ ] Sign up new user
- [ ] Login with existing user
- [ ] Search flights with various criteria
- [ ] Select and book a flight (logged in)
- [ ] Complete payment flow
- [ ] View confirmation page
- [ ] Access My Bookings
- [ ] Filter bookings by status
- [ ] View booking details
- [ ] Cancel a booking
- [ ] Test guest booking (logged out)
- [ ] Access booking by reference
- [ ] Test mobile responsiveness
- [ ] Test error scenarios (network issues)
- [ ] Verify email notifications (if configured)

## 📱 Mobile Testing

Test on these viewport sizes:
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1440px

Verify:
- All buttons are tappable
- Forms are easy to fill
- Modal is centered and scrollable
- Cards stack properly
- Navigation works smoothly

## 🎉 Success Criteria

You've successfully integrated the booking flow if:
1. ✅ Can create booking from search results
2. ✅ Traveler form validates and submits correctly
3. ✅ Payment redirect works
4. ✅ Confirmation page shows booking details
5. ✅ My Bookings displays all bookings
6. ✅ Booking details page shows complete info
7. ✅ Can cancel booking with reason
8. ✅ All pages are responsive
9. ✅ Design matches homepage UX
10. ✅ Error handling works for all scenarios

---

**Need Help?**
- Check browser console for errors
- Check backend logs for API errors
- Review API responses in Network tab
- Verify environment variables are set
- Test API endpoints directly with cURL/Postman first
