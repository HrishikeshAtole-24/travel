/**
 * Booking Controller
 * Handles booking-related HTTP requests
 */

const bookingService = require('../services/booking.service');
const paymentService = require('../payments/payment.service');
const emailService = require('../services/email.service');
const ticketService = require('../services/ticket.service');
const AsyncHandler = require('../core/AsyncHandler');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');

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
    totalPrice,
    currency,
    specialRequests
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
    totalPrice,
    currency,
    specialRequests
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
    totalPrice,
    currency,
    specialRequests,
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
    totalPrice,
    currency,
    specialRequests
  }, userId);

  // Step 2: Initiate payment
  const paymentResult = await paymentService.initiatePayment(
    bookingResult.bookingId,
    {
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
  const userId = req.user?.userId || null;

  const result = await bookingService.getBookingById(bookingId, userId);

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
  const { email } = req.query;

  const result = await bookingService.getBookingByReference(bookingReference, email);

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
  const userId = req.user?.userId || null;

  // Update booking status to cancelled
  const result = await bookingService.updateBookingStatus(
    bookingId,
    'cancelled',
    { cancellationReason: reason }
  );

  return ApiResponse.success(
    res,
    result,
    'Booking cancelled successfully',
    StatusCodes.OK
  );
});

/**
 * Download E-Ticket
 * GET /api/bookings/:bookingReference/ticket
 */
const downloadTicket = AsyncHandler(async (req, res) => {
  const { bookingReference } = req.params;

  // Get booking details
  const result = await bookingService.getBookingByReference(bookingReference);
  
  if (!result.success || !result.booking) {
    throw ApiError.notFound('Booking not found');
  }

  const booking = result.booking;

  // Check if booking is confirmed
  if (booking.status !== 'confirmed') {
    throw ApiError.badRequest('E-ticket is only available for confirmed bookings');
  }

  // Map to snake_case format expected by ticket service
  const ticketData = {
    booking_reference: booking.bookingReference,
    flight_data: booking.flightData,
    travelers: booking.travelers,
    total_price: booking.totalPrice,
    currency: booking.currency,
    pnr: booking.pnr,
    status: booking.status
  };

  // Generate PDF ticket
  const pdfBuffer = await ticketService.generateTicketPDF(ticketData);

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

  // Get booking details
  const result = await bookingService.getBookingByReference(bookingReference);
  
  if (!result.success || !result.booking) {
    throw ApiError.notFound('Booking not found');
  }

  const booking = result.booking;

  // Map to snake_case format expected by email service
  const emailBooking = {
    booking_reference: booking.bookingReference,
    flight_data: booking.flightData,
    total_price: booking.totalPrice,
    currency: booking.currency,
    pnr: booking.pnr,
    travelers: booking.travelers,
    status: booking.status
  };

  // Send confirmation email
  const emailResult = await emailService.sendBookingConfirmation(
    emailBooking, 
    booking.contactEmail
  );

  if (emailResult.success) {
    logger.info(`[Booking] Confirmation email sent for ${bookingReference}`);
    return ApiResponse.success(
      res,
      { emailSent: true },
      'Confirmation email sent successfully',
      StatusCodes.OK
    );
  } else {
    throw ApiError.internal('Failed to send confirmation email');
  }
});

module.exports = {
  createBooking,
  createBookingAndInitiatePayment,
  getBooking,
  getBookingByReference,
  getMyBookings,
  cancelBooking,
  downloadTicket,
  sendConfirmationEmail
};
