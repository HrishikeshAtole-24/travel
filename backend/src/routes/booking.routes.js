/**
 * Booking Routes
 * Defines booking-related API endpoints
 */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/bookings/create
 * @desc    Create new booking (requires auth OR guest email/phone)
 * @access  Public with optional auth
 * @body    { flightId, flightData, travelers, contactEmail, contactPhone, totalPrice }
 */
router.post('/create', optionalAuth, bookingController.createBooking);

/**
 * @route   POST /api/bookings/create-and-pay
 * @desc    Create booking and initiate payment (one-step flow)
 * @access  Public with optional auth
 * @body    { flightData, travelers, contactEmail, totalPrice, paymentAcquirer }
 */
router.post('/create-and-pay', optionalAuth, bookingController.createBookingAndInitiatePayment);

/**
 * @route   GET /api/bookings/my-bookings
 * @desc    Get all bookings for logged-in user
 * @access  Protected (requires authentication)
 */
router.get('/my-bookings', authenticateToken, bookingController.getMyBookings);

/**
 * @route   GET /api/bookings/reference/:bookingReference
 * @desc    Get booking by reference (with email verification for guests)
 * @access  Public
 * @query   ?email=xxx
 */
router.get('/reference/:bookingReference',authenticateToken, bookingController.getBookingByReference);

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    Get booking details by ID
 * @access  Public with optional auth
 */
router.get('/:bookingId', authenticateToken, bookingController.getBooking);

/**
 * @route   POST /api/bookings/:bookingId/cancel
 * @desc    Cancel booking
 * @access  Public with optional auth
 */
router.post('/:bookingId/cancel', optionalAuth, bookingController.cancelBooking);

module.exports = router;
