'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import './payment-failed.css';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentReference = searchParams.get('payment_reference');
  const status = searchParams.get('status');
  const reason = searchParams.get('reason');

  const handleRetryPayment = () => {
    // Redirect back to search or booking page
    router.push('/search');
  };

  const handleViewBookings = () => {
    router.push('/my-bookings');
  };

  const handleContactSupport = () => {
    router.push('/contact');
  };

  return (
    <>
      <Header />
      <main className="payment-failed-page">
        <div className="container">
          <div className="failed-card">
            {/* Failed Icon */}
            <div className="failed-icon">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#ef4444" />
                <path d="M35 35 L65 65 M65 35 L35 65" stroke="white" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </div>

            {/* Failed Message */}
            <h1>Payment Failed</h1>
            <p className="failed-subtitle">We couldn't process your payment</p>

            {/* Payment Reference */}
            {paymentReference && (
              <div className="reference-box failed-ref">
                <span className="reference-label">Payment Reference</span>
                <span className="reference-value">{paymentReference}</span>
              </div>
            )}

            {/* Error Message */}
            <div className="error-message">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h3>What went wrong?</h3>
                <p>{reason || 'We are facing some trouble completing your request at the moment. Please try again shortly.'}</p>
              </div>
            </div>

            {/* Common Reasons */}
            <div className="common-reasons">
              <h3>Common Reasons for Payment Failure:</h3>
              <ul>
                <li>🔒 Insufficient funds in your account</li>
                <li>💳 Card declined by bank</li>
                <li>🔐 Incorrect CVV or card details</li>
                <li>⏰ Payment session expired</li>
                <li>🌐 Network connectivity issues</li>
                <li>🏦 Bank authorization failed</li>
              </ul>
            </div>

            {/* What to Do Next */}
            <div className="next-steps">
              <h3>What Should You Do?</h3>
              <ul>
                <li>✅ Check your card details and balance</li>
                <li>✅ Try a different payment method</li>
                <li>✅ Contact your bank if issue persists</li>
                <li>✅ Retry the payment after a few minutes</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleRetryPayment}>
                Try Again
              </button>
              <button className="btn btn-secondary" onClick={handleContactSupport}>
                Contact Support
              </button>
            </div>

            {/* Additional Links */}
            <div className="additional-links">
              <button className="link-btn" onClick={handleViewBookings}>
                View My Bookings
              </button>
              <a href="/" className="link-btn">Back to Home</a>
            </div>

            {/* Help Section */}
            <div className="help-section">
              <p>Need help? Contact us at:</p>
              <div className="contact-info">
                <span>📧 support@skywings.com</span>
                <span>📞 +91 1800-123-4567</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  );
}
