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
      confirmed: { label: 'Confirmed', class: 'status-confirmed', icon: '✓' },
      pending: { label: 'Pending', class: 'status-pending', icon: '⏳' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled', icon: '✕' },
      completed: { label: 'Completed', class: 'status-completed', icon: '✓' },
      payment_initiated: { label: 'Payment Pending', class: 'status-payment', icon: '💳' }
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
    // Try to extract flight info from flightData if available
    if (booking.flightData) {
      const flightData = typeof booking.flightData === 'string' 
        ? JSON.parse(booking.flightData) 
        : booking.flightData;
      
      const segment = flightData.segments?.[0] || {};
      return {
        origin: segment.departure?.airport || flightData.origin || 'N/A',
        destination: segment.arrival?.airport || flightData.destination || 'N/A',
        departureTime: segment.departure?.time,
        arrivalTime: segment.arrival?.time,
        airline: segment.airlineName || flightData.airline || 'Airline',
        airlineCode: segment.airlineCode || 'XX',
        flightNumber: segment.flightNumber || '--',
        duration: segment.duration
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

  return (
    <>
      <Header />
      <main className="my-bookings-page">
        <div className="container">
          {/* Page Header */}
          <div className="page-header">
            <div className="header-content">
              <h1>My Bookings</h1>
              <p className="header-subtitle">Manage and track all your flight bookings</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => router.push('/')}
            >
              <span>✈️</span> Book New Flight
            </button>
          </div>

          {/* Tabs */}
          <div className="booking-tabs">
            <button 
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Bookings
              <span className="tab-count">{bookings.length}</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
              <span className="tab-count">
                {bookings.filter(b => ['confirmed', 'pending', 'payment_initiated'].includes(b.status)).length}
              </span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
              <span className="tab-count">
                {bookings.filter(b => b.status === 'completed').length}
              </span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
              onClick={() => setActiveTab('cancelled')}
            >
              Cancelled
              <span className="tab-count">
                {bookings.filter(b => b.status === 'cancelled').length}
              </span>
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your bookings...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchBookings}>
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredBookings.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✈️</div>
              <h2>{activeTab === 'all' ? 'No bookings yet' : `No ${activeTab} bookings`}</h2>
              <p>
                {activeTab === 'all' 
                  ? 'Start exploring and book your first flight!' 
                  : 'Check other tabs or book a new flight.'}
              </p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => router.push('/')}
              >
                Search Flights
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
                        <span className="ref-label">Booking Reference</span>
                        <span className="ref-value">{booking.bookingReference}</span>
                      </div>
                      <span className={`status-badge ${statusInfo.class}`}>
                        <span className="status-icon">{statusInfo.icon}</span>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Flight Info */}
                    <div className="booking-card-body">
                      <div className="flight-route-info">
                        <div className="airline-badge">
                          <div className="airline-logo">{flightInfo.airlineCode}</div>
                          <div className="airline-details">
                            <span className="airline-name">{flightInfo.airline}</span>
                            <span className="flight-number">{flightInfo.flightNumber}</span>
                          </div>
                        </div>

                        <div className="route-visual">
                          <div className="route-endpoint">
                            <span className="airport-code">{flightInfo.origin}</span>
                            {flightInfo.departureTime && (
                              <span className="time">{formatTime(flightInfo.departureTime)}</span>
                            )}
                          </div>
                          
                          <div className="route-connector">
                            <div className="connector-line">
                              <div className="plane-icon">✈</div>
                            </div>
                          </div>
                          
                          <div className="route-endpoint">
                            <span className="airport-code">{flightInfo.destination}</span>
                            {flightInfo.arrivalTime && (
                              <span className="time">{formatTime(flightInfo.arrivalTime)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Booking Details Grid */}
                      <div className="booking-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Booked On</span>
                          <span className="detail-value">{formatDate(booking.createdAt)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Total Amount</span>
                          <span className="detail-value price">
                            {formatCurrency(booking.totalPrice, booking.currency)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">PNR</span>
                          <span className="detail-value">{booking.pnr || 'Pending'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Contact</span>
                          <span className="detail-value email">{booking.contactEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="booking-card-footer">
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleViewDetails(booking.id)}
                      >
                        View Details
                      </button>
                      {booking.status === 'confirmed' && (
                        <button className="btn btn-ghost btn-sm">
                          <span>📄</span> Download E-Ticket
                        </button>
                      )}
                      {booking.status === 'payment_initiated' && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => router.push(`/payment?bookingId=${booking.id}`)}
                        >
                          Complete Payment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
