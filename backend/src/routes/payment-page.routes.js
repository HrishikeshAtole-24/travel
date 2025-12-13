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
      return res.status(404).render('payment-error', {
        error: 'Payment not found',
        message: 'The payment link is invalid or expired.'
      });
    }

    const payment = result.rows[0];

    // Check if payment already completed
    if (payment.status === 'completed') {
      return res.status(400).render('payment-error', {
        error: 'Payment Already Completed',
        message: 'This payment has already been processed.'
      });
    }

    // Parse acquirer response
    const acquirerData = payment.acquirer_response || {};
    const checkoutData = acquirerData.checkoutData || {};

    // Render Razorpay payment page
    res.render('razorpay-payment', {
      paymentReference: payment.payment_reference,
      bookingReference: payment.booking_reference,
      amount: payment.amount,
      currency: payment.currency,
      amountInPaise: Math.round(payment.amount * 100),
      customerName: checkoutData.prefill?.name || 'Customer',
      customerEmail: payment.contact_email || checkoutData.prefill?.email || '',
      customerPhone: payment.contact_phone || checkoutData.prefill?.contact || '',
      description: checkoutData.description || 'Flight Booking Payment',
      razorpayKey: checkoutData.key || process.env.RAZORPAY_KEY_ID,
      orderId: acquirerData.acquirerOrderId || checkoutData.order_id,
      notes: checkoutData.notes || {},
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
