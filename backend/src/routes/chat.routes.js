/**
 * Chat Routes - AI-Powered SkyBot
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

module.exports = router;
