/**
 * Keep Alive Routes
 * Endpoints to keep Supabase DB and Render service active
 */
const express = require('express');
const router = express.Router();
const keepAliveController = require('./keepAlive.controller');

// ═══════════════════════════════════════════════════════════════
// 🔄 KEEP ALIVE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/keep-active-service
 * @desc    Full health check - queries DB tables to keep active
 * @access  Public
 * @usage   Set up external cron to hit every 2 hours
 */
router.get('/', keepAliveController.ping);

/**
 * @route   GET /api/keep-active-service/status
 * @desc    Quick lightweight status check
 * @access  Public
 */
router.get('/status', keepAliveController.status);

module.exports = router;
