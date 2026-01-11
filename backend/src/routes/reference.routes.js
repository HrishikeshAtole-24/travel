/**
 * Reference Data Routes
 * Endpoints for airports, cities, airlines lookup
 */

const express = require('express');
const router = express.Router();
const referenceController = require('../controllers/reference.controller');

/**
 * @route   GET /api/reference/locations/search
 * @desc    Search locations (airports/cities) for autocomplete
 * @query   q - Search keyword (min 3 chars)
 * @query   type - AIRPORT, CITY, or AIRPORT,CITY (default: AIRPORT,CITY)
 * @example /api/reference/locations/search?q=mumbai&type=AIRPORT
 */
router.get('/locations/search', referenceController.searchLocations);

/**
 * @route   GET /api/reference/airports/:iataCode
 * @desc    Get airport details by IATA code
 * @param   iataCode - Airport IATA code (e.g., BOM)
 * @example /api/reference/airports/BOM
 */
router.get('/airports/:iataCode', referenceController.getAirportInfo);

/**
 * @route   GET /api/reference/cities/:cityCode/airports
 * @desc    Get all airports in a city
 * @param   cityCode - City IATA code (e.g., LON)
 * @example /api/reference/cities/LON/airports
 */
router.get('/cities/:cityCode/airports', referenceController.getAirportsByCity);

/**
 * @route   GET /api/reference/airlines/:airlineCode
 * @desc    Get airline information by code
 * @param   airlineCode - Airline IATA code (e.g., AI)
 * @example /api/reference/airlines/AI
 */
router.get('/airlines/:airlineCode', referenceController.getAirlineInfo);

/**
 * @route   GET /api/reference/airlines/:airlineCode/routes
 * @desc    Get routes served by an airline
 * @param   airlineCode - Airline IATA code
 * @query   date - Optional departure date (YYYY-MM-DD)
 * @example /api/reference/airlines/AI/routes?date=2024-06-15
 */
router.get('/airlines/:airlineCode/routes', referenceController.getAirlineRoutes);

module.exports = router;
