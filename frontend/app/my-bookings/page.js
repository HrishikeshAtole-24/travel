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
      const response = await apiClient.get('/bookings/my-bookings');
      
      if (response.success && response.data) {
        setBookings(response.data.bookings || []);
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

  const getStatusBadge = (status) => {
    const statusMap = {
      confirmed: { label: 'Confirmed', class: 'status-confirmed' },
      pending: { label: 'Pending', class: 'status-pending' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled' },
      completed: { label: 'Completed', class: 'status-completed' }
    };

    const statusInfo = statusMap[status?.toLowerCase()] || statusMap.pending;
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  return (
    <>
      <Header />
      <main className="my-bookings-page">
        <div className="container">
          <h1>My Bookings</h1>

          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your bookings...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <button className="btn btn-primary" onClick={fetchBookings}>
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && bookings.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✈️</div>
              <h2>No bookings yet</h2>
              <p>Start exploring and book your first flight!</p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => router.push('/')}
              >
                Search Flights
              </button>
            </div>
          )}

          {!loading && !error && bookings.length > 0 && (
            <div className="bookings-list">
              {bookings.map((booking, index) => (
                <div key={index} className="booking-card">
                  <div className="booking-header">
                    <div className="booking-reference">
                      <span className="ref-label">Booking Ref:</span>
                      <span className="ref-value">{booking.bookingReference || booking.id}</span>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="booking-content">
                    <div className="booking-route">
                      <div className="route-point">
                        <div className="route-code">{booking.origin || 'DEL'}</div>
                        <div className="route-date">{formatDate(booking.departureDate)}</div>
                      </div>
                      <div className="route-arrow">→</div>
                      <div className="route-point">
                        <div className="route-code">{booking.destination || 'BOM'}</div>
                        <div className="route-date">{formatDate(booking.returnDate)}</div>
                      </div>
                    </div>

                    <div className="booking-details">
                      <div className="detail-item">
                        <span>Passenger(s)</span>
                        <strong>{booking.passengers || 1}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Total Amount</span>
                        <strong>₹{booking.totalAmount?.toLocaleString() || '0'}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Booked On</span>
                        <strong>{formatDate(booking.createdAt)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="booking-actions">
                    <button className="btn btn-outline btn-sm">
                      View Details
                    </button>
                    <button className="btn btn-ghost btn-sm">
                      Download Ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
