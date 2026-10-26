/**
 * Payment Controller
 * Handles payment-related HTTP requests
 */

const paymentService = require('./payment.service');
const paymentModel = require('../models/payment.model');
const AsyncHandler = require('../core/AsyncHandler');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');
const { PaymentStatus, PaymentError } = require('../core/PaymentStatusCodes');
const { getPool } = require('../config/database');
const { canAccessBooking } = require('../services/booking.service');
const { verifyRazorpaySignature, getFrontendBaseUrl } = require('../utils/security');
const logger = require('../config/winstonLogger');

/**
 * Identity the caller can prove: JWT user and/or the booking contact email
 */
function getAccess(req) {
  return {
    userId: req.user?.userId || null,
    email: req.query?.email || req.body?.email || null
  };
}

/**
 * Load a payment and make sure the caller may see it (owner or booking contact email)
 */
async function getAccessiblePayment(req, paymentReference) {
  const payment = await paymentModel.getPaymentByReference(paymentReference);
  if (!payment) {
    throw ApiError.notFound(PaymentError.PAYMENT_NOT_FOUND.message);
  }

  const { config, bookingId } = paymentService.getPaymentBooking(payment);
  const result = await getPool().query(
    `SELECT user_id, contact_email FROM ${config.table} WHERE id = $1`,
    [bookingId]
  );

  if (result.rows.length === 0 || !canAccessBooking(result.rows[0], getAccess(req))) {
    // Same response as "missing" so references can't be probed
    throw ApiError.notFound(PaymentError.PAYMENT_NOT_FOUND.message);
  }

  return payment;
}

/**
 * Strip internal/acquirer fields before returning a payment
 */
function sanitizePayment(payment) {
  const { bookingType, bookingId } = paymentService.getPaymentBooking(payment);
  return {
    paymentReference: payment.payment_reference,
    bookingType,
    bookingId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.payment_method,
    acquirer: payment.acquirer,
    refundedAmount: payment.refunded_amount,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
    expiresAt: payment.expires_at
  };
}

/**
 * Send the flight confirmation email after a verified payment (best effort)
 */
async function sendFlightConfirmationEmail(bookingReference) {
  try {
    const emailService = require('../services/email.service');
    const bookingService = require('../services/booking.service');

    // Trusted internal call: payment signature was verified before we got here
    const bookingDetails = await bookingService.getBookingByReference(bookingReference, null);
    if (bookingDetails.success && bookingDetails.booking?.status === 'confirmed') {
      // E-ticket email with the PDF attached (itinerary from the supplier order)
      await emailService.sendFlightTicketEmail(bookingDetails.booking);
    }
  } catch (emailError) {
    // Don't fail the payment if email fails
    logger.error('[Payment] Failed to send confirmation email:', emailError.message);
  }
}

/**
 * Create/Initiate Payment
 * POST /api/payments/create
 */
const createPayment = AsyncHandler(async (req, res) => {
  const { bookingId, bookingType, acquirer, customerEmail, customerName, customerPhone } = req.body;

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required');
  }

  const paymentOptions = {
    bookingType: bookingType || 'flight',
    // Booking IDs are sequential, so only the logged-in owner may pay by ID
    access: { userId: req.user.userId },
    acquirer: acquirer || 'RAZORPAY',
    customerEmail,
    customerName,
    customerPhone,
    successUrl: req.body.successUrl,
    failureUrl: req.body.failureUrl,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const result = await paymentService.initiatePayment(bookingId, paymentOptions);

  return ApiResponse.success(res, result, 'Payment initiated successfully', StatusCodes.CREATED);
});

/**
 * Verify Payment Callback
 * POST /api/payments/callback
 */
const verifyPayment = AsyncHandler(async (req, res) => {
  const { paymentReference } = req.body;

  if (!paymentReference) {
    throw ApiError.badRequest('Payment reference is required');
  }

  const callbackData = req.body;
  const result = await paymentService.verifyPaymentCallback(paymentReference, callbackData);

  if (result.status === PaymentStatus.SUCCESS) {
    return ApiResponse.success(res, result, 'Payment verified successfully', StatusCodes.OK);
  } else {
    return res.status(StatusCodes.BAD_REQUEST).json(ApiResponse.error('Payment verification failed', StatusCodes.BAD_REQUEST, result));
  }
});

/**
 * Verify Razorpay Payment (called from EJS payment page)
 * POST /api/payments/verify
 * Returns JSON for frontend to handle redirect
 */
const verifyRazorpayPayment = AsyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  logger.info(`[VerifyPayment] Received: payment_id=${razorpay_payment_id}, order_id=${razorpay_order_id}`);

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing required payment parameters'
    });
  }

  try {
    const payment = await paymentService.findPaymentByOrderId(razorpay_order_id);

    if (!payment) {
      logger.error(`[VerifyPayment] Payment not found for order_id: ${razorpay_order_id}`);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)) {
      logger.warn(`[VerifyPayment] Signature mismatch for payment: ${razorpay_payment_id}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    logger.info(`[VerifyPayment] Signature verified for payment: ${razorpay_payment_id}`);

    const { alreadyProcessed, bookingType } = await paymentService.markPaymentSuccessful(payment, {
      acquirerPaymentId: razorpay_payment_id,
      acquirerTransactionId: razorpay_payment_id
    });

    // Confirmation emails are flight-specific today; send once per payment
    // E-ticket email goes out after the response so the traveller isn't kept waiting on SMTP
    if (!alreadyProcessed && bookingType === 'flight') {
      setImmediate(() => sendFlightConfirmationEmail(payment.booking_reference));
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentReference: payment.payment_reference,
      bookingReference: payment.booking_reference,
      bookingType
    });

  } catch (error) {
    logger.error('[VerifyPayment] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed. Please contact support if you were charged.'
    });
  }
});

/**
 * Get Payment Status
 * GET /api/payments/:paymentReference/status
 */
const getPaymentStatus = AsyncHandler(async (req, res) => {
  const { paymentReference } = req.params;

  await getAccessiblePayment(req, paymentReference);
  const result = await paymentService.checkPaymentStatus(paymentReference);

  return ApiResponse.success(res, result, 'Payment status retrieved successfully', StatusCodes.OK);
});

/**
 * Process Refund
 * POST /api/payments/:paymentReference/refund
 * Admin only (X-Admin-Key) - see payment.routes.js
 */
const processRefund = AsyncHandler(async (req, res) => {
  const { paymentReference } = req.params;
  const { amount, reason } = req.body;

  if (!paymentReference) {
    throw ApiError.badRequest('Payment reference is required');
  }

  if (!amount || parseFloat(amount) <= 0) {
    throw ApiError.badRequest('Valid refund amount is required');
  }

  if (!reason) {
    throw ApiError.badRequest('Refund reason is required');
  }

  const result = await paymentService.processRefund(paymentReference, amount, reason);

  return ApiResponse.success(res, result, 'Refund processed successfully', StatusCodes.OK);
});

/**
 * Razorpay Webhook Handler
 * POST /api/payments/webhook/razorpay
 */
const razorpayWebhook = AsyncHandler(async (req, res) => {
  try {
    const webhookData = {
      body: req.body,
      rawBody: req.rawBody, // captured in app.js express.json({ verify })
      signature: req.headers['x-razorpay-signature']
    };
    await paymentService.handleWebhook('RAZORPAY', webhookData);

    // Razorpay expects 200 OK response
    return res.status(StatusCodes.OK).json({ status: 'ok' });
  } catch (error) {
    logger.error('Razorpay webhook error:', error.message);
    // Still return 200 to avoid retries for invalid webhooks
    return res.status(StatusCodes.OK).json({ status: 'error' });
  }
});

/**
 * Stripe Webhook Handler
 * POST /api/payments/webhook/stripe
 */
const stripeWebhook = AsyncHandler(async (req, res) => {
  try {
    // For Stripe, we need the raw body for signature verification
    const webhookData = {
      rawBody: req.rawBody,
      signature: req.headers['stripe-signature']
    };

    await paymentService.handleWebhook('STRIPE', webhookData);

    // Stripe expects 200 OK response
    return res.status(StatusCodes.OK).json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error.message);
    // Still return 200 to avoid retries for invalid webhooks
    return res.status(StatusCodes.OK).json({ received: false });
  }
});

/**
 * Get Payment Details
 * GET /api/payments/:paymentReference
 */
const getPaymentDetails = AsyncHandler(async (req, res) => {
  const { paymentReference } = req.params;

  const payment = await getAccessiblePayment(req, paymentReference);

  return ApiResponse.success(res, sanitizePayment(payment), 'Payment details retrieved successfully', StatusCodes.OK);
});

/**
 * Get Payments by Booking ID
 * GET /api/payments/booking/:bookingId?type=flight|hotel
 * Owner only (booking IDs are sequential)
 */
const getPaymentsByBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const bookingType = req.query.type === 'hotel' ? 'hotel' : 'flight';
  const table = bookingType === 'hotel' ? 'hotel_bookings' : 'bookings';

  const bookingResult = await getPool().query(
    `SELECT user_id, contact_email FROM ${table} WHERE id = $1`,
    [bookingId]
  );

  if (bookingResult.rows.length === 0 || !canAccessBooking(bookingResult.rows[0], { userId: req.user.userId })) {
    throw ApiError.notFound(PaymentError.BOOKING_NOT_FOUND.message);
  }

  const payments = await paymentModel.getPaymentsByBookingId(bookingId, bookingType);

  return ApiResponse.success(res, payments.map(sanitizePayment), 'Payments retrieved successfully', StatusCodes.OK);
});

/**
 * Handle Payment Callback (GET redirect from Razorpay)
 * GET /api/payments/callback?payment_id=xxx&order_id=xxx&signature=xxx&status=xxx
 *
 * Only a callback carrying a valid Razorpay signature can mark a payment successful.
 * Anything else is treated as a failed/abandoned attempt and does NOT modify the DB
 * (otherwise anyone could fail or confirm someone else's payment).
 */
const handlePaymentCallback = AsyncHandler(async (req, res) => {
  const { payment_id, order_id, signature, reason } = req.query;

  logger.info(`[PaymentCallback] Received for order_id=${order_id}, payment_id=${payment_id}`);

  try {
    const payment = await paymentService.findPaymentByOrderId(order_id);

    if (!payment) {
      logger.error(`[PaymentCallback] Payment not found for order_id: ${order_id}`);
      return res.redirect('/api/payment-error?error=Payment%20Not%20Found&message=The payment reference could not be found');
    }

    const metadata = payment.metadata || {};
    const successUrl = metadata.success_url || `${getFrontendBaseUrl()}/payment-success`;
    const failureUrl = metadata.failure_url || `${getFrontendBaseUrl()}/payment-failed`;

    const verified = verifyRazorpaySignature(order_id, payment_id, signature, process.env.RAZORPAY_KEY_SECRET);

    if (verified) {
      const { alreadyProcessed, bookingType } = await paymentService.markPaymentSuccessful(payment, {
        acquirerPaymentId: payment_id,
        acquirerTransactionId: payment_id
      });

      if (!alreadyProcessed && bookingType === 'flight') {
        await sendFlightConfirmationEmail(payment.booking_reference);
      }

      const redirectUrl = new URL(successUrl);
      redirectUrl.searchParams.set('payment_reference', payment.payment_reference);
      redirectUrl.searchParams.set('status', 'success');
      redirectUrl.searchParams.set('booking_reference', payment.booking_reference);
      logger.info(`[PaymentCallback] Payment ${payment.payment_reference} verified, redirecting to success`);
      return res.redirect(redirectUrl.toString());
    }

    if (payment_id || signature) {
      logger.warn(`[PaymentCallback] Invalid signature for order_id: ${order_id}`);
    }

    const redirectUrl = new URL(failureUrl);
    redirectUrl.searchParams.set('payment_reference', payment.payment_reference);
    redirectUrl.searchParams.set('status', 'failed');
    redirectUrl.searchParams.set('reason', reason || 'Payment failed');
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('[PaymentCallback] Error:', error);
    // Redirect to generic error page
    return res.redirect('/api/payment-error?error=Server%20Error&message=An internal error occurred. Please try again.');
  }
});

module.exports = {
  createPayment,
  verifyPayment,
  verifyRazorpayPayment,
  getPaymentStatus,
  processRefund,
  razorpayWebhook,
  stripeWebhook,
  getPaymentDetails,
  getPaymentsByBooking,
  handlePaymentCallback
};
