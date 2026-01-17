'use client';

import { useRouter } from 'next/navigation';
import './coming-soon.css';

export default function ListPropertyPage() {
  const router = useRouter();

  return (
    <div className="coming-soon-page">
      <div className="coming-soon-container">
        <div className="coming-soon-icon">
          <i className="fas fa-building"></i>
        </div>
        <h1>List Your Property</h1>
        <p className="coming-soon-subtitle">Grow your business with SkyWings</p>
        <p className="coming-soon-description">
          We're building an amazing platform for property owners to list their hotels, 
          resorts, and vacation rentals. Stay tuned!
        </p>
        <div className="coming-soon-features">
          <div className="feature-item">
            <i className="fas fa-chart-line"></i>
            <span>Boost your bookings</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-users"></i>
            <span>Reach millions of travelers</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-headset"></i>
            <span>24/7 support</span>
          </div>
        </div>
        <button className="btn-back" onClick={() => router.push('/')}>
          <i className="fas fa-arrow-left"></i>
          Back to Home
        </button>
      </div>
    </div>
  );
}
