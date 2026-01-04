'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import './booking-details.css';

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/bookings/${bookingId}`);
      
      if (response.success && response.data?.booking) {
        setBooking(response.data.booking);
      } else {
        setError('Booking not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch booking details');
      console.error('Fetch booking error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    // If it's already in HH:MM format
    if (timeString.includes(':') && timeString.length <= 5) {
      return timeString;
    }
    // If it's a full date string
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      confirmed: { label: 'Confirmed', class: 'status-confirmed', icon: 'fa-circle-check' },
      pending: { label: 'Pending', class: 'status-pending', icon: 'fa-clock' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled', icon: 'fa-circle-xmark' },
      completed: { label: 'Completed', class: 'status-completed', icon: 'fa-check-double' },
      payment_initiated: { label: 'Payment Pending', class: 'status-payment', icon: 'fa-credit-card' }
    };
    return statusMap[status?.toLowerCase()] || statusMap.pending;
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (!amount) return '₹0';
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || '₹';
    return `${symbol}${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  const getPaymentStatusInfo = (status) => {
    const statusMap = {
      SUCCESS: { label: 'Paid', class: 'payment-success', icon: 'fa-circle-check' },
      PENDING: { label: 'Pending', class: 'payment-pending', icon: 'fa-clock' },
      FAILED: { label: 'Failed', class: 'payment-failed', icon: 'fa-circle-xmark' },
      REFUNDED: { label: 'Refunded', class: 'payment-refunded', icon: 'fa-rotate-left' }
    };
    return statusMap[status?.toUpperCase()] || { label: status, class: 'payment-pending', icon: 'fa-clock' };
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="booking-details-page">
          <div className="container">
            <div className="state-container">
              <div className="state-icon">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <h3>Loading booking details...</h3>
              <p>Please wait while we fetch your booking information</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !booking) {
    return (
      <>
        <Header />
        <main className="booking-details-page">
          <div className="container">
            <div className="state-container error">
              <div className="state-icon error">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3>Booking Not Found</h3>
              <p>{error || 'Unable to load booking details'}</p>
              <button className="btn btn-primary" onClick={() => router.push('/my-bookings')}>
                <i className="fas fa-arrow-left"></i> Back to My Bookings
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const statusInfo = getStatusInfo(booking.status);
  const flightData = booking.flightData || {};

  return (
    <>
      <Header />
      <main className="booking-details-page">
        <div className="container">
          {/* Back Button */}
          <button className="back-btn" onClick={() => router.push('/my-bookings')}>
            <i className="fas fa-arrow-left"></i> Back to My Bookings
          </button>

          {/* Page Header */}
          <div className="details-header">
            <div className="header-left">
              <h1><i className="fas fa-ticket"></i> Booking Details</h1>
              <div className="booking-ref-large">
                <span className="ref-label"><i className="fas fa-hashtag"></i> Booking Reference</span>
                <span className="ref-value">{booking.bookingReference}</span>
              </div>
            </div>
            <div className="header-right">
              <span className={`status-badge-large ${statusInfo.class}`}>
                <i className={`fas ${statusInfo.icon}`}></i>
                {statusInfo.label}
              </span>
            </div>
          </div>

          <div className="details-grid">
            {/* Flight Information Card */}
            <div className="details-card flight-card">
              <div className="card-header">
                <h2><i className="fas fa-plane"></i> Flight Information</h2>
              </div>
              <div className="card-body">
                <div className="flight-visual">
                  <div className="airline-info-large">
                    <div className="airline-logo-large">
                      <i className="fas fa-plane"></i>
                    </div>
                    <div className="airline-text">
                      <span className="airline-name">{flightData.airline || 'Airline'}</span>
                      <span className="flight-number">
                        <i className="fas fa-hashtag"></i> Flight {flightData.flightNumber || '--'}
                      </span>
                    </div>
                  </div>

                  <div className="route-display">
                    <div className="route-city">
                      <span className="city-code">{flightData.origin || 'N/A'}</span>
                      <span className="city-time">{formatTime(flightData.departureTime)}</span>
                      <span className="city-date">{formatDate(flightData.departureDate)}</span>
                    </div>

                    <div className="route-line-container">
                      <div className="route-stops-info">
                        <i className="fas fa-clock"></i>
                        {flightData.stops === 0 ? 'Non-stop' : `${flightData.stops} Stop(s)`}
                      </div>
                      <div className="route-line-visual">
                        <div className="route-dot start"></div>
                        <div className="route-line"></div>
                        <div className="plane-on-route"><i className="fas fa-plane"></i></div>
                        <div className="route-line"></div>
                        <div className="route-dot end"></div>
                      </div>
                    </div>

                    <div className="route-city">
                      <span className="city-code">{flightData.destination || 'N/A'}</span>
                      <span className="city-time">{formatTime(flightData.arrivalTime)}</span>
                      <span className="city-date">{formatDate(flightData.arrivalDate)}</span>
                    </div>
                  </div>

                  <div className="flight-meta">
                    <div className="meta-item">
                      <i className="fas fa-couch"></i>
                      <span className="meta-label">Cabin Class</span>
                      <span className="meta-value">{flightData.cabin || 'Economy'}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-barcode"></i>
                      <span className="meta-label">Flight ID</span>
                      <span className="meta-value">{flightData.flightId || '--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Traveler Information Card */}
            <div className="details-card travelers-card">
              <div className="card-header">
                <h2><i className="fas fa-users"></i> Traveler Information</h2>
                <span className="traveler-count">
                  <i className="fas fa-user"></i> {booking.travelers?.length || 0} Traveler(s)
                </span>
              </div>
              <div className="card-body">
                {booking.travelers?.map((traveler, index) => (
                  <div key={traveler.id || index} className="traveler-item">
                    <div className="traveler-header">
                      <span className="traveler-number">
                        <i className="fas fa-user-circle"></i> Traveler {index + 1}
                      </span>
                      <span className="traveler-type">{traveler.traveler_type || 'Adult'}</span>
                    </div>
                    <div className="traveler-details">
                      <div className="traveler-name">
                        {traveler.title && `${traveler.title} `}
                        {traveler.first_name} {traveler.last_name}
                      </div>
                      <div className="traveler-info-grid">
                        <div className="info-item">
                          <i className="fas fa-calendar"></i>
                          <span className="info-label">Date of Birth</span>
                          <span className="info-value">{formatDate(traveler.date_of_birth)}</span>
                        </div>
                        <div className="info-item">
                          <i className="fas fa-venus-mars"></i>
                          <span className="info-label">Gender</span>
                          <span className="info-value capitalize">{traveler.gender || '--'}</span>
                        </div>
                        <div className="info-item">
                          <i className="fas fa-globe"></i>
                          <span className="info-label">Nationality</span>
                          <span className="info-value">{traveler.nationality || '--'}</span>
                        </div>
                        <div className="info-item">
                          <i className="fas fa-passport"></i>
                          <span className="info-label">Passport No.</span>
                          <span className="info-value">{traveler.passport_number || '--'}</span>
                        </div>
                        <div className="info-item">
                          <i className="fas fa-calendar-xmark"></i>
                          <span className="info-label">Passport Expiry</span>
                          <span className="info-value">{formatDate(traveler.passport_expiry)}</span>
                        </div>
                        <div className="info-item">
                          <i className="fas fa-envelope"></i>
                          <span className="info-label">Email</span>
                          <span className="info-value email">{traveler.email || '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Information Card */}
            <div className="details-card payment-card">
              <div className="card-header">
                <h2><i className="fas fa-credit-card"></i> Payment Information</h2>
              </div>
              <div className="card-body">
                <div className="payment-summary">
                  <div className="total-amount">
                    <span className="amount-label"><i className="fas fa-indian-rupee-sign"></i> Total Amount</span>
                    <span className="amount-value">{formatCurrency(booking.totalPrice, booking.currency)}</span>
                  </div>
                </div>

                {booking.payments && booking.payments.length > 0 ? (
                  <div className="payments-list">
                    <h3><i className="fas fa-history"></i> Payment History</h3>
                    {booking.payments.map((payment, index) => {
                      const paymentStatus = getPaymentStatusInfo(payment.status);
                      return (
                        <div key={index} className="payment-item">
                          <div className="payment-item-header">
                            <span className="payment-ref">
                              <i className="fas fa-receipt"></i> {payment.payment_reference}
                            </span>
                            <span className={`payment-status ${paymentStatus.class}`}>
                              <i className={`fas ${paymentStatus.icon}`}></i> {paymentStatus.label}
                            </span>
                          </div>
                          <div className="payment-item-details">
                            <span className="payment-amount">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                            <span className="payment-date">
                              <i className="fas fa-calendar"></i> {formatDate(payment.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-payments">
                    <i className="fas fa-credit-card"></i>
                    <p>No payment records found</p>
                    {booking.status === 'payment_initiated' && (
                      <button 
                        className="btn btn-primary"
                        onClick={() => router.push(`/payment?bookingId=${booking.id}`)}
                      >
                        <i className="fas fa-lock"></i> Complete Payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact & Booking Info Card */}
            <div className="details-card contact-card">
              <div className="card-header">
                <h2><i className="fas fa-info-circle"></i> Booking Information</h2>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <i className="fas fa-envelope"></i>
                    <span className="info-label">Contact Email</span>
                    <span className="info-value">{booking.contactEmail}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-phone"></i>
                    <span className="info-label">Contact Phone</span>
                    <span className="info-value">{booking.contactPhone}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-barcode"></i>
                    <span className="info-label">PNR</span>
                    <span className="info-value pnr">{booking.pnr || 'Pending'}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-ticket"></i>
                    <span className="info-label">Ticket Number</span>
                    <span className="info-value">{booking.ticketNumber || 'Pending'}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-calendar-plus"></i>
                    <span className="info-label">Booked On</span>
                    <span className="info-value">{formatDate(booking.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-calendar-check"></i>
                    <span className="info-label">Last Updated</span>
                    <span className="info-value">{formatDate(booking.updatedAt)}</span>
                  </div>
                </div>

                {booking.specialRequests && (
                  <div className="special-requests">
                    <span className="info-label"><i className="fas fa-comment"></i> Special Requests</span>
                    <p className="requests-text">{booking.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="details-actions">
            {booking.status === 'confirmed' && (
              <>
                <button className="btn btn-primary btn-action">
                  <i className="fas fa-download"></i> Download E-Ticket
                </button>
                <button className="btn btn-outline btn-action">
                  <i className="fas fa-envelope"></i> Email Ticket
                </button>
              </>
            )}
            {booking.status === 'payment_initiated' && (
              <button 
                className="btn btn-primary btn-action"
                onClick={() => router.push(`/payment?bookingId=${booking.id}`)}
              >
                <i className="fas fa-lock"></i> Complete Payment
              </button>
            )}
            <button className="btn btn-ghost btn-action" onClick={() => window.print()}>
              <i className="fas fa-print"></i> Print Details
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="trust-section">
            <div className="trust-item">
              <i className="fas fa-shield-halved"></i>
              <span>Secure Booking</span>
            </div>
            <div className="trust-item">
              <i className="fas fa-headset"></i>
              <span>24/7 Support</span>
            </div>
            <div className="trust-item">
              <i className="fas fa-certificate"></i>
              <span>IATA Accredited</span>
            </div>
            <div className="trust-item">
              <i className="fas fa-rotate-left"></i>
              <span>Easy Cancellation</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
