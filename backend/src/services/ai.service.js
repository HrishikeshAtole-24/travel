/**
 * AI Service - Groq Integration (PRO LEVEL)
 * Fast LLM API for SkyBot Travel Assistant
 * 
 * Groq API: https://console.groq.com
 * Model: Llama 3.3 70B (fast & smart)
 * 
 * Features:
 * - Smart travel-focused responses
 * - Intent detection for routing
 * - Query enhancement
 * - Analytics-ready logging
 */
const axios = require('axios');
const logger = require('../config/winstonLogger');

// Groq API Configuration
const GROQ_API_URL = process.env.GROQ_API_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ==================== PRO LEVEL SYSTEM PROMPT ====================
const SYSTEM_PROMPT = `You are SkyBot, an expert AI travel assistant for SkyWings - India's premium flight booking platform.

🎯 YOUR EXPERTISE:
- Flight bookings, pricing & deals
- Travel itinerary planning
- Hotel & accommodation tips
- Visa requirements for Indians
- Budget & luxury travel advice
- Destination recommendations
- Packing guides & travel hacks

📋 RESPONSE GUIDELINES:
1. Keep responses concise (3-5 sentences) unless asked for detailed plans
2. Use bullet points for lists and itineraries
3. Always include actionable advice
4. Mention prices in INR (₹) when relevant
5. Be friendly but professional
6. If unsure, suggest using the SkyWings search

🇮🇳 INDIAN TRAVELER FOCUS:
- Recommend popular routes: Delhi, Mumbai, Bangalore, Chennai, Kolkata
- Know peak seasons for Indian destinations
- Understand budget-conscious travel preferences
- Familiar with Indian visa requirements abroad

✨ SPECIAL CAPABILITIES:
- Create day-by-day trip itineraries
- Suggest best times to book flights (2-3 weeks advance)
- Compare destinations for different budgets
- Provide honest pros/cons of places

⚠️ RULES:
- Never make up flight prices - suggest searching on the website
- Don't provide medical or legal advice
- Keep responses under 200 words unless planning trips
- Always maintain helpful, positive tone

Remember: You represent SkyWings - India's trusted travel partner! 🛫`;

// ==================== INTENT DETECTION ====================
const INTENTS = {
  FLIGHT_SEARCH: ['flight', 'fly', 'plane', 'ticket', 'booking', 'airport', 'departure', 'arrival'],
  HOTEL_SEARCH: ['hotel', 'stay', 'accommodation', 'resort', 'hostel', 'lodge', 'room'],
  TRIP_PLANNING: ['plan', 'itinerary', 'trip', 'vacation', 'holiday', 'tour', 'visit', 'travel to'],
  BUDGET_QUERY: ['cheap', 'budget', 'affordable', 'cost', 'price', 'expensive', 'save money'],
  VISA_INFO: ['visa', 'passport', 'document', 'requirement', 'immigration'],
  DESTINATION: ['where', 'suggest', 'recommend', 'best place', 'destination', 'which city'],
  TIMING: ['when', 'best time', 'season', 'month', 'weather'],
  TIPS: ['tip', 'advice', 'hack', 'guide', 'how to', 'what to pack']
};

/**
 * Detect user intent from message
 */
function detectIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(INTENTS)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return intent;
    }
  }
  
  return 'GENERAL';
}

/**
 * Enhance user query based on intent
 */
function enhanceQuery(message, intent) {
  const enhancements = {
    FLIGHT_SEARCH: 'Provide specific flight booking guidance. ',
    HOTEL_SEARCH: 'Suggest hotel types, price ranges, and booking tips. ',
    TRIP_PLANNING: 'Create a structured day-by-day itinerary with activities. ',
    BUDGET_QUERY: 'Focus on money-saving tips and budget-friendly options. ',
    VISA_INFO: 'Provide accurate visa information for Indian passport holders. ',
    DESTINATION: 'Suggest destinations with reasons, best seasons, and highlights. ',
    TIMING: 'Include weather patterns, peak/off-season, and best months. ',
    TIPS: 'Give practical, actionable tips in bullet points. '
  };
  
  return enhancements[intent] || '';
}

/**
 * Chat with AI using Groq (PRO LEVEL)
 * @param {string} userMessage - User's message
 * @param {array} conversationHistory - Previous messages for context
 * @param {string} sessionId - Session ID for memory tracking
 * @returns {object} AI response with metadata
 */
async function chatWithAI(userMessage, conversationHistory = [], sessionId = null) {
  const startTime = Date.now();
  
  try {
    // Input validation
    if (!userMessage || userMessage.trim().length === 0) {
      return { reply: getFallbackResponse(''), intent: 'GENERAL' };
    }
    
    // Sanitize input (max 500 chars for safety)
    const sanitizedMessage = userMessage.trim().slice(0, 500);
    
    // Check if API key is configured
    if (!GROQ_API_KEY) {
      logger.warn('[AI] Groq API key not configured - using fallback response');
      return { 
        reply: getFallbackResponse(sanitizedMessage), 
        intent: detectIntent(sanitizedMessage) 
      };
    }

    // Detect intent for smart routing
    const intent = detectIntent(sanitizedMessage);
    const queryEnhancement = enhanceQuery(sanitizedMessage, intent);
    
    logger.info(`[AI] Intent: ${intent} | Session: ${sessionId || 'anonymous'}`);

    // Build messages array with context
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-8), // Keep last 8 messages for context
      { 
        role: 'user', 
        content: queryEnhancement + sanitizedMessage 
      }
    ];

    // Call Groq API
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 600, // Increased for trip plans
        top_p: 0.9,
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    let aiResponse = response.data.choices[0].message.content;
    
    // Clean up response
    aiResponse = cleanResponse(aiResponse);
    
    const responseTime = Date.now() - startTime;
    
    logger.info(`[AI] Response generated | ${aiResponse.length} chars | ${responseTime}ms | Intent: ${intent}`);
    
    // Return enriched response
    return {
      reply: aiResponse,
      intent: intent,
      responseTime: responseTime,
      model: 'llama-3.3-70b'
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('[AI] Groq API error:', {
      error: error.response?.data || error.message,
      responseTime: responseTime
    });
    
    // Return smart fallback
    const intent = detectIntent(userMessage);
    return {
      reply: getFallbackResponse(userMessage),
      intent: intent,
      responseTime: responseTime,
      fallback: true
    };
  }
}

/**
 * Clean and format AI response
 */
function cleanResponse(text) {
  if (!text) return '';
  
  return text
    // Remove multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Clean up bullet formatting
    .replace(/^[-*]\s+/gm, '• ')
    // Remove excessive spaces
    .replace(/  +/g, ' ')
    // Trim whitespace
    .trim();
}

/**
 * Smart fallback responses when AI is unavailable (ENHANCED)
 */
function getFallbackResponse(userMessage) {
  const message = (userMessage || '').toLowerCase();
  const intent = detectIntent(message);
  
  const responses = {
    FLIGHT_SEARCH: "I'd love to help you find flights! ✈️ Use our search bar at the top to enter your departure city, destination, and travel dates. Pro tip: Book 2-3 weeks in advance for best prices!",
    
    HOTEL_SEARCH: "Looking for the perfect stay? 🏨 I recommend checking:\n• Budget: OYO, Treebo (₹1000-2500)\n• Mid-range: Ibis, Lemon Tree (₹3000-5000)\n• Premium: Taj, ITC, Marriott (₹8000+)\n\nWhat's your budget and destination?",
    
    TRIP_PLANNING: "Let's plan your dream trip! 🗺️ Tell me:\n• Where do you want to go?\n• How many days?\n• Your budget range?\n\nI'll create a day-by-day itinerary for you!",
    
    BUDGET_QUERY: "Great question about budget travel! 💰\n• Book flights 2-3 weeks early\n• Travel on Tue/Wed (cheapest)\n• Consider connecting flights\n• Use our price alerts feature\n\nWhat route are you looking at?",
    
    VISA_INFO: "For visa information for Indian travelers: 🛂\n• UAE, Singapore, Thailand: Easy visa on arrival/e-visa\n• Europe (Schengen): Apply 3-4 weeks before\n• USA/UK: Schedule interview early\n\nWhich country interests you?",
    
    DESTINATION: "Looking for travel inspiration? ✨ Here are top picks:\n\n🇮🇳 Domestic: Goa, Kerala, Rajasthan, Ladakh\n🌏 International: Dubai, Singapore, Thailand, Bali\n\nTell me your vibe - beaches, mountains, or cities?",
    
    TIMING: "Best times to travel from India: 📅\n• Goa: Nov-Feb (beaches)\n• Europe: Apr-Jun (spring)\n• Thailand: Nov-Mar (winter)\n• Dubai: Oct-Apr (cooler)\n\nWhere are you planning to go?",
    
    TIPS: "Here are my pro travel tips: 💡\n• Book flights on incognito mode\n• Pack light - airlines charge for extra bags\n• Get travel insurance always\n• Download offline maps\n• Carry a power bank\n\nNeed specific tips for your destination?",
    
    GENERAL: "Hello! 👋 I'm SkyBot, your travel assistant. I can help you with:\n\n✈️ Flight bookings & deals\n🏨 Hotel recommendations\n📅 Trip planning\n🛂 Visa info\n💡 Travel tips\n\nWhat would you like to know?"
  };
  
  return responses[intent] || responses.GENERAL;
}

/**
 * Get travel tips for a destination
 */
async function getTravelTips(destination) {
  const prompt = `Give me 5 quick, practical travel tips for visiting ${destination} as an Indian traveler. Include visa info if applicable.`;
  const result = await chatWithAI(prompt);
  return typeof result === 'object' ? result.reply : result;
}

/**
 * Get best time to visit
 */
async function getBestTimeToVisit(destination) {
  const prompt = `What's the best time to visit ${destination}? Include weather info, peak/off-season details, and expected costs in INR.`;
  const result = await chatWithAI(prompt);
  return typeof result === 'object' ? result.reply : result;
}

/**
 * Generate trip itinerary
 */
async function generateItinerary(destination, days, budget) {
  const prompt = `Create a detailed ${days}-day itinerary for ${destination} with a budget of ₹${budget}. Include daily activities, accommodation suggestions, food spots, and transportation tips.`;
  const result = await chatWithAI(prompt);
  return typeof result === 'object' ? result.reply : result;
}

module.exports = {
  chatWithAI,
  getTravelTips,
  getBestTimeToVisit,
  generateItinerary,
  getFallbackResponse,
  detectIntent
};
