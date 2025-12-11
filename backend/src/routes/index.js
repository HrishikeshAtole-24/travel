/**
 * Main Route Combiner
 * Registers all API routes
 */
const express = require('express');
const router = express.Router();

// Import all route modules
const flightRoutes = require('./flight.routes');
const referenceRoutes = require('./reference.routes');
const analyticsRoutes = require('./analytics.routes');
const paymentRoutes = require('../payments/payment.routes');
const authRoutes = require('./auth.routes');
const bookingRoutes = require('./booking.routes');

// ═══════════════════════════════════════════════════════════════
// 🏥 HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Travel Booking API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      flights: '/api/flights',
      bookings: '/api/bookings',
      payments: '/api/payments',
      reference: '/api/reference',
      analytics: '/api/analytics'
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 📍 REGISTER ROUTES
// ═══════════════════════════════════════════════════════════════

// Authentication (Sign Up, Login, Verify)
router.use('/auth', authRoutes);

// Core flight search & booking
router.use('/flights', flightRoutes);

// Booking management
router.use('/bookings', bookingRoutes);

// Payment processing (Stripe, Razorpay)
router.use('/payments', paymentRoutes);

// Reference data (airports, cities, airlines)
router.use('/reference', referenceRoutes);

// Analytics & insights (cheapest dates, destinations)
router.use('/analytics', analyticsRoutes);

module.exports = router;
