/**
 * AI Service - Groq Integration
 * Free, Fast LLM API for SkyBot Travel Assistant
 * 
 * Groq API: https://console.groq.com
 * Model: Llama 3.3 70B (fast & smart)
 */
const axios = require('axios');
const logger = require('../config/winstonLogger');

// Groq API Configuration
const GROQ_API_URL = process.env.GROQ_API_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// SkyBot System Prompt - Makes AI a travel expert
const SYSTEM_PROMPT = `You are SkyBot, an intelligent travel assistant for SkyWings - a premium flight booking platform in India.

Your personality:
- Friendly, helpful, and professional
- Expert in flights, travel planning, and tourism
- Knowledgeable about Indian and international destinations
- Concise but informative responses (2-4 sentences unless asked for more)

You can help with:
- Flight search and booking guidance
- Travel destination recommendations
- Best time to visit places
- Budget travel tips
- Visa requirements
- Packing tips
- Airport information
- Travel safety tips
- Hotel and accommodation suggestions
- Popular attractions at destinations

Important guidelines:
- Always be helpful and positive
- If asked about booking, guide them to use the search on SkyWings website
- For specific flight prices, suggest they search on the website
- Keep responses conversational and human-like
- Use emojis sparingly for friendliness ✈️
- If you don't know something, be honest and suggest alternatives

Remember: You represent SkyWings - India's trusted travel partner!`;

/**
 * Chat with AI using Groq
 * @param {string} userMessage - User's message
 * @param {array} conversationHistory - Previous messages for context
 * @returns {string} AI response
 */
async function chatWithAI(userMessage, conversationHistory = []) {
  try {
    // Check if API key is configured
    if (!GROQ_API_KEY) {
      logger.warn('[AI] Groq API key not configured - using fallback response');
      return getFallbackResponse(userMessage);
    }

    // Build messages array with context
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: userMessage }
    ];

    // Call Groq API
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile', // Best free model
        messages: messages,
        temperature: 0.7, // Balanced creativity
        max_tokens: 500, // Reasonable response length
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
    logger.info(`[AI] Response generated successfully (${aiResponse.length} chars)`);
    
    return aiResponse;

  } catch (error) {
    logger.error('[AI] Groq API error:', error.response?.data || error.message);
    
    // Return smart fallback instead of error
    return getFallbackResponse(userMessage);
  }
}

/**
 * Smart fallback responses when AI is unavailable
 */
function getFallbackResponse(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Flight related
  if (message.includes('flight') || message.includes('book') || message.includes('ticket')) {
    return "I'd love to help you find flights! 🛫 Use our search bar at the top to enter your departure city, destination, and travel dates. You'll see the best deals instantly!";
  }
  
  // Destination related
  if (message.includes('where') || message.includes('destination') || message.includes('visit') || message.includes('travel')) {
    return "Looking for travel inspiration? ✨ Some popular destinations from India are Goa, Kerala, Rajasthan for domestic, and Dubai, Singapore, Thailand for international trips. What type of vacation are you planning?";
  }
  
  // Price related
  if (message.includes('price') || message.includes('cost') || message.includes('cheap') || message.includes('budget')) {
    return "For the best prices, I recommend booking 2-3 weeks in advance! 💰 Use our search to compare real-time prices. Tuesdays and Wednesdays usually have cheaper flights.";
  }
  
  // Greeting
  if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
    return "Hello! 👋 I'm SkyBot, your travel assistant. I can help you with flight bookings, travel tips, and destination recommendations. What would you like to know?";
  }
  
  // Thanks
  if (message.includes('thank') || message.includes('thanks')) {
    return "You're welcome! 😊 Happy to help. Have a great trip! If you need anything else, I'm here.";
  }
  
  // Default
  return "I can assist with flight bookings, hotel reservations, and travel tips. What do you need help with? 🌍";
}

/**
 * Get travel tips for a destination
 */
async function getTravelTips(destination) {
  const prompt = `Give me 5 quick travel tips for visiting ${destination}. Keep it brief and practical.`;
  return await chatWithAI(prompt);
}

/**
 * Get best time to visit
 */
async function getBestTimeToVisit(destination) {
  const prompt = `What's the best time to visit ${destination}? Include weather info and peak/off-season details. Keep it concise.`;
  return await chatWithAI(prompt);
}

module.exports = {
  chatWithAI,
  getTravelTips,
  getBestTimeToVisit,
  getFallbackResponse
};
