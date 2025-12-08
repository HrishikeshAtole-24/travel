// Flight Routes
const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flight.controller');
const asyncHandler = require('../core/AsyncHandler');

// Flight search
router.get('/search', asyncHandler(flightController.searchFlights));

// Flight details
router.get('/:flightId', asyncHandler(flightController.getFlightDetails));

module.exports = router;
