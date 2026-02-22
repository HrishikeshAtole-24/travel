/**
 * Payment Controller
 * Handles payment-related HTTP requests
 */

const paymentService = require('./payment.service');
const AsyncHandler = require('../core/AsyncHandler');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');
const { PaymentStatus, PaymentError } = require('../core/PaymentStatusCodes');
const logger = require('../config/winstonLogger');

/**
 * Create/Initiate Payment
 * POST /api/payments/create
 */
const createPayment = AsyncHandler(async (req, res) => {
  const { bookingId, acquirer, customerEmail, customerName, customerPhone } = req.body;

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required');
  }

  const paymentOptions = {
    acquirer: acquirer || 'RAZORPAY',
    customerEmail,
    customerName,
    customerPhone,
    successUrl: req.body.successUrl,
    failureUrl: req.body.failureUrl,
    callbackUrl: req.body.callbackUrl || `${process.env.APP_URL}/api/payments/callback`,
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
    return ApiResponse.error(res, result, 'Payment verification failed', StatusCodes.BAD_REQUEST);
  }
});

/**
 * Verify Razorpay Payment (called from EJS payment page)
 * POST /api/payments/verify
 * Returns JSON for frontend to handle redirect
 */
const verifyRazorpayPayment = AsyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingReference } = req.body;

  logger.info(`[VerifyPayment] Received: payment_id=${razorpay_payment_id}, order_id=${razorpay_order_id}`);

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing required payment parameters'
    });
  }

  const { getPool } = require('../config/database');
  const crypto = require('crypto');
  const pool = getPool();

  try {
    // Find payment by order_id
    const result = await pool.query(
      `SELECT p.*, b.booking_reference, b.id as booking_id
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.acquirer_order_id = $1`,
      [razorpay_order_id]
    );

    if (result.rows.length === 0) {
      logger.error(`[VerifyPayment] Payment not found for order_id: ${razorpay_order_id}`);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = result.rows[0];

    // Verify signature
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signatureString)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      logger.warn(`[VerifyPayment] Signature mismatch for payment: ${razorpay_payment_id}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    logger.info(`[VerifyPayment] Signature verified for payment: ${razorpay_payment_id}`);

    // Update payment status to SUCCESS
    await pool.query(
      `UPDATE payments 
       SET status = $1, 
           acquirer_transaction_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [PaymentStatus.SUCCESS, razorpay_payment_id, payment.id]
    );

    // Update booking status to confirmed
    await pool.query(
      `UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [payment.booking_id]
    );

    logger.info(`[VerifyPayment] Payment ${payment.payment_reference} verified successfully, booking ${payment.booking_reference} confirmed`);

    // Send confirmation email asynchronously
    try {
      const emailService = require('../services/email.service');
      const bookingService = require('../services/booking.service');
      
      // Get full booking details for email
      const bookingDetails = await bookingService.getBookingByReference(payment.booking_reference);
      if (bookingDetails.success && bookingDetails.booking) {
        const booking = bookingDetails.booking;
        await emailService.sendBookingConfirmation({
          ...booking,
          flight_data: booking.flightData
        }, booking.contactEmail);
        logger.info(`[VerifyPayment] Confirmation email sent for ${payment.booking_reference}`);
      }
    } catch (emailError) {
      // Don't fail the payment if email fails
      logger.error('[VerifyPayment] Failed to send confirmation email:', emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentReference: payment.payment_reference,
      bookingReference: payment.booking_reference
    });

  } catch (error) {
    logger.error('[VerifyPayment] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed: ' + error.message
    });
  }
});

/**
 * Get Payment Status
 * GET /api/payments/:paymentReference/status
 */
const getPaymentStatus = AsyncHandler(async (req, res) => {
  const { paymentReference } = req.params;

  if (!paymentReference) {
    throw ApiError.badRequest('Payment reference is required');
  }

  const result = await paymentService.checkPaymentStatus(paymentReference);

  return ApiResponse.success(res, result, 'Payment status retrieved successfully', StatusCodes.OK);
});

/**
 * Process Refund
 * POST /api/payments/:paymentReference/refund
 */
const processRefund = AsyncHandler(async (req, res) => {
  const { paymentReference } = req.params;
  const { amount, reason } = req.body;

  if (!paymentReference) {
    throw ApiError.badRequest('Payment reference is required');
  }

  if (!amount || amount <= 0) {
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
    const webhookData = req.body;
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
      rawBody: req.rawBody || req.body,
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

  if (!paymentReference) {
    throw ApiError.badRequest('Payment reference is required');
  }

  const paymentModel = require('../models/payment.model');
  const payment = await paymentModel.getPaymentByReference(paymentReference);

  if (!payment) {
    throw ApiError.notFound(PaymentError.PAYMENT_NOT_FOUND.message);
  }

  // Remove sensitive data
  const sanitizedPayment = {
    paymentReference: payment.payment_reference,
    bookingId: payment.booking_id,
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

  return ApiResponse.success(res, sanitizedPayment, 'Payment details retrieved successfully', StatusCodes.OK);
});

/**
 * Get Payments by Booking ID
 * GET /api/payments/booking/:bookingId
 */
const getPaymentsByBooking = AsyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required');
  }

  const paymentModel = require('../models/payment.model');
  const payments = await paymentModel.getPaymentByBookingId(bookingId);

  // Remove sensitive data from all payments
  const sanitizedPayments = payments.map(payment => ({
    paymentReference: payment.payment_reference,
    bookingId: payment.booking_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.payment_method,
    acquirer: payment.acquirer,
    refundedAmount: payment.refunded_amount,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  }));

  return ApiResponse.success(res, sanitizedPayments, 'Payments retrieved successfully', StatusCodes.OK);
});

/**
 * Handle Payment Callback (GET from Razorpay)
 * GET /api/payments/callback?payment_id=xxx&order_id=xxx&signature=xxx&status=xxx
 * Redirects to merchant success_url or failure_url
 */
const handlePaymentCallback = AsyncHandler(async (req, res) => {
  const { payment_id, order_id, signature, status, reason } = req.query;

  logger.info(`[PaymentCallback] Received: ${JSON.stringify(req.query)}`);

  // Find payment by order_id
  const { getPool } = require('../config/database');
  const { mapAcquirerStatusFromDB } = require('../models/acquirer-status-mapping.model');
  const { StandardPaymentStatus } = require('../core/StandardPaymentStatus');
  const { PaymentStatus } = require('../core/PaymentStatusCodes');
  
  /**
   * Convert numeric status code to database enum value
   */
  const convertStatusCodeToEnum = (statusCode) => {
    // Map numeric codes to enum values
    const codeToEnum = {
      '200': PaymentStatus.SUCCESS,        // CAPTURED -> SUCCESS
      '330': PaymentStatus.SUCCESS,        // APPROVED -> SUCCESS
      'approved': PaymentStatus.SUCCESS,
      'AUTHORIZED': PaymentStatus.PROCESSING,
      'SUCCESS': PaymentStatus.SUCCESS,
      
      'CREATED': PaymentStatus.CREATED,
      'PENDING': PaymentStatus.PENDING,
      'processing': PaymentStatus.PROCESSING,
      '100': PaymentStatus.PROCESSING,     // INPROGRESS
      '501': PaymentStatus.PENDING,        // PENDING_STATUS
      '406': PaymentStatus.PROCESSING,     // UNDER_PROCESS
      
      '400': PaymentStatus.FAILED,         // FAILED
      '500': PaymentStatus.FAILED,         // TRANSACTION_FAILED
      '332': PaymentStatus.FAILED,         // PAYMENT_FAILED
      '402': PaymentStatus.FAILED,         // ACQUIRER_ERROR
      '405': PaymentStatus.FAILED,         // AUTH_FAILED
      '409': PaymentStatus.FAILED,         // SIGNATURE_MISMATCH
      '411': PaymentStatus.FAILED,         // RECURRING_ERROR
      '505': PaymentStatus.FAILED,         // PAYMENT_OPTION_NOT_SUPPORTED
      
      '401': PaymentStatus.FAILED,         // DECLINED
      '403': PaymentStatus.FAILED,         // DENIED
      '412': PaymentStatus.FAILED,         // FRAUD_DENIED
      
      '410': PaymentStatus.CANCELLED,      // CANCELLED
      '407': PaymentStatus.CANCELLED,      // REJECTED
      
      '404': PaymentStatus.FAILED,         // TIMEOUT
      '408': PaymentStatus.FAILED,         // DUPLICATE
      
      '502': PaymentStatus.FAILED,         // INVALID
      '300': PaymentStatus.FAILED,         // INVALID_REQUEST
    };
    
    return codeToEnum[statusCode] || PaymentStatus.FAILED;
  };
  
  const pool = getPool();
  
  try {
    // Find payment by acquirer order ID
    const result = await pool.query(
      `SELECT p.*, b.booking_reference 
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.acquirer_order_id = $1`,
      [order_id]
    );

    if (result.rows.length === 0) {
      // No payment found - redirect to generic failure
      logger.error(`[PaymentCallback] Payment not found for order_id: ${order_id}`);
      return res.redirect('/api/payment-error?error=Payment%20Not%20Found&message=The payment reference could not be found');
    }

    const payment = result.rows[0];
    const acquirer = payment.acquirer || 'RAZORPAY';
    
    // Determine status from query params
    let acquirerStatus = status === 'failed' ? 'failed' : (payment_id ? 'captured' : 'failed');
    
    // Map to standard status code (numeric)
    const statusCode = await mapAcquirerStatusFromDB(acquirer, acquirerStatus);
    
    // Convert status code to database enum value
    const dbStatus = convertStatusCodeToEnum(statusCode);
    
    logger.info(`[PaymentCallback] Status mapping: ${acquirerStatus} -> ${statusCode} -> ${dbStatus}`);
    
    // Update payment in database
    await pool.query(
      `UPDATE payments 
       SET status = $1, 
           acquirer_transaction_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [dbStatus, payment_id || null, payment.id]
    );

    // Update booking status if payment successful
    if (dbStatus === PaymentStatus.SUCCESS || statusCode === '200' || statusCode === 'approved') {
      await pool.query(
        `UPDATE bookings SET status = 'confirmed' WHERE id = $1`,
        [payment.booking_id]
      );
    }

    // Parse redirect URLs from metadata
    const metadata = payment.metadata || {};
    const successUrl = metadata.success_url || 'https://www.google.com';
    const failureUrl = metadata.failure_url || 'https://www.youtube.com';

    logger.info(`[PaymentCallback] Payment ${payment.payment_reference}: ${dbStatus}`);

    // Redirect based on status
    if (dbStatus === PaymentStatus.SUCCESS) {
      // Success - redirect to success URL
      const redirectUrl = `${successUrl}?payment_reference=${payment.payment_reference}&status=success&booking_reference=${payment.booking_reference}`;
      logger.info(`[PaymentCallback] Redirecting to success URL: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    } else {
      // Failure - redirect to failure URL
      const redirectUrl = `${failureUrl}?payment_reference=${payment.payment_reference}&status=failed&reason=${encodeURIComponent(reason || 'Payment failed')}`;
      logger.info(`[PaymentCallback] Redirecting to failure URL: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    }
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
