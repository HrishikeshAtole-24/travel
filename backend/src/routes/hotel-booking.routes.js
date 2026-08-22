/**
 * Hotel Booking Routes
 * Defines hotel booking management API endpoints
 */
const express = require('express');
const router = express.Router();
const hotelBookingController = require('../controllers/hotel-booking.controller');
const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');

// ═══════════════════════════════════════════════════════════════
// 📝 CREATE BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/hotel-bookings/create
 * @desc    Create new hotel booking
 * @access  Public with optional auth
 * @body    { offerId, hotelData, guests, contactEmail, contactPhone, totalPrice, ... }
 */
router.post('/create', optionalAuth, hotelBookingController.createHotelBooking);

/**
 * @route   POST /api/hotel-bookings/create-and-pay
 * @desc    Create hotel booking and initiate payment (one-step flow)
 * @access  Public with optional auth
 * @body    { offerId, hotelData, guests, contactEmail, totalPrice, paymentAcquirer, ... }
 */
router.post('/create-and-pay', optionalAuth, hotelBookingController.createHotelBookingAndPay);

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
 * @desc    Get hotel booking by reference (with email for guests)
 * @access  Public
 * @query   ?email=xxx
 */
router.get('/reference/:bookingReference', optionalAuth, hotelBookingController.getHotelBookingByReference);

/**
 * @route   GET /api/hotel-bookings/:bookingId
 * @desc    Get hotel booking by ID
 * @access  Protected
 */
router.get('/:bookingId', optionalAuth, hotelBookingController.getHotelBooking);

// ═══════════════════════════════════════════════════════════════
// 🔄 UPDATE BOOKINGS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/hotel-bookings/:bookingId/confirm
 * @desc    Confirm hotel booking after payment
 * @access  Public with optional auth
 */
router.post('/:bookingId/confirm', optionalAuth, hotelBookingController.confirmHotelBooking);

/**
 * @route   POST /api/hotel-bookings/:bookingId/cancel
 * @desc    Cancel hotel booking
 * @access  Public with optional auth
 */
router.post('/:bookingId/cancel', optionalAuth, hotelBookingController.cancelHotelBooking);

module.exports = router;
