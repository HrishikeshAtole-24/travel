/**
 * Airport Routes
 * Handles airport search and autocomplete endpoints
 */

const express = require('express');
const router = express.Router();
// PRODUCTION: Hybrid controller (DB + fallback)
const airportController = require('../controllers/airport.controller');

// ═══════════════════════════════════════════════════════════════
// 🛫 AIRPORT ROUTES - PRODUCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Search airports for autocomplete
 * GET /airports/search?q=mumbai&limit=10&country=IN
 */
router.get('/search', airportController.searchAirports);

/**
 * Get popular airports by country
 * GET /api/airports/popular?country=IN&limit=10
 */
router.get('/popular', airportController.getPopularAirports);

/**
 * Check database status
 * GET /api/airports/db-status
 */
router.get('/db-status', async (req, res) => {
  try {
    const { getPool } = require('../config/database');
    const pool = getPool();
    
    const countResult = await pool.query('SELECT COUNT(*) as count FROM airports');
    const sampleResult = await pool.query('SELECT iata_code, city_name FROM airports ORDER BY priority_score DESC LIMIT 3');
    
    res.json({
      success: true,
      message: 'Database status check',
      data: {
        totalAirports: parseInt(countResult.rows[0].count),
        isEmpty: parseInt(countResult.rows[0].count) === 0,
        sampleAirports: sampleResult.rows,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database check failed',
      error: error.message
    });
  }
});

/**
 * Get airport by IATA code
 * GET /api/airports/BOM
 */
router.get('/:code', airportController.getAirportByCode);

module.exports = router;