'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import './TravelInsights.css';

export default function TravelInsights() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef(null);

  const insights = [
    {
      icon: 'fa-solid fa-plane-departure',
      title: 'Indian Travel Trends Report 2026',
      description: 'Check out our travel trends report for top travel insights',
      link: '#',
      bgColor: '#e3f2fd',
      iconColor: '#1976d2',
      useIcon: true
    },
    {
      icon: 'fa-solid fa-bowl-food',
      title: 'Finding Indian Food Abroad',
      description: 'Use newly launched filters to find Indian food during international travel',
      link: '#',
      bgColor: '#fff3e0',
      iconColor: '#f57c00',
      useIcon: true
    },
    {
      icon: 'fa-solid fa-passport',
      title: 'International Flight Guidelines',
      description: 'Essential travel guidelines and requirements for booking international flights',
      link: '#',
      bgColor: '#f3e5f5',
      iconColor: '#7b1fa2',
      useIcon: true
    },
    {
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Reliance_General_Insurance.svg/2560px-Reliance_General_Insurance.svg.png',
      title: 'Reliance General Insurance',
      description: 'Travel light, leave your worries behind with comprehensive insurance',
      link: '#',
      bgColor: '#e8f5e9',
      useIcon: false
    },
    {
      logo: 'https://healthinsuranceblob.abhicl.in/marketingcontent/assets/img/abhi-footer-logo-2x.png',
      title: 'Aditya Birla Health Insurance',
      description: 'Karo Acchi Sehat Ka Iraada, comprehensive health coverage for travelers',
      link: '#',
      bgColor: '#fff3e0',
      useIcon: false
    }
  ];

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 400;
      const newPosition = direction === 'left' 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount;
      
      container.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="travel-insights">
      <div className="container">
        <div className="insights-wrapper">
          <button 
            className="scroll-btn scroll-btn-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="insights-slider" ref={scrollContainerRef}>
            {insights.map((insight, index) => (
              <Link href={insight.link} key={index} className="insight-card">
                <div className="insight-icon" style={{ backgroundColor: insight.bgColor }}>
                  {insight.useIcon ? (
                    <i className={insight.icon} style={{ color: insight.iconColor }}></i>
                  ) : (
                    <img src={insight.logo} alt={insight.title} className="insight-logo" />
                  )}
                </div>
                <div className="insight-content">
                  {/* <h3 className="insight-title">{insight.title}</h3> */}
                  <p className="insight-description">{insight.description}</p>
                </div>
                <div className="insight-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </Link>
            ))}
          </div>

          <button 
            className="scroll-btn scroll-btn-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </section>
  );
}
