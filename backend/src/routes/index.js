// Main Route Combiner
const express = require('express');
const router = express.Router();

// Import all route modules
const flightRoutes = require('./flight.routes');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Travel Booking API is running',
    timestamp: new Date().toISOString()
  });
});

// Register routes
router.use('/flights', flightRoutes);

module.exports = router;
