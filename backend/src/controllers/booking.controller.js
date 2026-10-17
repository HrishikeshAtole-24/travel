/**
 * Booking Controller
 * Handles booking-related HTTP requests
 */

const bookingService = require('../services/booking.service');
const paymentService = require('../payments/payment.service');
const emailService = require('../services/email.service');
const ticketService = require('../services/ticket.service');
const itineraryService = require('../services/itinerary.service');
const AsyncHandler = require('../core/AsyncHandler');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');
const ticketingService = require('../services/ticketing.service');

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
 * Create Booking
 * POST /api/bookings/create
 * Requires authentication OR guest email/phone
 */
const createBooking = AsyncHandler(async (req, res) => {
  const {
    flightId,
    flightData,
    travelers,
    contactEmail,
    contactPhone,
    specialRequests,
    validatedFlightOffer
  } = req.body;

  // Get user ID from token (if logged in)
  const userId = req.user?.userId || null;

  // Create booking
  const result = await bookingService.createBooking({
    flightId,
    flightData,
    travelers,
    contactEmail,
    contactPhone,
    specialRequests,
    validatedFlightOffer
  }, userId);

  return ApiResponse.success(
    res,
    result,
    'Booking created successfully',
    StatusCodes.CREATED
  );
});

/**
 * Create Booking and Initiate Payment (Combined flow)
 * POST /api/bookings/create-and-pay
 */
const createBookingAndInitiatePayment = AsyncHandler(async (req, res) => {
  const {
    flightId,
    flightData,
    travelers,
    contactEmail,
    contactPhone,
    specialRequests,
    validatedFlightOffer,
    paymentAcquirer,
    successUrl,
    failureUrl
  } = req.body;

  const userId = req.user?.userId || null;

  // Step 1: Create booking
  const bookingResult = await bookingService.createBooking({
    flightId,
    flightData,
    travelers,
    contactEmail,
    contactPhone,
    specialRequests,
    validatedFlightOffer
  }, userId);

  // Step 2: Initiate payment
  const paymentResult = await paymentService.initiatePayment(
    bookingResult.bookingId,
    {
      access: null, // trusted: booking was created in this same request
      acquirer: paymentAcquirer || 'RAZORPAY',
      customerEmail: contactEmail,
      customerPhone: contactPhone,
      customerName: travelers[0]?.firstName || 'Guest',
      successUrl: successUrl,
      failureUrl: failureUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  );

  return ApiResponse.success(
    res,
    {
      booking: bookingResult,
      payment: paymentResult
    },
    'Booking created and payment initiated',
    StatusCodes.CREATED
  );
});

/**
 * Get Booking by ID
 * GET /api/bookings/:bookingId
 */
const getBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const result = await bookingService.getBookingById(bookingId, { userId: req.user.userId });

  return ApiResponse.success(
    res,
    result,
    'Booking retrieved successfully',
    StatusCodes.OK
  );
});

/**
 * Get Booking by Reference
 * GET /api/bookings/reference/:bookingReference
 * Query: ?email=xxx (for guest bookings)
 */
const getBookingByReference = AsyncHandler(async (req, res) => {
  const { bookingReference } = req.params;

  const result = await bookingService.getBookingByReference(bookingReference, getBookingAccess(req));

  // Full itinerary for the confirmation page (supplier order once ticketed, cached)
  if (result.booking && ['confirmed', 'completed'].includes(result.booking.status)) {
    result.booking.itinerary = await itineraryService.getTicketItinerary(result.booking);
  }

  return ApiResponse.success(
    res,
    result,
    'Booking retrieved successfully',
    StatusCodes.OK
  );
});

/**
 * Get My Bookings
 * GET /api/bookings/my-bookings
 * Requires authentication
 */
const getMyBookings = AsyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const result = await bookingService.getUserBookings(userId);

  return ApiResponse.success(
    res,
    result,
    'Bookings retrieved successfully',
    StatusCodes.OK
  );
});

/**
 * Cancel Booking
 * POST /api/bookings/:bookingId/cancel
 */
const cancelBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  // Only the owner can cancel by numeric ID (IDs are sequential)
  const result = await bookingService.cancelBooking(
    bookingId,
    { userId: req.user.userId },
    reason
  );

  return ApiResponse.success(
    res,
    result,
    'Booking cancelled successfully',
    StatusCodes.OK
  );
});

/** camelCase booking (booking.service) -> fields the ticket PDF reads */
const toTicketBooking = (booking) => ({
  booking_reference: booking.bookingReference,
  travelers: booking.travelers,
  total_price: booking.totalPrice,
  currency: booking.currency,
  pnr: booking.pnr,
  ticket_number: booking.ticketNumber,
  status: booking.status,
  created_at: booking.createdAt,
  payments: booking.payments
});

/**
 * Download E-Ticket
 * GET /api/bookings/:bookingReference/ticket
 */
const downloadTicket = AsyncHandler(async (req, res) => {
  const { bookingReference } = req.params;

  // Get booking details (owner or contact email only)
  const result = await bookingService.getBookingByReference(bookingReference, getBookingAccess(req));
  
  if (!result.success || !result.booking) {
    throw ApiError.notFound('Booking not found');
  }

  const booking = result.booking;

  // Check if booking is confirmed
  if (booking.status !== 'confirmed') {
    throw ApiError.badRequest('E-ticket is only available for confirmed bookings');
  }

  const itinerary = await itineraryService.getTicketItinerary(booking);
  const pdfBuffer = await ticketService.generateTicketPDF(toTicketBooking(booking), itinerary);

  // Set response headers for PDF download
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="SkyWings-Ticket-${bookingReference}.pdf"`,
    'Content-Length': pdfBuffer.length
  });

  logger.info(`[Booking] Ticket downloaded for ${bookingReference}`);
  
  return res.send(pdfBuffer);
});

/**
 * Send Confirmation Email
 * POST /api/bookings/:bookingReference/send-confirmation
 */
const sendConfirmationEmail = AsyncHandler(async (req, res) => {
  const { bookingReference } = req.params;

  // Get booking details (owner or contact email only)
  const result = await bookingService.getBookingByReference(bookingReference, getBookingAccess(req));
  
  if (!result.success || !result.booking) {
    throw ApiError.notFound('Booking not found');
  }

  const booking = result.booking;

  if (booking.status !== 'confirmed') {
    throw ApiError.badRequest('The confirmation email is available once the booking is confirmed');
  }

  const emailResult = await emailService.sendFlightTicketEmail(booking);

  if (emailResult.success) {
    logger.info(`[Booking] Confirmation email sent for ${bookingReference}`);
    return ApiResponse.success(
      res,
      { emailSent: true },
      'Confirmation email sent successfully',
      StatusCodes.OK
    );
  } else {
    throw ApiError.internal(emailResult.error === 'not_configured'
      ? 'Email sending is not configured on the server'
      : 'Failed to send confirmation email');
  }
});

/**
 * Retry airline ticketing for a paid booking whose ticketing FAILED
 * POST /api/bookings/:bookingId/retry-ticketing
 * Admin only (X-Admin-Key)
 */
const retryTicketing = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const result = await ticketingService.issueFlightTickets(bookingId, { retry: true });

  if (result.status === 'SKIPPED') {
    throw ApiError.badRequest('Booking is not paid or is not awaiting ticketing');
  }

  return ApiResponse.success(
    res,
    result,
    result.success ? 'Tickets issued' : 'Ticketing failed',
    StatusCodes.OK
  );
});

module.exports = {
  toTicketBooking,
  retryTicketing,
  createBooking,
  createBookingAndInitiatePayment,
  getBooking,
  getBookingByReference,
  getMyBookings,
  cancelBooking,
  downloadTicket,
  sendConfirmationEmail
};
