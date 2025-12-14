/**
 * Payment Page Routes
 * Handles rendering of hosted payment pages
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

/**
 * GET /payment-page/:paymentReference
 * Render Razorpay hosted payment page
 */
router.get('/payment-page/:paymentReference', async (req, res) => {
  try {
    const { paymentReference } = req.params;

    logger.info(`[PaymentPage] Loading payment page for: ${paymentReference}`);

    // Fetch payment details from database
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        p.*,
        b.booking_reference,
        b.flight_data,
        b.contact_email,
        b.contact_phone
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.payment_reference = $1`,
      [paymentReference]
    );

    if (result.rows.length === 0) {
      logger.warn(`[PaymentPage] Payment not found: ${paymentReference}`);
      return res.status(404).render('payment-error', {
        error: 'Payment not found',
        message: 'The payment link is invalid or expired.'
      });
    }

    const payment = result.rows[0];

    logger.info(`[PaymentPage] Payment found - Status: ${payment.status}, Acquirer: ${payment.acquirer}`);

    // Check if payment already completed
    if (payment.status === 'completed' || payment.status === 'SUCCESS') {
      return res.status(400).render('payment-error', {
        error: 'Payment Already Completed',
        message: 'This payment has already been processed.'
      });
    }

    // Check if payment expired
    if (payment.expires_at && new Date() > new Date(payment.expires_at)) {
      return res.status(400).render('payment-error', {
        error: 'Payment Link Expired',
        message: 'This payment link has expired. Please create a new payment request.'
      });
    }

    // Parse acquirer response - handle both old and new structure
    let acquirerData = {};
    let checkoutData = {};
    
    // If acquirer_response exists, parse it
    if (payment.acquirer_response) {
      if (typeof payment.acquirer_response === 'string') {
        try {
          acquirerData = JSON.parse(payment.acquirer_response);
        } catch (e) {
          logger.warn('[PaymentPage] Failed to parse acquirer_response');
        }
      } else {
        acquirerData = payment.acquirer_response;
      }
    }

    // If payment_details exists, use it for checkout data
    if (payment.payment_details) {
      if (typeof payment.payment_details === 'string') {
        try {
          checkoutData = JSON.parse(payment.payment_details);
        } catch (e) {
          logger.warn('[PaymentPage] Failed to parse payment_details');
        }
      } else {
        checkoutData = payment.payment_details;
      }
    } else {
      // Fallback: try to get from acquirer_response
      checkoutData = acquirerData.checkoutData || acquirerData || {};
    }

    // Extract order ID from various possible locations
    const orderId = 
      checkoutData.order_id || 
      checkoutData.orderId || 
      acquirerData.acquirerOrderId || 
      acquirerData.order_id ||
      payment.acquirer_order_id ||
      '';

    // Render Razorpay payment page
    res.render('razorpay-payment', {
      paymentReference: payment.payment_reference,
      bookingReference: payment.booking_reference,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      amountInPaise: Math.round(parseFloat(payment.amount) * 100),
      customerName: payment.customer_name || checkoutData.prefill?.name || 'Customer',
      customerEmail: payment.customer_email || checkoutData.prefill?.email || '',
      customerPhone: payment.customer_phone || checkoutData.prefill?.contact || '',
      description: payment.description || checkoutData.description || 'Flight Booking Payment',
      razorpayKey: checkoutData.key || process.env.RAZORPAY_KEY_ID,
      orderId: orderId,
      notes: checkoutData.notes || payment.metadata || {},
      callbackUrl: `${req.protocol}://${req.get('host')}/api/payments/callback`
    });

  } catch (error) {
    logger.error('[PaymentPage] Error:', error);
    res.status(500).render('payment-error', {
      error: 'Server Error',
      message: 'Unable to load payment page. Please try again.'
    });
  }
});

module.exports = router;
