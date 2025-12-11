/**
 * Payment Routes
 * Defines payment-related API endpoints
 */

const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');

/**
 * @route   POST /api/payments/create
 * @desc    Create/Initiate a new payment
 * @access  Public (should be protected with auth in production)
 * @body    { bookingId, acquirer?, customerEmail?, customerName?, customerPhone? }
 */
router.post('/create', paymentController.createPayment);

/**
 * @route   POST /api/payments/callback
 * @desc    Handle payment callback/verification
 * @access  Public (called by payment gateway)
 * @body    Payment gateway specific callback data
 */
router.post('/callback', paymentController.verifyPayment);

/**
 * @route   GET /api/payments/:paymentReference
 * @desc    Get payment details by reference
 * @access  Public (should be protected with auth in production)
 */
router.get('/:paymentReference', paymentController.getPaymentDetails);

/**
 * @route   GET /api/payments/:paymentReference/status
 * @desc    Check payment status
 * @access  Public (should be protected with auth in production)
 */
router.get('/:paymentReference/status', paymentController.getPaymentStatus);

/**
 * @route   POST /api/payments/:paymentReference/refund
 * @desc    Process refund for a payment
 * @access  Protected (admin only in production)
 * @body    { amount, reason }
 */
router.post('/:paymentReference/refund', paymentController.processRefund);

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Get all payments for a booking
 * @access  Public (should be protected with auth in production)
 */
router.get('/booking/:bookingId', paymentController.getPaymentsByBooking);

/**
 * @route   POST /api/payments/webhook/razorpay
 * @desc    Razorpay webhook endpoint
 * @access  Public (webhook signature verified in controller)
 */
router.post('/webhook/razorpay', paymentController.razorpayWebhook);

/**
 * @route   POST /api/payments/webhook/stripe
 * @desc    Stripe webhook endpoint
 * @access  Public (webhook signature verified in controller)
 */
router.post('/webhook/stripe', paymentController.stripeWebhook);

module.exports = router;
