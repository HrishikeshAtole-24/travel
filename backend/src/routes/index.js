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
const paymentPageRoutes = require('./payment-page.routes');
const authRoutes = require('./auth.routes');
const bookingRoutes = require('./booking.routes');
const airportRoutes = require('./airport.routes');
const keepAliveRoutes = require('../activateService/keepAlive.routes');
const chatRoutes = require('./chat.routes');

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
      airports: '/api/airports',
      reference: '/api/reference',
      analytics: '/api/analytics',
      keepAlive: '/api/keep-active-service',
      chat: '/api/chat'
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

// Airport search & autocomplete
router.use('/airports', airportRoutes);

// Booking management
router.use('/bookings', bookingRoutes);

// Payment processing (Stripe, Razorpay)
router.use('/payments', paymentRoutes);

// Payment hosted pages (EJS views)
router.use('/', paymentPageRoutes);

// Reference data (airports, cities, airlines)
router.use('/reference', referenceRoutes);

// Analytics & insights (cheapest dates, destinations)
router.use('/analytics', analyticsRoutes);

// Keep-Alive (Prevents Supabase/Render from sleeping)
router.use('/keep-active-service', keepAliveRoutes);

// AI Chat (SkyBot assistant)
router.use('/chat', chatRoutes);

module.exports = router;
