/**
 * Payment Service
 * Business logic for payment processing
 * Supports both flight bookings (bookings) and hotel bookings (hotel_bookings)
 */

const acquirerFactory = require('./acquirers/AcquirerFactory');
const paymentModel = require('../models/payment.model');
const { BOOKING_EXPIRY_MINUTES, canAccessBooking } = require('../services/booking.service');
const { PaymentStatus, PaymentError } = require('../core/PaymentStatusCodes');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');
const { getPool } = require('../config/database');
const ticketingService = require('../services/ticketing.service');
const hotelFulfillmentService = require('../services/hotelFulfillment.service');
const { isAllowedRedirectUrl, getFrontendBaseUrl } = require('../utils/security');

/**
 * Booking types a payment can belong to.
 * Table/column names come from this constant only - never from user input.
 */
const BOOKING_TYPES = {
  flight: { table: 'bookings', paymentColumn: 'booking_id', label: 'Flight' },
  hotel: { table: 'hotel_bookings', paymentColumn: 'hotel_booking_id', label: 'Hotel' }
};

function getBookingTypeConfig(bookingType = 'flight') {
  const config = BOOKING_TYPES[bookingType];
  if (!config) {
    throw ApiError.badRequest(`Unsupported booking type: ${bookingType}`);
  }
  return config;
}

/**
 * Which booking a payment row belongs to
 * @returns {{ bookingType: string, bookingId: number, config: Object }}
 */
function getPaymentBooking(payment) {
  const bookingType = payment.hotel_booking_id ? 'hotel' : 'flight';
  const config = BOOKING_TYPES[bookingType];
  return { bookingType, bookingId: payment[config.paymentColumn], config };
}

/**
 * Get payment credentials for acquirer
 * In production, fetch from environment variables or secure vault
 */
function getAcquirerCredentials(acquirer) {
  const credentials = {
    RAZORPAY: {
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
      webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET
    },
    STRIPE: {
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      secret_key: process.env.STRIPE_SECRET_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET
    }
  };

  return credentials[acquirer];
}

/**
 * Use the client-supplied redirect only if it points at our own frontend
 */
function resolveRedirectUrl(requestedUrl, fallbackPath) {
  if (requestedUrl && isAllowedRedirectUrl(requestedUrl)) {
    return requestedUrl;
  }
  if (requestedUrl) {
    logger.warn(`[Payment] Rejected redirect URL outside allowlist: ${requestedUrl}`);
  }
  return `${getFrontendBaseUrl()}${fallbackPath}`;
}

/**
 * Load the booking a payment is (or will be) for
 */
async function loadBooking(pool, bookingType, bookingId) {
  const { table } = getBookingTypeConfig(bookingType);
  const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [bookingId]);
  return result.rows[0] || null;
}

/**
 * Initialize payment for a booking
 * Industry standard: Creates a NEW payment transaction each time user retries
 * This allows proper tracking of payment attempts and handles expired payments
 *
 * @param {number} bookingId - ID in bookings (flight) or hotel_bookings (hotel)
 * @param {Object} paymentOptions
 * @param {'flight'|'hotel'} [paymentOptions.bookingType='flight']
 * @param {Object|null} paymentOptions.access - Caller identity { userId, email }.
 *   Pass null only from trusted internal flows (booking just created in the same request).
 */
const initiatePayment = async (bookingId, paymentOptions = {}) => {
  try {
    const pool = getPool();
    const bookingType = paymentOptions.bookingType || 'flight';
    const { table, paymentColumn, label } = getBookingTypeConfig(bookingType);

    // Fetch booking details
    const booking = await loadBooking(pool, bookingType, bookingId);

    const access = paymentOptions.access === undefined ? {} : paymentOptions.access;
    if (!booking || (access !== null && !canAccessBooking(booking, access))) {
      throw ApiError.notFound(PaymentError.BOOKING_NOT_FOUND.message);
    }

    const expiredMessage = bookingType === 'hotel'
      ? 'Booking has expired. Please create a new booking to ensure room availability.'
      : `Booking has expired. Flight seats are only held for ${BOOKING_EXPIRY_MINUTES} minutes. Please create a new booking to ensure seat availability.`;

    // Check if booking has expired
    if (booking.expires_at && new Date() > new Date(booking.expires_at)) {
      // Auto-expire the booking if not already expired
      if (['pending', 'payment_initiated'].includes(booking.status)) {
        await pool.query(
          `UPDATE ${table} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          ['expired', booking.id]
        );
        logger.info(`[Payment] Booking auto-expired: ${booking.booking_reference}`);
      }

      throw ApiError.badRequest(expiredMessage);
    }

    // Check if booking is in a confirming/completed state
    if (booking.status === 'confirmed') {
      throw ApiError.badRequest('This booking is already confirmed and paid');
    }

    if (booking.status === 'cancelled') {
      throw ApiError.badRequest('This booking has been cancelled');
    }

    if (booking.status === 'expired') {
      throw ApiError.badRequest(expiredMessage);
    }

    // Validate booking status - allow pending or payment_initiated (for retries)
    if (!['pending', 'payment_initiated'].includes(booking.status)) {
      throw ApiError.badRequest('Booking is not in a valid state for payment');
    }

    // Cancel any existing pending payments for this booking (to avoid duplicate charges)
    await pool.query(
      `UPDATE payments SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
       WHERE ${paymentColumn} = $1 AND status IN ('CREATED', 'PENDING')`,
      [booking.id]
    );
    logger.info(`[Payment] Cancelled pending payments for ${bookingType} booking ${bookingId} before creating new one`);

    // Select acquirer (default to Razorpay, can be based on amount, user preference, etc.)
    const acquirer = paymentOptions.acquirer || 'RAZORPAY';
    const acquirerClient = acquirerFactory.getAcquirer(acquirer);
    const credentials = getAcquirerCredentials(acquirer);

    if (!credentials || !credentials.key_id) {
      throw ApiError.internal('Payment gateway credentials not configured');
    }

    const successUrl = resolveRedirectUrl(paymentOptions.successUrl, '/payment-success');
    const failureUrl = resolveRedirectUrl(paymentOptions.failureUrl, '/payment-failed');

    // Create payment record (amount always comes from the stored booking, never the client)
    const paymentData = {
      bookingId: booking.id,
      bookingType,
      userId: booking.user_id,
      amount: parseFloat(booking.total_price),
      currency: booking.currency || 'INR',
      acquirer: acquirer,
      customerEmail: paymentOptions.customerEmail || booking.contact_email || 'customer@example.com',
      customerPhone: paymentOptions.customerPhone || booking.contact_phone || '',
      customerName: paymentOptions.customerName || '',
      successUrl,
      failureUrl,
      callbackUrl: `${process.env.APP_URL}/api/payments/callback`,
      description: `${label} booking payment for booking #${booking.booking_reference}`,
      ipAddress: paymentOptions.ipAddress,
      userAgent: paymentOptions.userAgent,
      metadata: {
        booking_type: bookingType,
        booking_reference: booking.booking_reference,
        ...(bookingType === 'hotel'
          ? { hotel_id: booking.hotel_id, offer_id: booking.offer_id }
          : { flight_id: booking.flight_id }),
        success_url: successUrl,
        failure_url: failureUrl
      }
    };

    const payment = await paymentModel.createPayment(paymentData);

    // Create order with acquirer
    const acquirerPaymentData = {
      ...paymentData,
      paymentReference: payment.payment_reference
    };

    const orderResult = await acquirerClient.createOrder(acquirerPaymentData, credentials);

    if (!orderResult.success) {
      // Update payment status to failed
      await paymentModel.updatePaymentStatus(payment.payment_reference, {
        status: PaymentStatus.FAILED,
        acquirerResponse: orderResult
      });

      throw ApiError.internal(orderResult.error || PaymentError.ACQUIRER_ERROR.message);
    }

    // Update payment with acquirer details
    await paymentModel.updatePaymentStatus(payment.payment_reference, {
      status: PaymentStatus.PENDING,
      acquirerOrderId: orderResult.acquirerOrderId,
      acquirerResponse: orderResult.rawResponse,
      paymentDetails: orderResult.checkoutData
    });

    // Update booking status
    await pool.query(
      `UPDATE ${table} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['payment_initiated', booking.id]
    );

    logger.info(`Payment initiated: ${payment.payment_reference}, Acquirer: ${acquirer}, Type: ${bookingType}`);

    return {
      success: true,
      paymentReference: payment.payment_reference,
      acquirer: acquirer,
      amount: payment.amount,
      currency: payment.currency,
      checkoutUrl: orderResult.checkoutUrl,
      checkoutData: orderResult.checkoutData,
      expiresAt: payment.expires_at
    };
  } catch (error) {
    logger.error('Payment initiation failed:', error.message);
    throw error;
  }
};

/**
 * Mark a VERIFIED payment as successful and confirm its booking, atomically,
 * then place the airline order for flight bookings (ticketing).
 * Idempotent: a payment that is already SUCCESS is left untouched.
 * Callers MUST have verified the acquirer signature before calling this.
 *
 * @param {Object} payment - payments row
 * @param {Object} details - { acquirerPaymentId, acquirerTransactionId, paymentMethod, acquirerResponse }
 * @returns {{ alreadyProcessed: boolean, bookingType: string, bookingId: number, ticketing?: Object }}
 */
const markPaymentSuccessful = async (payment, details = {}) => {
  const result = await confirmPaymentInDatabase(payment, details);

  // Book with the supplier only once, right after the payment first succeeds.
  // Failures are recorded on the booking (ticketing/fulfillment status FAILED) for follow-up.
  if (!result.alreadyProcessed) {
    const fulfill = result.bookingType === 'hotel'
      ? () => hotelFulfillmentService.fulfillHotelBooking(result.bookingId)
      : () => ticketingService.issueFlightTickets(result.bookingId);
    try {
      result.ticketing = await fulfill();
    } catch (error) {
      logger.error(`[Payment] Supplier booking error for ${result.bookingType} booking ${result.bookingId}:`, error.message);
      result.ticketing = { success: false, status: 'FAILED', error: error.message };
    }
  }

  return result;
};

/**
 * Payment SUCCESS + booking confirmed, in one transaction
 */
const confirmPaymentInDatabase = async (payment, details) => {
  const pool = getPool();
  const client = await pool.connect();
  const { bookingType, bookingId, config } = getPaymentBooking(payment);

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE payments
       SET status = 'SUCCESS',
           acquirer_payment_id = COALESCE($1, acquirer_payment_id),
           acquirer_transaction_id = COALESCE($2, acquirer_transaction_id),
           payment_method = COALESCE($3, payment_method),
           acquirer_response = COALESCE($4, acquirer_response),
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND status <> 'SUCCESS'
       RETURNING id`,
      [
        details.acquirerPaymentId || null,
        details.acquirerTransactionId || details.acquirerPaymentId || null,
        paymentModel.normalizePaymentMethod(details.paymentMethod),
        details.acquirerResponse ? JSON.stringify(details.acquirerResponse) : null,
        payment.id
      ]
    );

    if (updated.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.info(`[Payment] ${payment.payment_reference} already marked SUCCESS - skipping`);
      return { alreadyProcessed: true, bookingType, bookingId };
    }

    await client.query(
      `UPDATE ${config.table} SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [bookingId]
    );

    await client.query('COMMIT');
    logger.info(`[Payment] ${payment.payment_reference} SUCCESS - ${bookingType} booking ${bookingId} confirmed`);
    return { alreadyProcessed: false, bookingType, bookingId };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('[Payment] Failed to mark payment successful:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Find a payment by acquirer order ID, with its booking reference and contact email
 */
const findPaymentByOrderId = async (acquirerOrderId) => {
  if (!acquirerOrderId) return null;
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.*,
            COALESCE(b.booking_reference, hb.booking_reference) AS booking_reference,
            COALESCE(b.contact_email, hb.contact_email) AS contact_email
     FROM payments p
     LEFT JOIN bookings b ON p.booking_id = b.id
     LEFT JOIN hotel_bookings hb ON p.hotel_booking_id = hb.id
     WHERE p.acquirer_order_id = $1`,
    [acquirerOrderId]
  );
  return result.rows[0] || null;
};

/**
 * Verify payment callback
 */
const verifyPaymentCallback = async (paymentReference, callbackData) => {
  try {
    // Fetch payment details
    const payment = await paymentModel.getPaymentByReference(paymentReference);

    if (!payment) {
      throw ApiError.notFound(PaymentError.PAYMENT_NOT_FOUND.message);
    }

    // Check if payment already processed
    if (payment.status === PaymentStatus.SUCCESS) {
      logger.warn(`Payment already processed: ${paymentReference}`);
      return {
        success: true,
        status: PaymentStatus.SUCCESS,
        message: 'Payment already completed'
      };
    }

    // Check if payment expired
    if (new Date() > payment.expires_at) {
      await paymentModel.updatePaymentStatus(paymentReference, {
        status: PaymentStatus.FAILED
      });
      throw ApiError.badRequest(PaymentError.PAYMENT_EXPIRED.message);
    }

    // Get acquirer client
    const acquirerClient = acquirerFactory.getAcquirer(payment.acquirer);
    const credentials = getAcquirerCredentials(payment.acquirer);

    // Verify payment with acquirer
    const verificationResult = await acquirerClient.verifyPayment(callbackData, credentials);

    if (!verificationResult.success || !verificationResult.verified) {
      throw ApiError.badRequest(verificationResult.error || PaymentError.INVALID_SIGNATURE.message);
    }

    // The signed order must be the one this payment created
    if (verificationResult.acquirerOrderId && payment.acquirer_order_id &&
        verificationResult.acquirerOrderId !== payment.acquirer_order_id) {
      throw ApiError.badRequest(PaymentError.INVALID_SIGNATURE.message);
    }

    if (verificationResult.status === PaymentStatus.SUCCESS) {
      await markPaymentSuccessful(payment, {
        acquirerPaymentId: verificationResult.acquirerPaymentId,
        acquirerTransactionId: verificationResult.acquirerTransactionId,
        paymentMethod: verificationResult.paymentMethod,
        acquirerResponse: verificationResult.paymentDetails
      });
      logger.info(`Payment verified successfully: ${paymentReference}`);
    } else {
      await paymentModel.updatePaymentStatus(paymentReference, {
        status: verificationResult.status,
        acquirerPaymentId: verificationResult.acquirerPaymentId,
        acquirerTransactionId: verificationResult.acquirerTransactionId,
        paymentMethod: verificationResult.paymentMethod,
        acquirerResponse: verificationResult.paymentDetails
      });
    }

    const { bookingType, bookingId } = getPaymentBooking(payment);

    return {
      success: true,
      paymentReference: payment.payment_reference,
      status: verificationResult.status,
      amount: payment.amount,
      currency: payment.currency,
      bookingType,
      bookingId
    };
  } catch (error) {
    logger.error('Payment verification failed:', error.message);
    throw error;
  }
};

/**
 * Check payment status
 */
const checkPaymentStatus = async (paymentReference) => {
  try {
    const payment = await paymentModel.getPaymentByReference(paymentReference);

    if (!payment) {
      throw ApiError.notFound(PaymentError.PAYMENT_NOT_FOUND.message);
    }

    // If payment is already in terminal state, return cached status
    if ([PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.REFUNDED].includes(payment.status)) {
      return {
        success: true,
        paymentReference: payment.payment_reference,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency
      };
    }

    // Query acquirer for latest status (server-to-server, so it can be trusted)
    const acquirerClient = acquirerFactory.getAcquirer(payment.acquirer);
    const credentials = getAcquirerCredentials(payment.acquirer);

    const statusResult = await acquirerClient.checkStatus(payment.acquirer_order_id, credentials);

    if (statusResult.success && statusResult.status !== payment.status) {
      if (statusResult.status === PaymentStatus.SUCCESS) {
        await markPaymentSuccessful(payment, { acquirerResponse: statusResult.paymentDetails });
      } else {
        await paymentModel.updatePaymentStatus(paymentReference, {
          status: statusResult.status,
          acquirerResponse: statusResult.paymentDetails
        });
      }
    }

    return {
      success: true,
      paymentReference: payment.payment_reference,
      status: statusResult.status,
      amount: payment.amount,
      currency: payment.currency,
      acquirerStatus: statusResult.paymentDetails
    };
  } catch (error) {
    logger.error('Payment status check failed:', error.message);
    throw error;
  }
};

/**
 * Process refund
 */
const processRefund = async (paymentReference, refundAmount, reason) => {
  try {
    const payment = await paymentModel.getPaymentByReference(paymentReference);

    if (!payment) {
      throw ApiError.notFound(PaymentError.PAYMENT_NOT_FOUND.message);
    }

    // Validate payment status (partial refunds can be refunded further)
    if (![PaymentStatus.SUCCESS, PaymentStatus.PARTIAL_REFUND].includes(payment.status)) {
      throw ApiError.badRequest('Only successful payments can be refunded');
    }

    // PG returns DECIMAL as strings - convert before doing arithmetic
    const amount = parseFloat(refundAmount);
    const paidAmount = parseFloat(payment.amount);
    const alreadyRefunded = parseFloat(payment.refunded_amount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw ApiError.badRequest('Valid refund amount is required');
    }

    // Validate refund amount
    const maxRefundAmount = Math.round((paidAmount - alreadyRefunded) * 100) / 100;
    if (amount > maxRefundAmount) {
      throw ApiError.badRequest(`Refund amount exceeds available balance. Max: ${maxRefundAmount}`);
    }

    // Get acquirer client
    const acquirerClient = acquirerFactory.getAcquirer(payment.acquirer);
    const credentials = getAcquirerCredentials(payment.acquirer);

    // Process refund with acquirer
    const refundData = {
      acquirerPaymentId: payment.acquirer_payment_id || payment.acquirer_transaction_id,
      amount,
      reason: reason,
      notes: {
        payment_reference: payment.payment_reference
      }
    };

    const refundResult = await acquirerClient.processRefund(refundData, credentials);

    if (!refundResult.success) {
      throw ApiError.internal(refundResult.error || PaymentError.REFUND_FAILED.message);
    }

    // Update payment with refund details
    const newRefundedAmount = Math.round((alreadyRefunded + amount) * 100) / 100;
    const newStatus = newRefundedAmount >= paidAmount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND;

    await paymentModel.updatePaymentStatus(paymentReference, {
      status: newStatus,
      refundedAmount: newRefundedAmount,
      refundReference: refundResult.refundId
    });

    logger.info(`Refund processed: ${paymentReference}, Amount: ${amount}`);

    return {
      success: true,
      paymentReference: payment.payment_reference,
      refundId: refundResult.refundId,
      refundAmount: amount,
      totalRefunded: newRefundedAmount,
      status: newStatus
    };
  } catch (error) {
    logger.error('Refund processing failed:', error.message);
    throw error;
  }
};

/**
 * Handle webhook from payment gateway
 */
const handleWebhook = async (acquirer, webhookData) => {
  try {
    const acquirerClient = acquirerFactory.getAcquirer(acquirer);
    const credentials = getAcquirerCredentials(acquirer);

    // Process webhook
    const webhookResult = await acquirerClient.handleWebhook(webhookData, credentials);

    if (!webhookResult.success || !webhookResult.verified) {
      throw new Error('Webhook verification failed');
    }

    logger.info(`Webhook received from ${acquirer}: ${webhookResult.event}`);

    // Find payment by acquirer order ID or payment ID
    const pool = getPool();
    let payment;

    if (webhookResult.acquirerOrderId) {
      const result = await pool.query(
        'SELECT * FROM payments WHERE acquirer_order_id = $1',
        [webhookResult.acquirerOrderId]
      );
      payment = result.rows[0];
    } else if (webhookResult.acquirerPaymentId) {
      const result = await pool.query(
        'SELECT * FROM payments WHERE acquirer_payment_id = $1',
        [webhookResult.acquirerPaymentId]
      );
      payment = result.rows[0];
    }

    if (!payment) {
      logger.warn(`Payment not found for webhook: ${webhookResult.acquirerOrderId || webhookResult.acquirerPaymentId}`);
      return {
        success: false,
        message: 'Payment not found'
      };
    }

    if (webhookResult.status === PaymentStatus.SUCCESS) {
      await markPaymentSuccessful(payment, {
        acquirerPaymentId: webhookResult.acquirerPaymentId,
        acquirerResponse: webhookResult
      });
    } else if (payment.status !== PaymentStatus.SUCCESS || [PaymentStatus.REFUNDED, PaymentStatus.PARTIAL_REFUND].includes(webhookResult.status)) {
      // Never downgrade a successful payment except to a refund state
      await paymentModel.updatePaymentStatus(payment.payment_reference, {
        status: webhookResult.status,
        acquirerPaymentId: webhookResult.acquirerPaymentId || payment.acquirer_payment_id,
        acquirerResponse: webhookResult
      });
    }

    return {
      success: true,
      paymentReference: payment.payment_reference,
      status: webhookResult.status
    };
  } catch (error) {
    logger.error('Webhook processing failed:', error.message);
    throw error;
  }
};

module.exports = {
  initiatePayment,
  markPaymentSuccessful,
  findPaymentByOrderId,
  getPaymentBooking,
  verifyPaymentCallback,
  checkPaymentStatus,
  processRefund,
  handleWebhook
};
