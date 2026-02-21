/**
 * Chat Controller - AI-Powered SkyBot
 * Handles chat messages and AI responses
 */
const aiService = require('../services/ai.service');
const logger = require('../config/winstonLogger');

class ChatController {
  /**
   * @route   POST /api/chat
   * @desc    Send message and get AI response
   * @access  Public
   */
  async sendMessage(req, res) {
    try {
      const { message, history = [] } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      logger.info(`[Chat] User message: "${message.substring(0, 50)}..."`);

      // Convert history to API format
      const conversationHistory = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Get AI response
      const aiResponse = await aiService.chatWithAI(message, conversationHistory);

      logger.info(`[Chat] Bot response generated successfully`);

      res.status(200).json({
        success: true,
        reply: aiResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('[Chat] Error:', error.message);
      
      // Return fallback response instead of error
      res.status(200).json({
        success: true,
        reply: aiService.getFallbackResponse(req.body.message || ''),
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
}

module.exports = new ChatController();
