'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import './payment-success.css';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookingDetails, setBookingDetails] = useState(null);

  const paymentReference = searchParams.get('payment_reference');
  const bookingReference = searchParams.get('booking_reference');
  const status = searchParams.get('status');

  useEffect(() => {
    // If we have booking reference, try to fetch booking details
    if (bookingReference) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [bookingReference]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/reference/${bookingReference}`);
      const data = await response.json();
      if (data.success) {
        setBookingDetails(data.booking);
      }
    } catch (error) {
      console.error('Failed to fetch booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = () => {
    alert('Download ticket feature coming soon!');
  };

  const handleViewBooking = () => {
    router.push('/my-bookings');
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="payment-success-page">
          <div className="container">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="payment-success-page">
        <div className="container">
          <div className="success-card">
            {/* Success Icon */}
            <div className="success-icon">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#22c55e" />
                <path d="M30 50 L45 65 L70 35" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Success Message */}
            <h1>Payment Successful!</h1>
            <p className="success-subtitle">Your flight booking has been confirmed</p>

            {/* Booking Reference */}
            <div className="reference-box">
              <span className="reference-label">Booking Reference</span>
              <span className="reference-value">{bookingReference || 'N/A'}</span>
            </div>

            {/* Payment Reference */}
            {paymentReference && (
              <div className="info-row">
                <span className="info-label">Payment Reference:</span>
                <span className="info-value">{paymentReference}</span>
              </div>
            )}

            {/* Booking Details */}
            {bookingDetails && (
              <div className="booking-summary">
                <h2>Booking Summary</h2>
                <div className="summary-content">
                  <div className="summary-row">
                    <span>Status:</span>
                    <span className="status-badge status-confirmed">{bookingDetails.status}</span>
                  </div>
                  <div className="summary-row">
                    <span>Total Amount:</span>
                    <span className="amount">{bookingDetails.currency} {bookingDetails.totalPrice}</span>
                  </div>
                  <div className="summary-row">
                    <span>Contact Email:</span>
                    <span>{bookingDetails.contactEmail}</span>
                  </div>
                  {bookingDetails.pnr && (
                    <div className="summary-row">
                      <span>PNR:</span>
                      <span>{bookingDetails.pnr}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="next-steps">
              <h3>What's Next?</h3>
              <ul>
                <li>📧 Confirmation email sent to your registered email</li>
                <li>📱 SMS confirmation sent to your phone number</li>
                <li>✈️ Check-in opens 48 hours before departure</li>
                <li>📄 Download your e-ticket from My Bookings</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleViewBooking}>
                View My Bookings
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadTicket}>
                Download Ticket
              </button>
            </div>

            {/* Home Link */}
            <a href="/" className="back-home">← Back to Home</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
