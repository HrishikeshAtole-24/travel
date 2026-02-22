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
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [notification, setNotification] = useState(null);

  // Support both formats
  const bookingReference = searchParams.get('booking') || searchParams.get('booking_reference');
  const paymentId = searchParams.get('payment') || searchParams.get('payment_reference');

  useEffect(() => {
    if (bookingReference) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [bookingReference]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchBookingDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${baseUrl}/bookings/reference/${bookingReference}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      const data = await response.json();
      if (data.success) {
        setBookingDetails(data.booking);
        if (data.booking.emailSent) {
          setEmailSent(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!bookingReference) return;
    
    setDownloadingTicket(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${baseUrl}/bookings/${bookingReference}/ticket`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SkyWings-Ticket-${bookingReference}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showNotification('Ticket downloaded successfully!', 'success');
      } else {
        showNotification('Failed to download ticket. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Failed to download ticket:', error);
      showNotification('Failed to download ticket. Please try again.', 'error');
    } finally {
      setDownloadingTicket(false);
    }
  };

  const handleSendEmail = async () => {
    if (!bookingReference) return;
    
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${baseUrl}/bookings/${bookingReference}/send-confirmation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      const data = await response.json();
      if (data.success) {
        setEmailSent(true);
        showNotification('Confirmation email sent successfully!', 'success');
      } else {
        showNotification(data.message || 'Failed to send email.', 'error');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      showNotification('Failed to send email. Please try again.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    return duration.replace('PT', '').replace('H', 'h ').replace('M', 'm');
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="payment-success-page">
          <div className="container">
            <div className="loading-state">
              <div className="loader-spinner"></div>
              <p>Loading your booking details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const flightData = bookingDetails?.flightData;
  const outboundFlight = flightData?.itineraries?.[0]?.segments?.[0];

  return (
    <>
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
      />
      <Header />
      <main className="payment-success-page">
        <div className="container">
          {/* Notification Toast */}
          {notification && (
            <div className={`notification-toast ${notification.type}`}>
              <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              <span>{notification.message}</span>
            </div>
          )}

          {/* Success Hero */}
          <div className="success-hero">
            <div className="success-animation">
              <div className="success-circle">
                <i className="fas fa-check"></i>
              </div>
              <div className="success-pulse"></div>
            </div>
            <h1>Payment Successful!</h1>
            <p>Your flight booking has been confirmed</p>
          </div>

          {/* Main Content */}
          <div className="success-grid">
            {/* Left Column - Booking Info */}
            <div className="booking-column">
              {/* Booking Reference Card */}
              <div className="booking-card reference-card">
                <div className="card-header">
                  <div className="brand-mark">
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                      <path d="M16 2L3 9L16 16L29 9L16 2Z" fill="#2563eb"/>
                      <path d="M3 23L16 30L29 23V9L16 16L3 9V23Z" fill="#2563eb" opacity="0.6"/>
                    </svg>
                    <span>SkyWings</span>
                  </div>
                  <div className="confirmed-badge">
                    <i className="fas fa-check"></i>
                    <span>Confirmed</span>
                  </div>
                </div>
                
                <div className="reference-content">
                  <span className="ref-label">BOOKING REFERENCE</span>
                  <span className="ref-number">{bookingReference || 'N/A'}</span>
                  <span className="ref-hint">
                    <i className="fas fa-info-circle"></i>
                    Save this for check-in & support
                  </span>
                </div>

                {paymentId && (
                  <div className="payment-info">
                    <span className="payment-label">Payment ID</span>
                    <span className="payment-id">{paymentId}</span>
                  </div>
                )}
              </div>

              {/* Flight Details */}
              {bookingDetails && flightData && outboundFlight && (
                <div className="booking-card flight-card">
                  <div className="card-title">
                    <i className="fas fa-plane"></i>
                    <span>Flight Details</span>
                  </div>

                  <div className="flight-route">
                    <div className="route-point departure">
                      <span className="iata">{outboundFlight.departure?.iataCode || flightData.origin}</span>
                      <span className="time">{formatTime(outboundFlight.departure?.at)}</span>
                      <span className="date">{formatDate(outboundFlight.departure?.at)}</span>
                    </div>

                    <div className="route-line">
                      <div className="line-progress">
                        <span className="dot start"></span>
                        <span className="dash"></span>
                        <i className="fas fa-plane"></i>
                        <span className="dash"></span>
                        <span className="dot end"></span>
                      </div>
                      <span className="duration">{formatDuration(outboundFlight.duration) || 'Direct'}</span>
                    </div>

                    <div className="route-point arrival">
                      <span className="iata">{outboundFlight.arrival?.iataCode || flightData.destination}</span>
                      <span className="time">{formatTime(outboundFlight.arrival?.at)}</span>
                      <span className="date">{formatDate(outboundFlight.arrival?.at)}</span>
                    </div>
                  </div>

                  <div className="flight-meta">
                    {outboundFlight.carrierCode && (
                      <div className="meta-item">
                        <i className="fas fa-plane-departure"></i>
                        <span>{outboundFlight.carrierCode} {outboundFlight.number}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <i className="fas fa-users"></i>
                      <span>{bookingDetails.travelers?.length || 1} Passenger(s)</span>
                    </div>
                    {outboundFlight.cabin && (
                      <div className="meta-item">
                        <i className="fas fa-couch"></i>
                        <span>{outboundFlight.cabin}</span>
                      </div>
                    )}
                  </div>

                  <div className="price-summary">
                    <span className="price-label">Total Amount Paid</span>
                    <span className="price-value">
                      {bookingDetails.currency} {bookingDetails.totalPrice?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Passengers */}
              {bookingDetails?.travelers && bookingDetails.travelers.length > 0 && (
                <div className="booking-card passengers-card">
                  <div className="card-title">
                    <i className="fas fa-user-friends"></i>
                    <span>Passengers ({bookingDetails.travelers.length})</span>
                  </div>
                  <div className="passengers-list">
                    {bookingDetails.travelers.map((traveler, index) => (
                      <div key={index} className="passenger-row">
                        <div className="passenger-avatar">
                          <i className="fas fa-user"></i>
                        </div>
                        <div className="passenger-info">
                          <span className="passenger-name">
                            {traveler.title} {traveler.first_name} {traveler.last_name}
                          </span>
                          <span className="passenger-type">
                            <i className="fas fa-tag"></i>
                            {traveler.traveler_type || 'Adult'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions */}
            <div className="actions-column">
              {/* Quick Actions */}
              <div className="actions-card">
                <h3>
                  <i className="fas fa-bolt"></i>
                  Quick Actions
                </h3>

                <button 
                  className="action-btn primary"
                  onClick={handleDownloadTicket}
                  disabled={downloadingTicket}
                >
                  {downloadingTicket ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download"></i>
                      <span>Download E-Ticket</span>
                    </>
                  )}
                </button>

                <button 
                  className={`action-btn ${emailSent ? 'completed' : 'secondary'}`}
                  onClick={handleSendEmail}
                  disabled={sendingEmail || emailSent}
                >
                  {sendingEmail ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Sending...</span>
                    </>
                  ) : emailSent ? (
                    <>
                      <i className="fas fa-check"></i>
                      <span>Email Sent</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-envelope"></i>
                      <span>Send Confirmation Email</span>
                    </>
                  )}
                </button>

                <button 
                  className="action-btn outline"
                  onClick={() => router.push('/my-bookings')}
                >
                  <i className="fas fa-list-alt"></i>
                  <span>View My Bookings</span>
                </button>
              </div>

              {/* What's Next */}
              <div className="whats-next-card">
                <h3>
                  <i className="fas fa-clipboard-list"></i>
                  What's Next?
                </h3>

                <div className="steps-list">
                  <div className={`step-item ${emailSent ? 'done' : ''}`}>
                    <div className="step-icon">
                      <i className={emailSent ? 'fas fa-check' : 'fas fa-envelope'}></i>
                    </div>
                    <div className="step-content">
                      <span className="step-title">Confirmation Email</span>
                      <span className="step-desc">
                        {emailSent ? 'Sent to your email' : 'Get booking details via email'}
                      </span>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-icon">
                      <i className="fas fa-ticket-alt"></i>
                    </div>
                    <div className="step-content">
                      <span className="step-title">E-Ticket</span>
                      <span className="step-desc">Download your boarding pass</span>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-icon">
                      <i className="fas fa-desktop"></i>
                    </div>
                    <div className="step-content">
                      <span className="step-title">Web Check-in</span>
                      <span className="step-desc">Opens 48h before departure</span>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-icon">
                      <i className="fas fa-suitcase-rolling"></i>
                    </div>
                    <div className="step-content">
                      <span className="step-title">Pack & Travel</span>
                      <span className="step-desc">Have a great flight!</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="support-card">
                <i className="fas fa-headset"></i>
                <div className="support-content">
                  <span className="support-title">Need Help?</span>
                  <span className="support-desc">Our support team is available 24/7</span>
                </div>
                <a href="/contact" className="support-link">
                  Contact Us
                  <i className="fas fa-arrow-right"></i>
                </a>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <a href="/" className="back-link">
            <i className="fas fa-arrow-left"></i>
            <span>Back to Home</span>
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="payment-success-page">
        <div className="container">
          <div className="loading-state">
            <div className="loader-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
