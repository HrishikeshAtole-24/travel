/**
 * Hotel Booking Controller
 * Handles hotel booking HTTP requests with payment flow
 * Follows same pattern as booking.controller.js (flights)
 */
const hotelBookingService = require('../services/hotel-booking.service');
const hotelService = require('../services/hotel.service');
const paymentService = require('../payments/payment.service');
const AsyncHandler = require('../core/AsyncHandler');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');

// ═══════════════════════════════════════════════════════════════
// 📝 CREATE HOTEL BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * Create Hotel Booking
 * POST /api/hotel-bookings/create
 * Requires authentication OR guest email/phone
 */
const createHotelBooking = AsyncHandler(async (req, res) => {
  const {
    hotelId,
    offerId,
    hotelName,
    hotelData,
    offerData,
    checkInDate,
    checkOutDate,
    roomQuantity,
    adults,
    guests,
    contactEmail,
    contactPhone,
    totalPrice,
    currency,
    specialRequests
  } = req.body;

  const userId = req.user?.userId || null;

  const result = await hotelBookingService.createHotelBooking({
    hotelId,
    offerId,
    hotelName,
    hotelData,
    offerData,
    checkInDate,
    checkOutDate,
    roomQuantity,
    adults,
    guests,
    contactEmail,
    contactPhone,
    totalPrice,
    currency,
    specialRequests
  }, userId);

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
  const {
    hotelId,
    offerId,
    hotelName,
    hotelData,
    offerData,
    checkInDate,
    checkOutDate,
    roomQuantity,
    adults,
    guests,
    contactEmail,
    contactPhone,
    totalPrice,
    currency,
    specialRequests,
    paymentAcquirer,
    successUrl,
    failureUrl
  } = req.body;

  const userId = req.user?.userId || null;

  // Step 1: Validate offer price (optional - if offerId provided)
  if (offerId) {
    try {
      const validatedOffer = await hotelService.getHotelOfferById(offerId);
      if (validatedOffer && validatedOffer.pricing) {
        const priceDiff = Math.abs(validatedOffer.pricing.totalAmount - totalPrice);
        if (priceDiff > 1) {
          logger.warn(`⚠️ Hotel price changed: submitted=${totalPrice}, current=${validatedOffer.pricing.totalAmount}`);
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not validate hotel offer price:', error.message);
      // Don't block booking, just log warning
    }
  }

  // Step 2: Create booking
  const bookingResult = await hotelBookingService.createHotelBooking({
    hotelId,
    offerId,
    hotelName,
    hotelData,
    offerData,
    checkInDate,
    checkOutDate,
    roomQuantity,
    adults,
    guests,
    contactEmail,
    contactPhone,
    totalPrice,
    currency,
    specialRequests
  }, userId);

  // Step 3: Initiate payment
  const paymentResult = await paymentService.initiatePayment(
    bookingResult.bookingId,
    {
      acquirer: paymentAcquirer || 'RAZORPAY',
      customerEmail: contactEmail,
      customerPhone: contactPhone,
      customerName: guests[0]?.firstName || 'Guest',
      successUrl: successUrl,
      failureUrl: failureUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      bookingType: 'hotel'
    }
  );

  // Step 4: Update booking status to payment_initiated
  await hotelBookingService.updateHotelBookingStatus(
    bookingResult.bookingId,
    'payment_initiated'
  );

  return ApiResponse.success(
    res,
    {
      booking: bookingResult,
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
 */
const getHotelBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user?.userId || null;

  const result = await hotelBookingService.getHotelBookingById(bookingId, userId);

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
 * Query: ?email=xxx
 */
const getHotelBookingByReference = AsyncHandler(async (req, res) => {
  const { bookingReference } = req.params;
  const { email } = req.query;

  const result = await hotelBookingService.getHotelBookingByReference(bookingReference, email);

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
 */
const cancelHotelBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId || null;

  const result = await hotelBookingService.updateHotelBookingStatus(
    bookingId,
    'cancelled',
    { cancellationReason: reason }
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
 * Called after successful payment to confirm with Amadeus
 */
const confirmHotelBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { paymentDetails } = req.body;

  // Get booking details
  const booking = await hotelBookingService.getHotelBookingById(bookingId);

  if (!booking) {
    throw ApiError.notFound('Hotel booking not found');
  }

  if (booking.status !== 'payment_initiated' && booking.status !== 'pending') {
    throw ApiError.badRequest(`Cannot confirm booking with status: ${booking.status}`);
  }

  // Update booking status to confirmed
  const updatedBooking = await hotelBookingService.updateHotelBookingStatus(
    bookingId,
    'confirmed',
    {
      providerConfirmationId: paymentDetails?.providerConfirmationId || null,
      amadeusOrderId: paymentDetails?.amadeusOrderId || null
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
