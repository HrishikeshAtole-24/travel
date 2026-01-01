'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import './confirmation.css';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  return (
    <>
      <Header />
      <main className="confirmation-page">
        <div className="container">
          <div className="confirmation-card">
            <div className="success-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="4"/>
                <path d="M25 40L35 50L55 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1>Booking Confirmed!</h1>
            <p className="confirmation-message">
              Your flight has been successfully booked. 
              Confirmation details have been sent to your email.
            </p>

            <div className="booking-reference">
              <span className="reference-label">Booking Reference</span>
              <span className="reference-value">{bookingId || 'XXXXXX'}</span>
            </div>

            <div className="confirmation-actions">
              <Link href="/my-bookings" className="btn btn-primary btn-lg">
                View My Bookings
              </Link>
              <Link href="/" className="btn btn-outline btn-lg">
                Back to Home
              </Link>
            </div>

            <div className="confirmation-info">
              <div className="info-box">
                <h3>📧 Check Your Email</h3>
                <p>We've sent your booking confirmation and e-ticket to your email address.</p>
              </div>
              <div className="info-box">
                <h3>✈️ Travel Documents</h3>
                <p>Don't forget to bring a valid ID and your e-ticket for check-in.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
