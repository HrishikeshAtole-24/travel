'use client';

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm SkyBot, your travel assistant. How can I help you today?",
      sender: 'bot',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Client-side only rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const dummyResponses = [
    "I can help you find the best flight deals! What's your destination?",
    "Let me check available flights for you. Where would you like to travel?",
    "I can assist with flight bookings, hotel reservations, and travel tips. What do you need?",
    "Great question! I'm here to make your travel planning easier.",
    "I can help you with flight bookings, hotel searches, and travel recommendations.",
    "Looking for the best deals? Tell me your travel dates and destination!",
  ];

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot typing and response
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        text: dummyResponses[Math.floor(Math.random() * dummyResponses.length)],
        sender: 'bot',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
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
          <i className="fas fa-comments"></i>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
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
            <button 
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <i className="fas fa-times"></i>
            </button>
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
                    {message.text}
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
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="chatbot-input-field"
            />
            <button 
              onClick={handleSend}
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
