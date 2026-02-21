# 🤖 SkyBot AI Chatbot - Complete Technical Guide

## Overview

SkyBot is an AI-powered travel assistant integrated into SkyWings using **Groq API** with the **Llama 3.3 70B** model. This guide explains the complete architecture, data flow, and implementation details.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Chatbot.js Component                         │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │    │
│  │  │  User Input  │───▶│  handleSend  │───▶│  fetch(/api/chat)    │   │    │
│  │  │  "hi"        │    │  Function    │    │  POST request        │   │    │
│  │  └──────────────┘    └──────────────┘    └──────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP POST
                                      │ { message: "hi" }
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express.js)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Route: /api/chat                             │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │    │
│  │  │ chat.routes  │───▶│ chat.controller│───▶│  ai.service.js     │   │    │
│  │  │ POST /       │    │ sendMessage()  │    │  chatWithAI()       │   │    │
│  │  └──────────────┘    └──────────────┘    └──────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP POST (OpenAI-compatible)
                                      │ Authorization: Bearer gsk_xxx
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GROQ CLOUD API                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Llama 3.3 70B Versatile Model                     │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │    │
│  │  │System Prompt │ +  │ User Message │ =  │   AI Response        │   │    │
│  │  │"You are     │    │ "hi"         │    │  "Hello! Welcome..." │   │    │
│  │  │ SkyBot..."  │    │              │    │                      │   │    │
│  │  └──────────────┘    └──────────────┘    └──────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
backend/
├── src/
│   ├── services/
│   │   └── ai.service.js       # Groq API integration
│   ├── controllers/
│   │   └── chat.controller.js  # Request handler
│   ├── routes/
│   │   ├── chat.routes.js      # Route definitions
│   │   └── index.js            # Route registration
│   └── ...

frontend/
├── app/
│   └── components/
│       └── Chatbot/
│           ├── Chatbot.js      # React component
│           └── Chatbot.css     # Styles
├── lib/
│   └── api/
│       └── config.js           # API endpoints
└── ...
```

---

## 🔄 Complete Data Flow

### Step 1: User Types Message (Frontend)

**File:** `frontend/app/components/Chatbot/Chatbot.js`

```javascript
// User types "hi" and clicks send
const handleSend = async () => {
  if (!inputValue.trim()) return;

  // 1. Add user message to chat
  const userMessage = {
    id: messages.length + 1,
    text: inputValue,           // "hi"
    sender: 'user',
    time: '01:40 AM'
  };
  setMessages(prev => [...prev, userMessage]);
  
  // 2. Show typing indicator
  setIsTyping(true);

  // 3. Send to backend API
  const response = await fetch(API_ENDPOINTS.CHAT.SEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: inputValue })  // { message: "hi" }
  });

  // 4. Get AI response
  const data = await response.json();
  // data = { success: true, reply: "Hello! Welcome to SkyWings..." }

  // 5. Display bot response
  const botMessage = {
    id: messages.length + 2,
    text: data.reply,
    sender: 'bot',
    time: '01:40 AM'
  };
  setMessages(prev => [...prev, botMessage]);
  setIsTyping(false);
};
```

### Step 2: Backend Receives Request

**File:** `backend/src/routes/chat.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// POST /api/chat - Main chat endpoint
router.post('/', chatController.sendMessage);

module.exports = router;
```

### Step 3: Controller Processes Request

**File:** `backend/src/controllers/chat.controller.js`

```javascript
const aiService = require('../services/ai.service');

class ChatController {
  async sendMessage(req, res) {
    try {
      const { message } = req.body;  // "hi"
      
      // Call AI service
      const reply = await aiService.chatWithAI(message);
      
      res.json({
        success: true,
        reply: reply  // "Hello! Welcome to SkyWings..."
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        reply: "Sorry, I'm having trouble. Please try again!"
      });
    }
  }
}
```

### Step 4: AI Service Calls Groq API

**File:** `backend/src/services/ai.service.js`

```javascript
const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;  // gsk_xxx from .env

// System prompt defines SkyBot's personality
const SYSTEM_PROMPT = `You are SkyBot, an intelligent travel assistant for SkyWings...`;

async function chatWithAI(userMessage) {
  // Build request payload (OpenAI-compatible format)
  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }  // "hi"
    ],
    temperature: 0.7,
    max_tokens: 500
  };

  // Call Groq API
  const response = await axios.post(GROQ_API_URL, payload, {
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  // Extract AI response
  return response.data.choices[0].message.content;
  // "Hello! 😊 Welcome to SkyWings, your premium flight booking platform..."
}
```

### Step 5: Groq API Processes with Llama 3.3

Groq receives this request:

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "You are SkyBot, an intelligent travel assistant for SkyWings - a premium flight booking platform in India. Your personality: Friendly, helpful, and professional..."
    },
    {
      "role": "user", 
      "content": "hi"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

Groq returns:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! 😊 Welcome to SkyWings, your premium flight booking platform in India. How can I assist you with your travel plans today? Are you looking to book a flight or need some travel recommendations?"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 245,
    "completion_tokens": 52,
    "total_tokens": 297
  }
}
```

### Step 6: Response Returns to Frontend

The response flows back:
```
Groq API → ai.service.js → chat.controller.js → Frontend → User sees message
```

---

## 🧠 How the AI "Knows" About Travel

The magic is in the **System Prompt**. This is pre-loaded context that shapes every response:

```javascript
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
```

Every user message is combined with this system prompt, so the AI always responds as "SkyBot".

---

## 🛡️ Fallback System

If Groq API fails or is unavailable, smart keyword-based fallbacks kick in:

```javascript
function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Travel-specific fallbacks
  if (lowerMessage.includes('flight') || lowerMessage.includes('book')) {
    return "I can help you find flights! Use our search on the homepage...";
  }
  
  if (lowerMessage.includes('dubai') || lowerMessage.includes('destination')) {
    return "Great choice! I'd recommend checking our popular destinations...";
  }
  
  // Generic fallback
  return "I'm here to help with your travel plans! What would you like to know?";
}
```

This ensures the chatbot never breaks, even without internet.

---

## 🔑 Why Groq API?

| Feature | Groq | OpenAI | HuggingFace |
|---------|------|--------|-------------|
| **Cost** | FREE | $0.002/1K tokens | FREE (limited) |
| **Speed** | ~300 tokens/sec | ~50 tokens/sec | ~10 tokens/sec |
| **Model** | Llama 3.3 70B | GPT-4 | Various |
| **API Format** | OpenAI-compatible | Native | Custom |
| **Rate Limit** | 30 req/min | Based on tier | 10 req/min |

**Groq wins because:**
1. **FREE** - No credit card required
2. **Fast** - 10x faster than OpenAI
3. **Smart** - Llama 3.3 70B is very capable
4. **Easy** - OpenAI-compatible API (easy migration later)

---

## ⚙️ Configuration

### Environment Variables

**Backend `.env`:**
```env
# Get your free key at: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key
```

### API Endpoint Config

**Frontend `lib/api/config.js`:**
```javascript
CHAT: {
  SEND: `${API_BASE_URL}/chat`,
  TRAVEL_TIPS: `${API_BASE_URL}/chat/travel-tips`,
}
```

---

## 🔧 Customization

### Change AI Personality

Edit `backend/src/services/ai.service.js`:

```javascript
const SYSTEM_PROMPT = `You are [NEW NAME], a [PERSONALITY] assistant for [COMPANY]...`;
```

### Change AI Model

```javascript
const payload = {
  model: 'llama-3.3-70b-versatile',  // Change this
  // Other options: 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'
  ...
};
```

### Adjust Response Style

```javascript
temperature: 0.7,   // 0.0 = deterministic, 1.0 = creative
max_tokens: 500,    // Maximum response length
```

---

## 📊 Monitoring

### Groq Dashboard
- URL: https://console.groq.com
- Track: API calls, usage, errors

### Backend Logs
```javascript
logger.info(`[AI] User: ${userMessage}`);
logger.info(`[AI] Response: ${response.substring(0, 100)}...`);
```

---

## 🚀 Production Deployment

1. **Add GROQ_API_KEY to Render:**
   - Dashboard → Environment → Add Variable
   - Key: `GROQ_API_KEY`
   - Value: `gsk_xxx`

2. **Redeploy backend**

3. **Test on production URL**

---

## 📝 API Reference

### POST /api/chat

Send a message to SkyBot.

**Request:**
```json
{
  "message": "What's the best time to visit Goa?"
}
```

**Response:**
```json
{
  "success": true,
  "reply": "The best time to visit Goa is from November to February when the weather is pleasant and perfect for beach activities! 🏖️ This is also the peak tourist season with lots of festivals and events.",
  "model": "llama-3.3-70b-versatile",
  "usage": {
    "prompt_tokens": 250,
    "completion_tokens": 65,
    "total_tokens": 315
  }
}
```

### POST /api/chat/travel-tips

Get travel tips for a destination.

**Request:**
```json
{
  "destination": "Dubai"
}
```

**Response:**
```json
{
  "success": true,
  "tips": [
    "Best time to visit: November to March",
    "Must-see: Burj Khalifa, Dubai Mall, Palm Jumeirah",
    "Budget tip: Visit during Ramadan for great hotel deals"
  ]
}
```

---

## 🔮 Future Enhancements

1. **Conversation Memory** - Remember previous messages in session
2. **Flight Search Integration** - Let AI search flights directly
3. **Multi-language Support** - Hindi, Tamil, etc.
4. **Voice Input** - Speech-to-text integration
5. **Booking Assistant** - Guide users through booking flow

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| "0 API calls" on dashboard | Restart backend to load .env |
| Fallback responses only | Check GROQ_API_KEY in .env |
| Slow responses | Normal for first request (cold start) |
| Rate limit errors | Wait 1 minute, reduce request frequency |

---

## 🎉 Summary

```
User types "hi"
    ↓
Frontend sends POST /api/chat { message: "hi" }
    ↓
Backend receives in chat.controller.js
    ↓
ai.service.js calls Groq API with System Prompt + User Message
    ↓
Groq processes with Llama 3.3 70B model
    ↓
AI generates contextual travel response
    ↓
Response returns to frontend
    ↓
User sees: "Hello! 😊 Welcome to SkyWings..."
```

**Total time:** ~500ms (Groq is FAST!)

---

*Created for SkyWings Travel Booking Platform*
*AI Powered by Groq + Llama 3.3 70B*
