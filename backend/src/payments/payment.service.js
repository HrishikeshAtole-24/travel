/**
 * Payment Service
 * Business logic for payment processing
 */

const acquirerFactory = require('./acquirers/AcquirerFactory');
const paymentModel = require('../models/payment.model');
const bookingModel = require('../models/booking.model');
const { PaymentStatus, PaymentError, isValidStatusTransition } = require('../core/PaymentStatusCodes');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');
const { getPool } = require('../config/database');

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
 * Initialize payment for a booking
 */
const initiatePayment = async (bookingId, paymentOptions = {}) => {
  try {
    const pool = getPool();

    // Fetch booking details
    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      throw ApiError.notFound(PaymentError.BOOKING_NOT_FOUND.message);
    }

    const booking = bookingResult.rows[0];

    // Validate booking status
    if (booking.status !== 'pending') {
      throw ApiError.badRequest('Booking is not in a valid state for payment');
    }

    // Select acquirer (default to Razorpay, can be based on amount, user preference, etc.)
    const acquirer = paymentOptions.acquirer || 'RAZORPAY';
    const acquirerClient = acquirerFactory.getAcquirer(acquirer);
    const credentials = getAcquirerCredentials(acquirer);

    if (!credentials || !credentials.key_id) {
      throw ApiError.internal('Payment gateway credentials not configured');
    }

    // Create payment record
    const paymentData = {
      bookingId: booking.id,
      userId: booking.user_id,
      amount: parseFloat(booking.total_price),
      currency: booking.currency || 'INR',
      acquirer: acquirer,
      customerEmail: paymentOptions.customerEmail || 'customer@example.com',
      customerPhone: paymentOptions.customerPhone || '',
      customerName: paymentOptions.customerName || '',
      successUrl: paymentOptions.successUrl || `${process.env.APP_URL}/payment/success`,
      failureUrl: paymentOptions.failureUrl || `${process.env.APP_URL}/payment/failure`,
      callbackUrl: paymentOptions.callbackUrl || `${process.env.APP_URL}/api/payments/callback`,
      description: `Flight booking payment for booking #${booking.booking_reference}`,
      ipAddress: paymentOptions.ipAddress,
      userAgent: paymentOptions.userAgent,
      metadata: {
        booking_reference: booking.booking_reference,
        flight_id: booking.flight_id,
        success_url: paymentOptions.successUrl || `${process.env.APP_URL}/payment/success`,
        failure_url: paymentOptions.failureUrl || `${process.env.APP_URL}/payment/failure`
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
      'UPDATE bookings SET status = $1 WHERE id = $2',
      ['payment_initiated', booking.id]
    );

    logger.info(`Payment initiated: ${payment.payment_reference}, Acquirer: ${acquirer}`);

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
      await paymentModel.updatePaymentStatus(paymentReference, {
        status: PaymentStatus.FAILED,
        acquirerResponse: verificationResult
      });

      throw ApiError.badRequest(verificationResult.error || PaymentError.INVALID_SIGNATURE.message);
    }

    // Update payment status
    await paymentModel.updatePaymentStatus(paymentReference, {
      status: verificationResult.status,
      acquirerPaymentId: verificationResult.acquirerPaymentId,
      acquirerTransactionId: verificationResult.acquirerTransactionId,
      paymentMethod: verificationResult.paymentMethod,
      acquirerResponse: verificationResult.paymentDetails
    });

    // Update booking status if payment successful
    if (verificationResult.status === PaymentStatus.SUCCESS) {
      const pool = getPool();
      await pool.query(
        'UPDATE bookings SET status = $1 WHERE id = $2',
        ['confirmed', payment.booking_id]
      );

      logger.info(`Payment verified successfully: ${paymentReference}`);
    }

    return {
      success: true,
      paymentReference: payment.payment_reference,
      status: verificationResult.status,
      amount: payment.amount,
      currency: payment.currency,
      bookingId: payment.booking_id
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

    // Query acquirer for latest status
    const acquirerClient = acquirerFactory.getAcquirer(payment.acquirer);
    const credentials = getAcquirerCredentials(payment.acquirer);

    const statusResult = await acquirerClient.checkStatus(payment.acquirer_order_id, credentials);

    if (statusResult.success && statusResult.status !== payment.status) {
      // Update payment status if changed
      await paymentModel.updatePaymentStatus(paymentReference, {
        status: statusResult.status,
        acquirerResponse: statusResult.paymentDetails
      });
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

    // Validate payment status
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw ApiError.badRequest('Only successful payments can be refunded');
    }

    // Validate refund amount
    const maxRefundAmount = payment.amount - payment.refunded_amount;
    if (refundAmount > maxRefundAmount) {
      throw ApiError.badRequest(`Refund amount exceeds available balance. Max: ${maxRefundAmount}`);
    }

    // Get acquirer client
    const acquirerClient = acquirerFactory.getAcquirer(payment.acquirer);
    const credentials = getAcquirerCredentials(payment.acquirer);

    // Process refund with acquirer
    const refundData = {
      acquirerPaymentId: payment.acquirer_payment_id,
      amount: refundAmount,
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
    const newRefundedAmount = payment.refunded_amount + refundAmount;
    const newStatus = newRefundedAmount >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND;

    await paymentModel.updatePaymentStatus(paymentReference, {
      status: newStatus,
      refundedAmount: newRefundedAmount,
      refundReference: refundResult.refundId
    });

    logger.info(`Refund processed: ${paymentReference}, Amount: ${refundAmount}`);

    return {
      success: true,
      paymentReference: payment.payment_reference,
      refundId: refundResult.refundId,
      refundAmount: refundAmount,
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

    // Update payment status
    await paymentModel.updatePaymentStatus(payment.payment_reference, {
      status: webhookResult.status,
      acquirerPaymentId: webhookResult.acquirerPaymentId || payment.acquirer_payment_id,
      webhookData: webhookResult
    });

    // Update booking if payment successful
    if (webhookResult.status === PaymentStatus.SUCCESS) {
      await pool.query(
        'UPDATE bookings SET status = $1 WHERE id = $2',
        ['confirmed', payment.booking_id]
      );
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
  verifyPaymentCallback,
  checkPaymentStatus,
  processRefund,
  handleWebhook
};
