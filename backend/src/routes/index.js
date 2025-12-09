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

// ═══════════════════════════════════════════════════════════════
// 🏥 HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Travel Booking API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      flights: '/api/flights',
      reference: '/api/reference',
      analytics: '/api/analytics'
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 📍 REGISTER ROUTES
// ═══════════════════════════════════════════════════════════════

// Core flight search & booking
router.use('/flights', flightRoutes);

// Reference data (airports, cities, airlines)
router.use('/reference', referenceRoutes);

// Analytics & insights (cheapest dates, destinations)
router.use('/analytics', analyticsRoutes);

module.exports = router;
