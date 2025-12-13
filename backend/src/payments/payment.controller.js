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
      return res.redirect('/payment-error?reason=Payment not found');
    }

    const payment = result.rows[0];
    const acquirer = payment.acquirer || 'RAZORPAY';
    
    // Determine status from query params
    let acquirerStatus = status === 'failed' ? 'failed' : (payment_id ? 'captured' : 'failed');
    
    // Map to standard status
    const standardStatus = await mapAcquirerStatusFromDB(acquirer, acquirerStatus);
    
    // Update payment in database
    await pool.query(
      `UPDATE payments 
       SET status = $1, 
           acquirer_transaction_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [standardStatus, payment_id || null, payment.id]
    );

    // Update booking status
    if (standardStatus === StandardPaymentStatus.CAPTURED) {
      await pool.query(
        `UPDATE bookings SET status = 'confirmed' WHERE id = $1`,
        [payment.booking_id]
      );
    }

    // Parse redirect URLs from metadata
    const metadata = payment.metadata || {};
    const successUrl = metadata.success_url || 'https://www.google.com';
    const failureUrl = metadata.failure_url || 'https://www.youtube.com';

    logger.info(`[PaymentCallback] Payment ${payment.payment_reference}: ${standardStatus}`);

    // Redirect based on status
    if (standardStatus === StandardPaymentStatus.CAPTURED || standardStatus === StandardPaymentStatus.AUTHORIZED) {
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
    return res.redirect('/payment-error?reason=Internal server error');
  }
});

module.exports = {
  createPayment,
  verifyPayment,
  getPaymentStatus,
  processRefund,
  razorpayWebhook,
  stripeWebhook,
  getPaymentDetails,
  getPaymentsByBooking,
  handlePaymentCallback
};
