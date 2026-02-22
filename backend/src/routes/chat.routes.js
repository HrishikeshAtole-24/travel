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

/**
 * @route   POST /api/chat
 * @desc    Send message to SkyBot AI
 * @access  Public
 */
router.post('/', chatController.sendMessage);

/**
 * @route   POST /api/chat/travel-tips
 * @desc    Get AI-generated travel tips
 * @access  Public
 */
router.post('/travel-tips', chatController.getTravelTips);

/**
 * @route   POST /api/chat/itinerary
 * @desc    Generate AI trip itinerary
 * @access  Public
 */
router.post('/itinerary', chatController.generateItinerary);

/**
 * @route   GET /api/chat/analytics
 * @desc    Get chat analytics data
 * @access  Public (should be protected in production)
 */
router.get('/analytics', chatController.getAnalytics);

module.exports = router;
