'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import './my-bookings.css';

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const token = apiClient.getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/bookings/my-bookings');
      
      if (response.success && response.data) {
        setBookings(response.data.bookings || []);
      } else if (response.success && response.bookings) {
        setBookings(response.bookings || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch bookings');
      console.error('Fetch bookings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
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

  const getFlightInfo = (booking) => {
    if (booking.flightData) {
      const flightData = typeof booking.flightData === 'string' 
        ? JSON.parse(booking.flightData) 
        : booking.flightData;
      
      const segment = flightData.segments?.[0] || {};
      return {
        origin: segment.departure?.airport || flightData.origin || 'N/A',
        destination: segment.arrival?.airport || flightData.destination || 'N/A',
        departureTime: segment.departure?.time || flightData.departureTime,
        arrivalTime: segment.arrival?.time || flightData.arrivalTime,
        departureDate: flightData.departureDate,
        airline: segment.airlineName || flightData.airline || 'Airline',
        airlineCode: segment.airlineCode || flightData.airline || 'XX',
        flightNumber: segment.flightNumber || flightData.flightNumber || '--',
        duration: segment.duration,
        stops: flightData.stops
      };
    }
    return {
      origin: 'N/A',
      destination: 'N/A',
      airline: 'Flight',
      airlineCode: 'XX',
      flightNumber: '--'
    };
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') return ['confirmed', 'pending', 'payment_initiated'].includes(booking.status);
    if (activeTab === 'completed') return booking.status === 'completed';
    if (activeTab === 'cancelled') return booking.status === 'cancelled';
    return true;
  });

  const handleViewDetails = (bookingId) => {
    router.push(`/booking/details/${bookingId}`);
  };

  const tabs = [
    { id: 'all', label: 'All Bookings', icon: 'fa-list' },
    { id: 'upcoming', label: 'Upcoming', icon: 'fa-plane-departure' },
    { id: 'completed', label: 'Completed', icon: 'fa-circle-check' },
    { id: 'cancelled', label: 'Cancelled', icon: 'fa-ban' }
  ];

  return (
    <>
      <Header />
      <main className="my-bookings-page">
        <div className="container">
          {/* Page Header */}
          <div className="page-header-section">
            <div className="page-header-content">
              <h1><i className="fas fa-ticket"></i> My Bookings</h1>
              <p>Manage and track all your flight bookings in one place</p>
            </div>
            <button 
              className="btn btn-primary btn-book-new"
              onClick={() => router.push('/')}
            >
              <i className="fas fa-plane"></i> Book New Flight
            </button>
          </div>

          {/* Tabs */}
          <div className="booking-tabs-container">
            <div className="booking-tabs">
              {tabs.map(tab => {
                const count = tab.id === 'all' 
                  ? bookings.length 
                  : bookings.filter(b => {
                      if (tab.id === 'upcoming') return ['confirmed', 'pending', 'payment_initiated'].includes(b.status);
                      if (tab.id === 'completed') return b.status === 'completed';
                      if (tab.id === 'cancelled') return b.status === 'cancelled';
                      return false;
                    }).length;
                
                return (
                  <button 
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <i className={`fas ${tab.icon}`}></i>
                    <span className="tab-label">{tab.label}</span>
                    <span className="tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="state-container loading-state">
              <div className="state-icon">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <h3>Loading your bookings...</h3>
              <p>Please wait while we fetch your travel history</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="state-container error-state">
              <div className="state-icon error">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchBookings}>
                <i className="fas fa-redo"></i> Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredBookings.length === 0 && (
            <div className="state-container empty-state">
              <div className="state-icon empty">
                <i className="fas fa-suitcase-rolling"></i>
              </div>
              <h3>{activeTab === 'all' ? 'No bookings yet' : `No ${activeTab} bookings`}</h3>
              <p>
                {activeTab === 'all' 
                  ? 'Your travel journey starts here. Search and book your first flight!' 
                  : 'Check other tabs or book a new flight to get started.'}
              </p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => router.push('/')}
              >
                <i className="fas fa-search"></i> Search Flights
              </button>
            </div>
          )}

          {/* Bookings List */}
          {!loading && !error && filteredBookings.length > 0 && (
            <div className="bookings-grid">
              {filteredBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);
                const flightInfo = getFlightInfo(booking);
                
                return (
                  <div key={booking.id} className="booking-card">
                    {/* Card Header */}
                    <div className="booking-card-header">
                      <div className="booking-ref">
                        <span className="ref-label">
                          <i className="fas fa-hashtag"></i> Booking Reference
                        </span>
                        <span className="ref-value">{booking.bookingReference}</span>
                      </div>
                      <span className={`status-badge ${statusInfo.class}`}>
                        <i className={`fas ${statusInfo.icon}`}></i>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Flight Info */}
                    <div className="booking-card-body">
                      <div className="flight-route-info">
                        <div className="airline-badge">
                          <div className="airline-logo">
                            <i className="fas fa-plane"></i>
                          </div>
                          <div className="airline-details">
                            <span className="airline-name">{flightInfo.airline}</span>
                            <span className="flight-number">
                              <i className="fas fa-hashtag"></i> {flightInfo.flightNumber}
                            </span>
                          </div>
                        </div>

                        <div className="route-visual">
                          <div className="route-endpoint">
                            <span className="airport-code">{flightInfo.origin}</span>
                            {flightInfo.departureTime && (
                              <span className="time">{flightInfo.departureTime}</span>
                            )}
                            {flightInfo.departureDate && (
                              <span className="date">{formatDate(flightInfo.departureDate)}</span>
                            )}
                          </div>
                          
                          <div className="route-connector">
                            <div className="connector-line">
                              <i className="fas fa-plane"></i>
                            </div>
                            {flightInfo.stops !== undefined && (
                              <span className="stops-info">
                                {flightInfo.stops === 0 ? 'Non-stop' : `${flightInfo.stops} Stop`}
                              </span>
                            )}
                          </div>
                          
                          <div className="route-endpoint">
                            <span className="airport-code">{flightInfo.destination}</span>
                            {flightInfo.arrivalTime && (
                              <span className="time">{flightInfo.arrivalTime}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Booking Details Grid */}
                      <div className="booking-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">
                            <i className="fas fa-calendar"></i> Booked On
                          </span>
                          <span className="detail-value">{formatDate(booking.createdAt)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <i className="fas fa-indian-rupee-sign"></i> Total Amount
                          </span>
                          <span className="detail-value price">
                            {formatCurrency(booking.totalPrice, booking.currency)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <i className="fas fa-barcode"></i> PNR
                          </span>
                          <span className="detail-value pnr">{booking.pnr || 'Pending'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <i className="fas fa-envelope"></i> Contact
                          </span>
                          <span className="detail-value email">{booking.contactEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="booking-card-footer">
                      <button 
                        className="btn btn-outline"
                        onClick={() => handleViewDetails(booking.id)}
                      >
                        <i className="fas fa-eye"></i> View Details
                      </button>
                      {booking.status === 'confirmed' && (
                        <button className="btn btn-ghost">
                          <i className="fas fa-download"></i> E-Ticket
                        </button>
                      )}
                      {booking.status === 'payment_initiated' && (
                        <button 
                          className="btn btn-primary"
                          onClick={() => router.push(`/payment?bookingId=${booking.id}`)}
                        >
                          <i className="fas fa-credit-card"></i> Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Stats */}
          {!loading && !error && bookings.length > 0 && (
            <div className="bookings-summary">
              <div className="summary-item">
                <i className="fas fa-plane-departure"></i>
                <span className="summary-value">{bookings.length}</span>
                <span className="summary-label">Total Bookings</span>
              </div>
              <div className="summary-item">
                <i className="fas fa-circle-check"></i>
                <span className="summary-value">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </span>
                <span className="summary-label">Confirmed</span>
              </div>
              <div className="summary-item">
                <i className="fas fa-indian-rupee-sign"></i>
                <span className="summary-value">
                  {formatCurrency(bookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0))}
                </span>
                <span className="summary-label">Total Spent</span>
              </div>
            </div>
          )}

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
