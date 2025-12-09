/**
 * Analytics Routes
 * Endpoints for flight analytics and insights
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

/**
 * @route   GET /api/analytics/cheapest-dates
 * @desc    Get cheapest dates to fly (Price Calendar)
 * @query   origin - Origin IATA code (required)
 * @query   destination - Destination IATA code (required)
 * @query   departureDate - Starting search date (YYYY-MM-DD)
 * @query   duration - Trip duration in days (for round-trip)
 * @query   oneWay - true/false (default: false)
 * @query   nonStop - true/false (default: false)
 * @query   maxPrice - Maximum price filter
 * @example /api/analytics/cheapest-dates?origin=BOM&destination=DEL&departureDate=2024-06-01&duration=7
 */
router.get('/cheapest-dates', analyticsController.getCheapestDates);

/**
 * @route   GET /api/analytics/destinations
 * @desc    Get flight destination suggestions (Travel Inspiration)
 * @query   origin - Origin IATA code (required)
 * @query   departureDate - Departure date (YYYY-MM-DD)
 * @query   duration - Trip duration in days
 * @query   oneWay - true/false (default: false)
 * @query   nonStop - true/false (default: false)
 * @query   maxPrice - Maximum price filter
 * @example /api/analytics/destinations?origin=BOM&departureDate=2024-06-15&maxPrice=50000
 */
router.get('/destinations', analyticsController.getFlightDestinations);

/**
 * @route   GET /api/analytics/popular-routes
 * @desc    Get popular routes from an origin
 * @query   from - Origin IATA code (required)
 * @query   limit - Number of results (default: 10)
 * @example /api/analytics/popular-routes?from=BOM&limit=10
 */
router.get('/popular-routes', analyticsController.getPopularRoutes);

/**
 * @route   GET /api/analytics/health
 * @desc    Health check for analytics API
 * @example /api/analytics/health
 */
router.get('/health', analyticsController.healthCheck);

module.exports = router;
