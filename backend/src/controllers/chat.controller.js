/**
 * Chat Controller - AI-Powered SkyBot (PRO LEVEL)
 * 
 * Features:
 * - Session-based conversation memory
 * - Intent detection & routing
 * - Analytics logging
 * - Rate limiting
 * - Input sanitization
 */
const aiService = require('../services/ai.service');
const logger = require('../config/winstonLogger');

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 messages per minute

// Analytics storage (in production, use DB)
const analyticsData = {
  totalQueries: 0,
  intents: {},
  avgResponseTime: 0,
  responseTimes: []
};

/**
 * Check rate limit for session
 */
function checkRateLimit(sessionId) {
  const key = sessionId || 'anonymous';
  const now = Date.now();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, firstRequest: now });
    return true;
  }
  
  const limitData = rateLimitMap.get(key);
  
  // Reset if window expired
  if (now - limitData.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, firstRequest: now });
    return true;
  }
  
  // Check limit
  if (limitData.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  limitData.count++;
  return true;
}

/**
 * Log analytics data
 */
function logAnalytics(intent, responseTime, sessionId) {
  analyticsData.totalQueries++;
  analyticsData.intents[intent] = (analyticsData.intents[intent] || 0) + 1;
  
  // Keep last 100 response times for average
  analyticsData.responseTimes.push(responseTime);
  if (analyticsData.responseTimes.length > 100) {
    analyticsData.responseTimes.shift();
  }
  
  analyticsData.avgResponseTime = Math.round(
    analyticsData.responseTimes.reduce((a, b) => a + b, 0) / analyticsData.responseTimes.length
  );
  
  // Log every 50 queries
  if (analyticsData.totalQueries % 50 === 0) {
    logger.info('[Analytics] Chat stats:', {
      totalQueries: analyticsData.totalQueries,
      topIntents: Object.entries(analyticsData.intents)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      avgResponseTime: analyticsData.avgResponseTime + 'ms'
    });
  }
}

class ChatController {
  /**
   * @route   POST /api/chat
   * @desc    Send message and get AI response
   * @access  Public
   */
  async sendMessage(req, res) {
    try {
      const { message, history = [], sessionId } = req.body;

      // Input validation
      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Message length validation
      if (message.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Message too long. Please keep it under 500 characters.'
        });
      }

      // Rate limiting check
      if (!checkRateLimit(sessionId)) {
        logger.warn(`[Chat] Rate limit exceeded for session: ${sessionId}`);
        return res.status(429).json({
          success: false,
          error: 'Too many messages. Please wait a moment.',
          reply: "You're sending messages too quickly! Please wait a moment and try again. 😊"
        });
      }

      const sanitizedMessage = message.trim();
      
      logger.info(`[Chat] User: "${sanitizedMessage.substring(0, 50)}${sanitizedMessage.length > 50 ? '...' : ''}" | Session: ${sessionId || 'anon'}`);

      // Convert history to API format
      const conversationHistory = history.slice(-8).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Get AI response with metadata
      const aiResult = await aiService.chatWithAI(sanitizedMessage, conversationHistory, sessionId);
      
      // Handle both object and string responses
      const reply = typeof aiResult === 'object' ? aiResult.reply : aiResult;
      const intent = typeof aiResult === 'object' ? aiResult.intent : 'GENERAL';
      const responseTime = typeof aiResult === 'object' ? aiResult.responseTime : 0;

      // Log analytics
      logAnalytics(intent, responseTime, sessionId);

      logger.info(`[Chat] Bot replied | Intent: ${intent} | ${responseTime}ms`);

      res.status(200).json({
        success: true,
        reply: reply,
        intent: intent,
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('[Chat] Error:', error.message);
      
      // Return fallback response instead of error
      res.status(200).json({
        success: true,
        reply: aiService.getFallbackResponse(req.body?.message || ''),
        intent: 'FALLBACK',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * @route   POST /api/chat/travel-tips
   * @desc    Get travel tips for a destination
   * @access  Public
   */
  async getTravelTips(req, res) {
    try {
      const { destination } = req.body;

      if (!destination) {
        return res.status(400).json({
          success: false,
          error: 'Destination is required'
        });
      }

      const tips = await aiService.getTravelTips(destination);

      res.status(200).json({
        success: true,
        destination,
        tips,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('[Chat] Travel tips error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get travel tips'
      });
    }
  }

  /**
   * @route   POST /api/chat/itinerary
   * @desc    Generate trip itinerary
   * @access  Public
   */
  async generateItinerary(req, res) {
    try {
      const { destination, days = 5, budget = 50000 } = req.body;

      if (!destination) {
        return res.status(400).json({
          success: false,
          error: 'Destination is required'
        });
      }

      const itinerary = await aiService.generateItinerary(destination, days, budget);

      res.status(200).json({
        success: true,
        destination,
        days,
        budget,
        itinerary,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('[Chat] Itinerary error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate itinerary'
      });
    }
  }

  /**
   * @route   GET /api/chat/analytics
   * @desc    Get chat analytics (admin only)
   * @access  Private
   */
  async getAnalytics(req, res) {
    res.status(200).json({
      success: true,
      analytics: analyticsData,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new ChatController();
