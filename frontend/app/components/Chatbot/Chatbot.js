'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/api/config';
import './Chatbot.css';

// Quick Action Buttons - Clean Gen Z Style
const QUICK_ACTIONS = [
  { icon: 'fa-plane', label: 'Flights', prompt: 'Find me the cheapest flights this week' },
  { icon: 'fa-hotel', label: 'Hotels', prompt: 'Suggest best budget hotels under ₹3000/night' },
  { icon: 'fa-map-marked-alt', label: 'Trip', prompt: 'Plan a 5-day budget trip for me' },
  { icon: 'fa-compass', label: 'Explore', prompt: 'Where should I travel this season?' },
];

// Generate or get session ID for memory
const getSessionId = () => {
  if (typeof window === 'undefined') return null;
  let sessionId = sessionStorage.getItem('skybot_session');
  if (!sessionId) {
    sessionId = `skybot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('skybot_session', sessionId);
  }
  return sessionId;
};

// Format AI response (handle markdown-style formatting)
const formatMessage = (text) => {
  if (!text) return '';
  
  // Convert markdown-style formatting to HTML-safe display
  let formatted = text
    // Handle bullet points
    .replace(/^[-•]\s+/gm, '• ')
    .replace(/^\*\s+/gm, '• ')
    // Handle numbered lists
    .replace(/^\d+\.\s+/gm, (match) => match)
    // Handle bold text **text**
    .replace(/\*\*(.+?)\*\*/g, '**$1**')
    // Handle newlines for display
    .replace(/\n\n/g, '\n\n')
    .replace(/\n/g, '\n');
  
  return formatted;
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hey! I'm SkyBot ✈️\n\nAsk me anything about flights, hotels, or trip planning. Or tap the buttons above to get started!",
      sender: 'bot',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Client-side only rendering + session setup
  useEffect(() => {
    setIsClient(true);
    setSessionId(getSessionId());
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && chatWindowRef.current && !chatWindowRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message to AI
  const handleSend = useCallback(async (customMessage = null) => {
    const messageToSend = customMessage || inputValue;
    if (!messageToSend.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: messageToSend,
      sender: 'user',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customMessage) setInputValue('');
    setIsTyping(true);

    try {
      // Send conversation history for context memory
      const conversationHistory = messages.slice(-10).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await fetch(API_ENDPOINTS.CHAT.SEND, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          sessionId: sessionId,
          history: conversationHistory
        }),
      });

      const data = await response.json();

      const botMessage = {
        id: messages.length + 2,
        text: data.success ? formatMessage(data.reply) : "I'm having trouble connecting. Please try again!",
        sender: 'bot',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        intent: data.intent || null
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I'm having connection issues. Please try again in a moment!",
        sender: 'bot',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, messages, sessionId]);

  // Handle quick action click
  const handleQuickAction = (prompt) => {
    handleSend(prompt);
  };

  // Clear chat and reset
  const handleClearChat = () => {
    setMessages([{
      id: 1,
      text: "Fresh start! ✨ What are we planning today?",
      sender: 'bot',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }]);
    // Reset session for fresh context
    if (typeof window !== 'undefined') {
      const newSessionId = `skybot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('skybot_session', newSessionId);
      setSessionId(newSessionId);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render until client-side (avoid hydration issues)
  if (!isClient) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button 
          className="chatbot-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          <i className="fas fa-robot"></i>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window" ref={chatWindowRef}>
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-avatar">
                <i className="fas fa-robot"></i>
              </div>
              <div className="chatbot-header-info">
                <h3 className="chatbot-title">SkyBot</h3>
                <p className="chatbot-status">
                  <span className="status-dot"></span>
                  Online
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button 
                className="chatbot-clear"
                onClick={handleClearChat}
                aria-label="Clear chat"
                title="Clear chat"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
              <button 
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Quick Actions - Clean Pill Buttons */}
          <div className="quick-actions-bar">
            {QUICK_ACTIONS.map((action, index) => (
              <button
                key={index}
                className="quick-pill"
                onClick={() => handleQuickAction(action.prompt)}
                title={action.prompt}
              >
                <i className={`fas ${action.icon}`}></i>
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.sender === 'user' ? 'message-user' : 'message-bot'}`}
              >
                {message.sender === 'bot' && (
                  <div className="message-avatar">
                    <i className="fas fa-robot"></i>
                  </div>
                )}
                <div className="message-content">
                  <div className="message-bubble">
                    {message.text.split('\n').map((line, index) => (
                      <span key={index}>
                        {line.startsWith('•') ? (
                          <span className="message-bullet">{line}</span>
                        ) : line.startsWith('**') && line.endsWith('**') ? (
                          <strong>{line.slice(2, -2)}</strong>
                        ) : (
                          line
                        )}
                        {index < message.text.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  <div className="message-time">{message.time}</div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message message-bot">
                <div className="message-avatar">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="message-content">
                  <div className="message-bubble typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="chatbot-input-field"
            />
            <button 
              onClick={() => handleSend()}
              className="chatbot-send-button"
              disabled={!inputValue.trim()}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
