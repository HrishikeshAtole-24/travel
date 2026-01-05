'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import './confirmation.css';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const bookingReference = searchParams.get('bookingReference') || bookingId;
  const paymentStatus = searchParams.get('status');
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingReference) {
      fetchBookingDetails();
    }
  }, [bookingReference]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBookingById(bookingReference);
      if (response.success && response.data?.booking) {
        setBooking(response.data.booking);
      }
    } catch (error) {
      console.error('Failed to fetch booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
    if (timeString.includes(':') && timeString.length <= 5) {
      return timeString;
    }
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (!amount) return '₹0';
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || '₹';
    return `${symbol}${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  const getFlightInfo = () => {
    if (!booking?.flightData) return null;
    const fd = booking.flightData;
    return {
      origin: fd.origin,
      destination: fd.destination,
      departureDate: fd.departureDate,
      departureTime: fd.departureTime,
      arrivalTime: fd.arrivalTime,
      airline: fd.airline,
      flightNumber: fd.flightNumber
    };
  };

  const flightInfo = getFlightInfo();

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
              Your flight has been successfully booked{paymentStatus === 'success' && ' and payment completed'}. 
              Confirmation details have been sent to your email.
            </p>

            <div className="booking-reference">
              <span className="reference-label">Booking Reference</span>
              <span className="reference-value">{bookingReference || 'Processing...'}</span>
            </div>

            {loading && (
              <div className="loading-details">
                <i className="fas fa-spinner fa-spin"></i> Loading booking details...
              </div>
            )}

            {!loading && booking && flightInfo && (
              <div className="booking-summary-card">
                <h3><i className="fas fa-plane"></i> Flight Details</h3>
                <div className="summary-route">
                  <div className="route-point">
                    <span className="airport-code">{flightInfo.origin}</span>
                    <span className="time">{formatTime(flightInfo.departureTime)}</span>
                    <span className="date">{formatDate(flightInfo.departureDate)}</span>
                  </div>
                  <div className="route-arrow">
                    <i className="fas fa-plane"></i>
                  </div>
                  <div className="route-point">
                    <span className="airport-code">{flightInfo.destination}</span>
                    <span className="time">{formatTime(flightInfo.arrivalTime)}</span>
                  </div>
                </div>
                <div className="summary-details">
                  <div className="detail-row">
                    <span className="label"><i className="fas fa-plane-departure"></i> Airline</span>
                    <span className="value">{flightInfo.airline} {flightInfo.flightNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label"><i className="fas fa-indian-rupee-sign"></i> Total Amount</span>
                    <span className="value price">{formatCurrency(booking.totalPrice, booking.currency)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label"><i className="fas fa-envelope"></i> Contact Email</span>
                    <span className="value">{booking.contactEmail}</span>
                  </div>
                  {booking.pnr && (
                    <div className="detail-row">
                      <span className="label"><i className="fas fa-barcode"></i> PNR</span>
                      <span className="value pnr">{booking.pnr}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="confirmation-actions">
              <Link href="/my-bookings" className="btn btn-primary btn-lg">
                <i className="fas fa-ticket"></i> View My Bookings
              </Link>
              <Link href="/" className="btn btn-outline btn-lg">
                <i className="fas fa-home"></i> Back to Home
              </Link>
            </div>

            <div className="confirmation-info">
              <div className="info-box">
                <h3><i className="fas fa-envelope"></i> Check Your Email</h3>
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
