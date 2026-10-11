/**
 * Payment Routes
 * Defines payment-related API endpoints
 */

const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authenticateToken, optionalAuth, requireAdminKey } = require('../middleware/auth.middleware');
const { bookingLimiter, lookupLimiter } = require('../middleware/rateLimit.middleware');

/**
 * @route   POST /api/payments/create
 * @desc    Create/Initiate a new payment
 * @access  Protected (booking owner)
 * @body    { bookingId, bookingType?, acquirer?, customerEmail?, customerName?, customerPhone?, successUrl?, failureUrl? }
 */
router.post('/create', bookingLimiter, authenticateToken, paymentController.createPayment);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment (called from EJS payment page)
 * @access  Public (Razorpay signature verified in controller)
 * @body    { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 */
router.post('/verify', paymentController.verifyRazorpayPayment);

/**
 * @route   POST /api/payments/callback
 * @desc    Handle payment callback/verification
 * @access  Public (called by payment gateway)
 * @body    Payment gateway specific callback data
 */
router.post('/callback', paymentController.verifyPayment);

/**
 * @route   GET /api/payments/callback
 * @desc    Handle payment callback redirect (from Razorpay/payment gateways)
 * @access  Public (only a valid Razorpay signature can mark a payment successful)
 * @query   payment_id, order_id, signature, status, reason
 */
router.get('/callback', paymentController.handlePaymentCallback);

/**
 * @route   GET /api/payments/:paymentReference
 * @desc    Get payment details by reference
 * @access  Owner (JWT) or ?email=<booking contact email>
 */
router.get('/:paymentReference', lookupLimiter, optionalAuth, paymentController.getPaymentDetails);

/**
 * @route   GET /api/payments/:paymentReference/status
 * @desc    Check payment status
 * @access  Owner (JWT) or ?email=<booking contact email>
 */
router.get('/:paymentReference/status', lookupLimiter, optionalAuth, paymentController.getPaymentStatus);

/**
 * @route   POST /api/payments/:paymentReference/refund
 * @desc    Process refund for a payment
 * @access  Admin (X-Admin-Key header must match ADMIN_API_KEY)
 * @body    { amount, reason }
 */
router.post('/:paymentReference/refund', requireAdminKey, paymentController.processRefund);

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Get all payments for a booking
 * @access  Protected (booking owner)
 * @query   type=flight|hotel (default flight)
 */
router.get('/booking/:bookingId', authenticateToken, paymentController.getPaymentsByBooking);

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
