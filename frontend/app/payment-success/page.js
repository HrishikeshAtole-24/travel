'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icon from '../components/Icon/Icon';
import { PageSkeleton } from '../components/Skeleton/Skeleton';
import '../styles/confirmation.css';
import './payment-success.css';
import HotelConfirmation from './HotelConfirmation';

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

  // Guests prove access with the contact email used at booking time
  // (saved in sessionStorage by the booking page before redirecting to payment)
  const getContactEmail = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
      return saved.contactEmail || '';
    } catch {
      return '';
    }
  };

  const withEmail = (url) => {
    const email = getContactEmail();
    return email ? `${url}?email=${encodeURIComponent(email)}` : url;
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchBookingDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(
        withEmail(`${baseUrl}/bookings/reference/${bookingReference}`),
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      const data = await response.json();
      // API responses are wrapped: { success, data: { success, booking } }
      const booking = data.data?.booking || data.booking;
      if (data.success && booking) {
        setBookingDetails(booking);
        if (booking.emailSent) {
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
        withEmail(`${baseUrl}/bookings/${bookingReference}/ticket`),
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
          },
          body: JSON.stringify({ email: getContactEmail() || undefined })
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
        <PageSkeleton label="Loading your booking…" />
      </>
    );
  }

  const flightData = bookingDetails?.flightData;
  const outboundFlight = flightData?.itineraries?.[0]?.segments?.[0];
  const segs = flightData?.itineraries?.[0]?.segments || [];
  const lastSeg = segs[segs.length - 1] || outboundFlight;
  const from = outboundFlight?.departure?.iataCode || flightData?.origin;
  const to = lastSeg?.arrival?.iataCode || flightData?.destination;
  const ticketPending = bookingDetails && !bookingDetails.pnr && bookingDetails.ticketingStatus && bookingDetails.ticketingStatus !== 'ISSUED';
  const ticketFailed = bookingDetails?.ticketingStatus === 'FAILED';

  return (
    <>
      <Header />
      <main className="cf-page">
        {notification && (
          <div className={`sw-toast is-${notification.type}`} role="status">
            <Icon name={notification.type === 'success' ? 'check' : 'alert'} size={18} />
            <span>{notification.message}</span>
          </div>
        )}

        <section className={`cf-hero ${ticketPending && !ticketFailed ? 'is-pending' : ''}`}>
          <div className="container">
            <span className="cf-tick"><Icon name="check" size={36} strokeWidth={2.5} /></span>
            <h1 className="cf-title">
              {to ? <>You’re flying to <em className="sw-editorial">{to}</em></> : <>Payment <em className="sw-editorial">successful</em></>}
            </h1>
            <p className="cf-sub">
              {ticketFailed
                ? 'Payment received — our team is confirming your ticket with the airline and will email you shortly.'
                : ticketPending ? 'Payment received — we’re issuing your ticket now.' : 'Your flight is booked. Your e-ticket is ready below.'}
            </p>
          </div>
        </section>

        <div className="cf-body">
          <article className="cf-voucher">
            <div className="cf-ref">
              <div>
                <span className="sw-overline">Booking reference</span>
                <strong className="cf-ref__code">{bookingReference || 'N/A'}</strong>
              </div>
              <div className="cf-ref__tags">
                <span className={`sw-badge ${ticketFailed ? 'sw-badge--warning' : ticketPending ? '' : 'sw-badge--success'}`}>
                  {ticketFailed ? 'Being confirmed' : ticketPending ? 'Issuing ticket' : 'Confirmed'}
                </span>
                {bookingDetails?.pnr && <span className="sw-supplier">PNR <strong>{bookingDetails.pnr}</strong></span>}
              </div>
            </div>

            {outboundFlight && (
              <div className="cf-main">
                <div className="cf-main__art">
                  <span className="cf-codes">{from} <Icon name="plane" size={20} /> {to}</span>
                  <small>{outboundFlight.carrierCode} {outboundFlight.number}</small>
                </div>
                <div className="cf-main__info">
                  <h2>{from} → {to}</h2>
                  <p>{formatDate(outboundFlight.departure?.at)} · departs {formatTime(outboundFlight.departure?.at)}, arrives {formatTime(lastSeg?.arrival?.at)}</p>
                  <strong>{segs.length > 1 ? `${segs.length - 1} stop${segs.length > 2 ? 's' : ''}` : 'Non-stop'}{outboundFlight.duration ? ` · ${formatDuration(outboundFlight.duration)}` : ''}{outboundFlight.cabin ? ` · ${outboundFlight.cabin}` : ''}</strong>
                </div>
              </div>
            )}

            <div className="cf-perf" />

            <div className="cf-facts">
              <div><span className="sw-overline">Departure</span><strong>{outboundFlight ? formatTime(outboundFlight.departure?.at) : '—'}</strong><small>{outboundFlight ? formatDate(outboundFlight.departure?.at) : ''}</small></div>
              <div><span className="sw-overline">Travellers</span><strong>{bookingDetails?.travelers?.length || 1}</strong>
                <small>{bookingDetails?.travelers?.[0] ? `${bookingDetails.travelers[0].first_name} ${bookingDetails.travelers[0].last_name}${bookingDetails.travelers.length > 1 ? ` +${bookingDetails.travelers.length - 1}` : ''}` : ''}</small></div>
              <div><span className="sw-overline">Paid</span><strong>{bookingDetails ? `${bookingDetails.currency === 'INR' ? '₹' : `${bookingDetails.currency} `}${Number(bookingDetails.totalPrice || 0).toLocaleString('en-IN')}` : '—'}</strong><small>Razorpay</small></div>
              <div><span className="sw-overline">Payment ID</span><strong>{paymentId || '—'}</strong></div>
            </div>

            <div className="cf-actions">
              <button className="btn btn-primary" onClick={handleDownloadTicket} disabled={downloadingTicket}>
                <Icon name="download" size={16} /> {downloadingTicket ? 'Downloading…' : 'Download e-ticket'}
              </button>
              <button className="btn btn-secondary" onClick={handleSendEmail} disabled={sendingEmail || emailSent}>
                <Icon name={emailSent ? 'check' : 'mail'} size={16} /> {sendingEmail ? 'Sending…' : emailSent ? 'Email sent' : 'Email confirmation'}
              </button>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => router.push('/my-bookings')}>View in My trips</button>
            </div>
          </article>

          {bookingDetails?.travelers?.length > 0 && (
            <>
              <h2 className="cf-next-title">Travellers</h2>
              <div className="cf-travellers">
                {bookingDetails.travelers.map((t, i) => (
                  <div key={i}>
                    <span className="cf-avatar">{(t.first_name || '?')[0]}{(t.last_name || '')[0]}</span>
                    <span><strong>{t.title} {t.first_name} {t.last_name}</strong><small>{t.traveler_type || 'Adult'}</small></span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="cf-next-title">What happens next</h2>
          <div className="cf-next">
            <div><Icon name="mail" size={20} /><strong>E-ticket by email</strong><p>{emailSent ? 'Sent to your inbox.' : 'We’ll email it — or send it again from above.'}</p></div>
            <div><Icon name="clock" size={20} /><strong>Web check-in</strong><p>Opens 48 hours before departure on the airline’s site.</p></div>
            <div><Icon name="headset" size={20} /><strong>Need to change plans?</strong><p>Manage or cancel from My trips, or <a href="/contact">talk to support</a>.</p></div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * Hotel bookings (HB- references) get their own confirmation view
 */
function PaymentSuccessRouter() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('booking') || searchParams.get('booking_reference') || '';
  if (reference.startsWith('HB-')) {
    return (
      <HotelConfirmation
        bookingReference={reference}
        paymentId={searchParams.get('payment') || searchParams.get('payment_reference')}
      />
    );
  }
  return <PaymentSuccessContent />;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<><Header /><PageSkeleton label="Loading your booking…" /></>}>
      <PaymentSuccessRouter />
    </Suspense>
  );
}
