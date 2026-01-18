'use client';

import { useRouter } from 'next/navigation';
import '../list-property/coming-soon.css';

export default function MyBizPage() {
  const router = useRouter();

  return (
    <div className="coming-soon-page">
      <div className="coming-soon-container">
        <div className="coming-soon-icon">
          <i className="fas fa-briefcase"></i>
        </div>
        <h1>Introducing myBiz</h1>
        <p className="coming-soon-subtitle">Business Travel Solution</p>
        <p className="coming-soon-description">
          A comprehensive business travel management platform is coming soon. 
          Manage corporate bookings, expense tracking, and travel policies all in one place.
        </p>
        <div className="coming-soon-features">
          <div className="feature-item">
            <i className="fas fa-building"></i>
            <span>Corporate account management</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-receipt"></i>
            <span>Easy expense reporting</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-shield-alt"></i>
            <span>Secure & compliant</span>
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
