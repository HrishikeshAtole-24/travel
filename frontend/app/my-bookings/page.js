'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import Icon from '../components/Icon/Icon';
import { BookingListSkeleton, StateMessage } from '../components/Skeleton/Skeleton';
import './my-bookings.css';
import MyHotelBookings from './MyHotelBookings';

export default function MyBookingsPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [product, setProduct] = useState('flights'); // 'flights' | 'hotels'
  const [paymentLoading, setPaymentLoading] = useState(null);

  useEffect(() => {
    // Only fetch bookings when auth is ready and user is logged in
    if (!authLoading && isLoggedIn) {
      fetchBookings();
    }
  }, [authLoading, isLoggedIn]);

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

  const getStatusInfo = (status, isExpired = false) => {
    // Handle expired bookings
    if (isExpired || status === 'expired') {
      return { label: 'Expired', tone: 'neutral' };
    }
    
    const statusMap = {
      confirmed: { label: 'Confirmed', tone: 'success' },
      pending: { label: 'Payment pending', tone: 'warning' },
      cancelled: { label: 'Cancelled', tone: 'danger' },
      completed: { label: 'Completed', tone: 'neutral' },
      payment_initiated: { label: 'Payment pending', tone: 'warning' },
      expired: { label: 'Expired', tone: 'neutral' }
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
    if (activeTab === 'upcoming') return ['confirmed', 'pending', 'payment_initiated'].includes(booking.status) && !booking.isExpired;
    if (activeTab === 'completed') return booking.status === 'completed';
    if (activeTab === 'cancelled') return booking.status === 'cancelled' || booking.status === 'expired' || booking.isExpired;
    return true;
  });

  const handleViewDetails = (bookingId) => {
    router.push(`/booking/details/${bookingId}`);
  };

  const handlePayNow = async (booking) => {
    try {
      setPaymentLoading(booking.id);
      
      // Initiate payment via backend API
      const response = await apiClient.initiatePayment(booking.id, {
        customerEmail: booking.contactEmail,
        customerName: booking.travelers?.[0]?.firstName || 'Customer',
        customerPhone: booking.contactPhone
      });
      
      if (response.success && response.data?.checkoutUrl) {
        // Redirect to backend payment page
        window.location.href = response.data.checkoutUrl;
      } else {
        alert('Failed to initiate payment. Please try again.');
      }
    } catch (err) {
      console.error('Payment redirect error:', err);
      alert(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setPaymentLoading(null);
    }
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const countFor = (id) => id === 'all' ? bookings.length : bookings.filter(b => {
    if (id === 'upcoming') return ['confirmed', 'pending', 'payment_initiated'].includes(b.status) && !b.isExpired;
    if (id === 'completed') return b.status === 'completed';
    if (id === 'cancelled') return b.status === 'cancelled' || b.status === 'expired' || b.isExpired;
    return false;
  }).length;

  const signedOut = !authLoading && !isLoggedIn;

  return (
    <>
      <Header />
      <main className="trips-page">
        <div className="container">
          <div className="trips-head">
            <div>
              <h1>My trips</h1>
              <p>Every flight and stay booked with SkyWings, in one place.</p>
            </div>
            <div className="sw-segment" role="tablist" aria-label="Booking type">
              {[['flights', 'Flights', 'plane'], ['hotels', 'Hotels', 'hotel']].map(([id, label, icon]) => (
                <button key={id} role="tab" type="button" aria-pressed={product === id} aria-selected={product === id} onClick={() => setProduct(id)}>
                  <Icon name={icon} size={16} /> {label}
                </button>
              ))}
            </div>
          </div>

          {signedOut ? (
            <StateMessage icon="ticket" tone="brand" title="Sign in to see your trips"
              action={<><Link href="/auth/login" className="btn btn-primary">Sign in</Link><Link href="/auth/signup" className="btn btn-secondary">Create account</Link></>}>
              Bookings made while signed in show up here, with vouchers, PNRs and refund status.
            </StateMessage>
          ) : product === 'hotels' ? <MyHotelBookings /> : (
            <>
              <div className="trips-tabs" role="tablist" aria-label="Filter trips">
                {tabs.map(tab => (
                  <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id}
                    className={`trips-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                    {tab.label} <span className="trips-tab__count">{countFor(tab.id)}</span>
                  </button>
                ))}
              </div>

              {(loading || authLoading) && <BookingListSkeleton />}

              {error && !loading && (
                <StateMessage icon="alert" tone="danger" title="We couldn’t load your trips"
                  action={<button className="btn btn-primary" onClick={fetchBookings}>Try again</button>}>
                  {error}
                </StateMessage>
              )}

              {!loading && !authLoading && !error && filteredBookings.length === 0 && (
                <StateMessage icon="plane" tone="brand" title={activeTab === 'all' ? 'No flights booked yet' : `No ${activeTab} flights`}
                  action={<Link href="/" className="btn btn-primary"><Icon name="search" size={16} /> Search flights</Link>}>
                  {activeTab === 'all' ? 'Your next trip starts with a search.' : 'Check the other tabs, or book a new flight.'}
                </StateMessage>
              )}

              {!loading && !error && filteredBookings.length > 0 && (
                <div className="trips-list">
                  {filteredBookings.map((booking) => {
                    const statusInfo = getStatusInfo(booking.status, booking.isExpired);
                    const flightInfo = getFlightInfo(booking);
                    const canPay = ['pending', 'payment_initiated'].includes(booking.status) && !booking.isExpired && booking.status !== 'expired';
                    const expired = booking.isExpired || booking.status === 'expired';

                    return (
                      <article key={booking.id} className={`trip-card ${expired ? 'is-muted' : ''}`}>
                        <div className="trip-card__art">
                          <span className="trip-card__codes">{flightInfo.origin} <Icon name="plane" size={18} /> {flightInfo.destination}</span>
                          <small>{flightInfo.airline}</small>
                        </div>
                        <div className="trip-card__body">
                          <div className="trip-card__tags">
                            <span className={`sw-badge sw-badge--${statusInfo.tone}`}>{statusInfo.label}</span>
                            {booking.pnr && <span className="sw-supplier">PNR <strong>{booking.pnr}</strong></span>}
                          </div>
                          <h3>{flightInfo.origin} → {flightInfo.destination}</h3>
                          <p>{flightInfo.airline} {flightInfo.flightNumber !== '--' ? `· ${flightInfo.flightNumber}` : ''}{flightInfo.stops !== undefined ? ` · ${flightInfo.stops === 0 ? 'Non-stop' : `${flightInfo.stops} stop`}` : ''}</p>
                          <div className="trip-card__meta">
                            <span><Icon name="calendar" size={14} /> {flightInfo.departureDate ? formatDate(flightInfo.departureDate) : `Booked ${formatDate(booking.createdAt)}`}{flightInfo.departureTime ? ` · ${flightInfo.departureTime}` : ''}</span>
                            <span><Icon name="tag" size={14} /> {booking.bookingReference}</span>
                          </div>
                        </div>
                        <div className="trip-card__side">
                          <div className="trip-card__price">
                            <strong>{formatCurrency(booking.totalPrice, booking.currency)}</strong>
                            <small>{canPay ? 'due' : 'paid'}</small>
                          </div>
                          {canPay ? (
                            <button className="btn btn-accent btn-sm" onClick={() => handlePayNow(booking)} disabled={paymentLoading === booking.id}>
                              {paymentLoading === booking.id ? 'Opening…' : 'Complete payment'}
                            </button>
                          ) : expired ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>Book again</button>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleViewDetails(booking.id)}>View details</button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
