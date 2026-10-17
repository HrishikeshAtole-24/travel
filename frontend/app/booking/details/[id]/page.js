'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import Icon from '../../../components/Icon/Icon';
import { PageSkeleton, StateMessage } from '../../../components/Skeleton/Skeleton';
import { CheckoutSection } from '../../../components/CheckoutSteps/CheckoutSteps';
import '../../../hotels/hotels.css';
import '../../booking.css';
import '../../../payment-success/payment-success.css';
import './booking-details.css';

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getBookingById(bookingId);
      
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

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    try {
      setCancelling(true);
      const response = await apiClient.cancelBooking(bookingId, cancelReason);
      
      if (response.success) {
        alert('Booking cancelled successfully');
        setShowCancelModal(false);
        fetchBookingDetails(); // Refresh booking data
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
      console.error('Cancel booking error:', err);
    } finally {
      setCancelling(false);
    }
  };

  const handleCompletePayment = async () => {
    try {
      setPaymentLoading(true);
      
      // Initiate payment via backend API
      const response = await apiClient.initiatePayment(bookingId, {
        customerEmail: booking?.contactEmail,
        customerName: booking?.travelers?.[0]?.firstName || 'Customer',
        customerPhone: booking?.contactPhone
      });
      
      if (response.success && response.data?.checkoutUrl) {
        // Redirect to backend payment page
        window.location.href = response.data.checkoutUrl;
      } else {
        alert('Failed to initiate payment. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusInfo = (status, isExpired = false) => {
    // Handle expired bookings
    if (isExpired || status === 'expired') {
      return { label: 'Expired', class: 'status-expired', icon: 'fa-clock-rotate-left' };
    }
    
    const statusMap = {
      confirmed: { label: 'Confirmed', class: 'status-confirmed', icon: 'fa-circle-check' },
      pending: { label: 'Payment Pending', class: 'status-payment', icon: 'fa-credit-card' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled', icon: 'fa-circle-xmark' },
      completed: { label: 'Completed', class: 'status-completed', icon: 'fa-check-double' },
      payment_initiated: { label: 'Payment Pending', class: 'status-payment', icon: 'fa-credit-card' },
      expired: { label: 'Expired', class: 'status-expired', icon: 'fa-clock-rotate-left' }
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
        <PageSkeleton label="Loading booking details…" />
      </>
    );
  }

  if (error || !booking) {
    return (
      <>
        <Header />
        <main className="bd-page">
          <div className="container">
            <StateMessage icon="alert" tone="danger" title="Booking not found"
              action={<button className="btn btn-primary" onClick={() => router.push('/my-bookings')}>Back to My trips</button>}>
              {error || 'Unable to load booking details.'}
            </StateMessage>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const statusInfo = getStatusInfo(booking.status, booking.isExpired);
  const flightData = booking.flightData || {};
  const canPay = ['pending', 'payment_initiated'].includes(booking.status) && !booking.isExpired && booking.status !== 'expired';
  const isExpired = booking.isExpired || booking.status === 'expired';
  const tone = (cls) => ({ 'status-confirmed': 'success', 'status-payment': 'warning', 'status-cancelled': 'danger', 'payment-success': 'success', 'payment-pending': 'warning', 'payment-failed': 'danger', 'payment-refunded': 'brand' }[cls] || 'neutral');

  const handleDownloadTicket = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${baseUrl}/bookings/${booking.bookingReference}/ticket`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Ticket not available yet');
      const url = window.URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `SkyWings-Ticket-${booking.bookingReference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Could not download the ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="bd-page">
        <div className="container">
          <button className="sw-link co-back" onClick={() => router.push('/my-bookings')}>
            <Icon name="chevron-left" size={16} /> My trips
          </button>

          <header className="bd-head">
            <div>
              <span className="sw-overline">Booking reference</span>
              <h1>{booking.bookingReference}</h1>
              <p>Booked {formatDate(booking.createdAt)}{booking.pnr ? ` · PNR ${booking.pnr}` : ''}</p>
            </div>
            <span className={`sw-badge sw-badge--${tone(statusInfo.class)} bd-status`}>{statusInfo.label}</span>
          </header>

          {isExpired && (
            <div className="hb-price-change bd-banner"><Icon name="info" size={16} /> This booking expired — seats are held for 30 minutes while payment is pending.</div>
          )}

          <div className="bd-layout">
            <div className="bd-main">
              <section className="co-section">
                <div className="bd-flight">
                  <div className="bd-flight__airline">
                    <span className="bd-logo"><Icon name="plane" size={20} /></span>
                    <span><strong>{flightData.airline || 'Airline'}</strong><small>Flight {flightData.flightNumber || '--'} · {flightData.cabin || 'Economy'}</small></span>
                  </div>
                  <div className="bk-flight__route bd-route">
                    <div><strong>{formatTime(flightData.departureTime)}</strong><small>{flightData.origin || '—'} · {formatDate(flightData.departureDate)}</small></div>
                    <div className="bk-flight__line"><small>{flightData.stops === 0 ? 'Non-stop' : flightData.stops ? `${flightData.stops} stop(s)` : ''}</small><span /></div>
                    <div><strong>{formatTime(flightData.arrivalTime)}</strong><small>{flightData.destination || '—'}{flightData.arrivalDate ? ` · ${formatDate(flightData.arrivalDate)}` : ''}</small></div>
                  </div>
                </div>
              </section>

              <CheckoutSection title="Travellers" subtitle={`${booking.travelers?.length || 0} on this booking`}>
                <div className="bd-travellers">
                  {booking.travelers?.map((t, i) => (
                    <div key={t.id || i} className="bd-traveller">
                      <span className="cf-avatar">{(t.first_name || '?')[0]}{(t.last_name || '')[0]}</span>
                      <div>
                        <strong>{t.title ? `${t.title} ` : ''}{t.first_name} {t.last_name}</strong>
                        <dl>
                          <div><dt>Type</dt><dd>{t.traveler_type || 'Adult'}</dd></div>
                          <div><dt>Born</dt><dd>{formatDate(t.date_of_birth)}</dd></div>
                          <div><dt>Nationality</dt><dd>{t.nationality || '—'}</dd></div>
                          {t.passport_number && <div><dt>Passport</dt><dd>{t.passport_number}</dd></div>}
                        </dl>
                      </div>
                    </div>
                  ))}
                </div>
              </CheckoutSection>

              <CheckoutSection title="Contact">
                <dl className="bd-facts">
                  <div><dt>Email</dt><dd>{booking.contactEmail}</dd></div>
                  <div><dt>Phone</dt><dd>{booking.contactPhone || '—'}</dd></div>
                  <div><dt>Ticket number</dt><dd>{booking.ticketNumber || 'Pending'}</dd></div>
                  <div><dt>Last updated</dt><dd>{formatDate(booking.updatedAt)}</dd></div>
                </dl>
                {booking.specialRequests && <p className="bd-requests"><strong>Special requests:</strong> {booking.specialRequests}</p>}
              </CheckoutSection>
            </div>

            <aside className="hb-summary">
              <div className="hb-card hb-price">
                <h3>Payment</h3>
                <div className="hb-row total"><span>Total</span><span>{formatCurrency(booking.totalPrice, booking.currency)}</span></div>
                {booking.payments?.length > 0 ? booking.payments.map((p, i) => {
                  const ps = getPaymentStatusInfo(p.status);
                  return (
                    <div key={i} className="bd-payment">
                      <span><strong>{formatCurrency(p.amount, p.currency)}</strong><small>{p.payment_reference} · {formatDate(p.created_at)}</small></span>
                      <span className={`sw-badge sw-badge--${tone(ps.class)}`}>{ps.label}</span>
                    </div>
                  );
                }) : <p className="hd-muted">No payment recorded yet.</p>}
              </div>

              <div className="hb-card bd-actions">
                {booking.status === 'confirmed' && (
                  <button className="btn btn-primary btn-block" onClick={handleDownloadTicket} disabled={downloading}>
                    <Icon name="download" size={16} /> {downloading ? 'Downloading…' : 'Download e-ticket'}
                  </button>
                )}
                {canPay && (
                  <button className="btn btn-accent btn-block" onClick={handleCompletePayment} disabled={paymentLoading}>
                    {paymentLoading ? 'Opening payment…' : 'Complete payment'}
                  </button>
                )}
                {isExpired && <button className="btn btn-primary btn-block" onClick={() => router.push('/')}>Book again</button>}
                <button className="btn btn-secondary btn-block" onClick={() => window.print()}>Print details</button>
                {(booking.status === 'confirmed' || canPay) && (
                  <button className="btn btn-ghost btn-block bd-cancel" onClick={() => setShowCancelModal(true)}>Cancel booking</button>
                )}
              </div>
            </aside>
          </div>
        </div>

        {showCancelModal && (
          <div className="sw-modal-backdrop" onClick={() => setShowCancelModal(false)}>
            <div className="sw-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title" onClick={(e) => e.stopPropagation()}>
              <div className="sw-modal__head">
                <h3 id="cancel-title">Cancel this booking?</h3>
                <button className="header-icon-btn" onClick={() => setShowCancelModal(false)} aria-label="Close"><Icon name="x" size={20} /></button>
              </div>
              <p className="hd-muted">This can’t be undone. Refunds follow the airline’s fare rules and go back to your original payment method.</p>
              <label className="hb-field">
                <span className="form-label">Reason for cancelling</span>
                <textarea className="form-textarea" rows="3" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Tell us what changed" required />
              </label>
              <div className="sw-modal__foot">
                <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)} disabled={cancelling}>Keep booking</button>
                <button className="btn btn-danger" onClick={handleCancelBooking} disabled={cancelling || !cancelReason.trim()}>
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
