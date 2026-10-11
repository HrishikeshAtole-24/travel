/**
 * Hotel Booking Controller
 * Handles hotel booking HTTP requests with payment flow
 * Follows same pattern as booking.controller.js (flights)
 */
const hotelBookingService = require('../services/hotel-booking.service');
const paymentService = require('../payments/payment.service');
const AsyncHandler = require('../core/AsyncHandler');
const ApiResponse = require('../core/ApiResponse');
const { StatusCodes } = require('../core/StatusCodes');

/**
 * Identity the caller can prove: JWT user and/or the booking contact email
 * (query string for GET, body for POST)
 */
function getBookingAccess(req) {
  return {
    userId: req.user?.userId || null,
    email: req.query?.email || req.body?.email || null
  };
}

/**
 * Fields accepted from the client when creating a hotel booking.
 * Price, currency and offer details are NOT accepted - they are looked up
 * from the supplier using offerId (see hotel-booking.service).
 */
function pickBookingInput(body) {
  const {
    hotelId,
    offerId,
    hotelName,
    hotelData,
    checkInDate,
    checkOutDate,
    roomQuantity,
    adults,
    guests,
    contactEmail,
    contactPhone,
    specialRequests
  } = body;

  return {
    hotelId,
    offerId,
    hotelName,
    hotelData,
    checkInDate,
    checkOutDate,
    roomQuantity,
    adults,
    guests,
    contactEmail,
    contactPhone,
    specialRequests
  };
}

// ═══════════════════════════════════════════════════════════════
// 📝 CREATE HOTEL BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * Create Hotel Booking
 * POST /api/hotel-bookings/create
 * Requires authentication OR guest email/phone
 */
const createHotelBooking = AsyncHandler(async (req, res) => {
  const userId = req.user?.userId || null;

  const result = await hotelBookingService.createHotelBooking(pickBookingInput(req.body), userId);

  return ApiResponse.success(
    res,
    result,
    'Hotel booking created successfully',
    StatusCodes.CREATED
  );
});

// ═══════════════════════════════════════════════════════════════
// 💳 CREATE BOOKING + PAYMENT (Combined Flow)
// ═══════════════════════════════════════════════════════════════

/**
 * Create Hotel Booking and Initiate Payment
 * POST /api/hotel-bookings/create-and-pay
 */
const createHotelBookingAndPay = AsyncHandler(async (req, res) => {
  const { paymentAcquirer, successUrl, failureUrl } = req.body;
  const input = pickBookingInput(req.body);
  const userId = req.user?.userId || null;

  // Step 1: Create booking (price is validated against the supplier offer)
  const bookingResult = await hotelBookingService.createHotelBooking(input, userId);

  // Step 2: Initiate payment against the hotel booking.
  // If this fails the booking stays 'pending' and expires; the user can retry
  // via POST /api/payments/create with bookingType 'hotel'.
  const paymentResult = await paymentService.initiatePayment(
    bookingResult.bookingId,
    {
      bookingType: 'hotel',
      access: null, // trusted: booking was created in this same request
      acquirer: paymentAcquirer || 'RAZORPAY',
      customerEmail: input.contactEmail,
      customerPhone: input.contactPhone,
      customerName: input.guests?.[0]?.firstName || 'Guest',
      successUrl,
      failureUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  );

  return ApiResponse.success(
    res,
    {
      booking: { ...bookingResult, status: 'payment_initiated' },
      payment: paymentResult
    },
    'Hotel booking created and payment initiated',
    StatusCodes.CREATED
  );
});

// ═══════════════════════════════════════════════════════════════
// 📖 GET HOTEL BOOKINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get Hotel Booking by ID
 * GET /api/hotel-bookings/:bookingId
 * Owner only (booking IDs are sequential)
 */
const getHotelBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const result = await hotelBookingService.getHotelBookingById(bookingId, { userId: req.user.userId });

  return ApiResponse.success(
    res,
    result,
    'Hotel booking retrieved successfully',
    StatusCodes.OK
  );
});

/**
 * Get Hotel Booking by Reference
 * GET /api/hotel-bookings/reference/:bookingReference
 * Query: ?email=xxx (required for guests)
 */
const getHotelBookingByReference = AsyncHandler(async (req, res) => {
  const { bookingReference } = req.params;

  const result = await hotelBookingService.getHotelBookingByReference(bookingReference, getBookingAccess(req));

  return ApiResponse.success(
    res,
    result,
    'Hotel booking retrieved successfully',
    StatusCodes.OK
  );
});

/**
 * Get My Hotel Bookings
 * GET /api/hotel-bookings/my-bookings
 * Requires authentication
 */
const getMyHotelBookings = AsyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const result = await hotelBookingService.getUserHotelBookings(userId);

  return ApiResponse.success(
    res,
    result,
    'Hotel bookings retrieved successfully',
    StatusCodes.OK
  );
});

// ═══════════════════════════════════════════════════════════════
// ❌ CANCEL HOTEL BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * Cancel Hotel Booking
 * POST /api/hotel-bookings/:bookingId/cancel
 * Owner only
 */
const cancelHotelBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  const result = await hotelBookingService.cancelHotelBooking(
    bookingId,
    { userId: req.user.userId },
    reason
  );

  return ApiResponse.success(
    res,
    result,
    'Hotel booking cancelled successfully',
    StatusCodes.OK
  );
});

// ═══════════════════════════════════════════════════════════════
// ✅ CONFIRM HOTEL BOOKING (after payment)
// ═══════════════════════════════════════════════════════════════

/**
 * Confirm Hotel Booking
 * POST /api/hotel-bookings/:bookingId/confirm
 * Records supplier confirmation details. Payment success already confirms the
 * booking; this endpoint refuses unpaid bookings.
 */
const confirmHotelBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { paymentDetails } = req.body;

  const updatedBooking = await hotelBookingService.confirmHotelBooking(
    bookingId,
    { userId: req.user.userId },
    {
      providerConfirmationId: paymentDetails?.providerConfirmationId,
      amadeusOrderId: paymentDetails?.amadeusOrderId
    }
  );

  return ApiResponse.success(
    res,
    updatedBooking,
    'Hotel booking confirmed successfully',
    StatusCodes.OK
  );
});

module.exports = {
  createHotelBooking,
  createHotelBookingAndPay,
  getHotelBooking,
  getHotelBookingByReference,
  getMyHotelBookings,
  cancelHotelBooking,
  confirmHotelBooking
};
