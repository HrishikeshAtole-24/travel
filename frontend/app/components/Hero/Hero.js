'use client';

import FlightSearchWidget from '../FlightSearchWidget/FlightSearchWidget';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-overlay"></div>
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Discover Your Next Adventure
            </h1>
            <p className="hero-subtitle">
              Book flights to 500+ destinations worldwide at the best prices
            </p>
          </div>
          
          <FlightSearchWidget />
        </div>
      </div>
    </section>
  );
}
