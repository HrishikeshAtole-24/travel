/**
 * Chat Routes - AI-Powered SkyBot (PRO LEVEL)
 * 
 * Endpoints:
 * - POST /api/chat - Main chat endpoint
 * - POST /api/chat/travel-tips - Get travel tips
 * - POST /api/chat/itinerary - Generate trip itinerary
 * - GET /api/chat/analytics - View chat analytics
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { requireAdminKey } = require('../middleware/auth.middleware');
const { chatLimiter } = require('../middleware/rateLimit.middleware');

/**
 * @route   POST /api/chat
 * @desc    Send message to SkyBot AI
 * @access  Public
 */
router.post('/', chatLimiter, chatController.sendMessage);

/**
 * @route   POST /api/chat/travel-tips
 * @desc    Get AI-generated travel tips
 * @access  Public
 */
router.post('/travel-tips', chatLimiter, chatController.getTravelTips);

/**
 * @route   POST /api/chat/itinerary
 * @desc    Generate AI trip itinerary
 * @access  Public
 */
router.post('/itinerary', chatLimiter, chatController.generateItinerary);

/**
 * @route   GET /api/chat/analytics
 * @desc    Get chat analytics data
 * @access  Admin (X-Admin-Key)
 */
router.get('/analytics', requireAdminKey, chatController.getAnalytics);

module.exports = router;
