/**
 * Hotel Booking Routes
 * Defines hotel booking management API endpoints
 */
const express = require('express');
const router = express.Router();
const hotelBookingController = require('../controllers/hotel-booking.controller');
const { authenticateToken, optionalAuth, requireAdminKey } = require('../middleware/auth.middleware');
const { bookingLimiter, lookupLimiter } = require('../middleware/rateLimit.middleware');

// ═══════════════════════════════════════════════════════════════
// 📝 CREATE BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/hotel-bookings/create
 * @desc    Create new hotel booking
 * @access  Public with optional auth
 * @body    { offerId, guests, contactEmail, contactPhone, specialRequests?, ... }
 *          Price/currency come from the supplier offer, not the request.
 */
router.post('/create', bookingLimiter, optionalAuth, hotelBookingController.createHotelBooking);

/**
 * @route   POST /api/hotel-bookings/create-and-pay
 * @desc    Create hotel booking and initiate payment (one-step flow)
 * @access  Public with optional auth
 * @body    { offerId, guests, contactEmail, contactPhone, paymentAcquirer?, successUrl?, failureUrl?, ... }
 */
router.post('/create-and-pay', bookingLimiter, optionalAuth, hotelBookingController.createHotelBookingAndPay);

// ═══════════════════════════════════════════════════════════════
// 📖 GET BOOKINGS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/hotel-bookings/my-bookings
 * @desc    Get all hotel bookings for logged-in user
 * @access  Protected
 */
router.get('/my-bookings', authenticateToken, hotelBookingController.getMyHotelBookings);

/**
 * @route   GET /api/hotel-bookings/reference/:bookingReference
 * @desc    Get hotel booking by reference
 * @access  Owner (JWT) or ?email=<contact email>
 * @query   ?email=xxx
 */
router.get('/reference/:bookingReference', lookupLimiter, optionalAuth, hotelBookingController.getHotelBookingByReference);

/**
 * @route   GET /api/hotel-bookings/:bookingId
 * @desc    Get hotel booking by ID
 * @access  Protected (owner only)
 */
router.get('/:bookingId', authenticateToken, hotelBookingController.getHotelBooking);

// ═══════════════════════════════════════════════════════════════
// 🔄 UPDATE BOOKINGS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/hotel-bookings/:bookingId/confirm
 * @desc    Record supplier confirmation for a PAID hotel booking
 * @access  Protected (owner only, requires successful payment)
 */
router.post('/:bookingId/confirm', authenticateToken, hotelBookingController.confirmHotelBooking);

/**
 * @route   POST /api/hotel-bookings/:bookingId/cancel
 * @desc    Cancel hotel booking
 * @access  Protected (owner only)
 */
router.post('/:bookingId/cancel', authenticateToken, hotelBookingController.cancelHotelBooking);

/**
 * @route   POST /api/hotel-bookings/:bookingId/retry-fulfillment
 * @desc    Retry booking a paid hotel with the supplier after a failure
 * @access  Admin (X-Admin-Key)
 */
router.post('/:bookingId/retry-fulfillment', requireAdminKey, hotelBookingController.retryFulfillment);

module.exports = router;
