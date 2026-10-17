'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import Icon from '../components/Icon/Icon';
import { Skeleton, PageSkeleton } from '../components/Skeleton/Skeleton';
import '../styles/confirmation.css';

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
    } else {
      setLoading(false);
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
      <main className="cf-page">
        <section className="cf-hero">
          <div className="container">
            <span className="cf-tick"><Icon name="check" size={36} strokeWidth={2.5} /></span>
            <h1 className="cf-title">
              {flightInfo?.destination ? <>You’re flying to <em className="sw-editorial">{flightInfo.destination}</em></> : <>Booking <em className="sw-editorial">confirmed</em></>}
            </h1>
            <p className="cf-sub">
              {paymentStatus === 'success' ? 'Payment complete. ' : ''}Your confirmation and e-ticket are on their way to {booking?.contactEmail || 'your inbox'}.
            </p>
          </div>
        </section>

        <div className="cf-body">
          <article className="cf-voucher">
            <div className="cf-ref">
              <div>
                <span className="sw-overline">Booking reference</span>
                <strong className="cf-ref__code">{bookingReference || 'Processing…'}</strong>
              </div>
              <div className="cf-ref__tags">
                <span className="sw-badge sw-badge--success">Confirmed</span>
                {booking?.pnr && <span className="sw-supplier">PNR <strong>{booking.pnr}</strong></span>}
              </div>
            </div>

            {loading && bookingReference && (
              <div className="cf-main"><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}><Skeleton w="40%" h={20} /><Skeleton w="60%" h={12} /><Skeleton w="30%" h={12} /></div></div>
            )}

            {!loading && flightInfo && (
              <>
                <div className="cf-main">
                  <div className="cf-main__art">
                    <span className="cf-codes">{flightInfo.origin} <Icon name="plane" size={20} /> {flightInfo.destination}</span>
                    <small>{flightInfo.airline} {flightInfo.flightNumber}</small>
                  </div>
                  <div className="cf-main__info">
                    <h2>{flightInfo.origin} → {flightInfo.destination}</h2>
                    <p>{formatDate(flightInfo.departureDate)} · departs {formatTime(flightInfo.departureTime)}{flightInfo.arrivalTime ? `, arrives ${formatTime(flightInfo.arrivalTime)}` : ''}</p>
                  </div>
                </div>
                <div className="cf-perf" />
                <div className="cf-facts">
                  <div><span className="sw-overline">Departure</span><strong>{formatTime(flightInfo.departureTime)}</strong><small>{formatDate(flightInfo.departureDate)}</small></div>
                  <div><span className="sw-overline">Flight</span><strong>{flightInfo.airline} {flightInfo.flightNumber}</strong></div>
                  <div><span className="sw-overline">Paid</span><strong>{formatCurrency(booking.totalPrice, booking.currency)}</strong></div>
                  <div><span className="sw-overline">Contact</span><strong>{booking.contactEmail}</strong></div>
                </div>
              </>
            )}

            <div className="cf-actions">
              <Link href="/my-bookings" className="btn btn-primary"><Icon name="ticket" size={16} /> View in My trips</Link>
              <Link href="/" className="btn btn-secondary">Back to home</Link>
              <span className="spacer" />
              <Link href="/contact" className="btn btn-ghost">Need help?</Link>
            </div>
          </article>

          <h2 className="cf-next-title">What happens next</h2>
          <div className="cf-next">
            <div><Icon name="mail" size={20} /><strong>E-ticket by email</strong><p>Keep it on your phone — you won’t need a printout.</p></div>
            <div><Icon name="clock" size={20} /><strong>Web check-in</strong><p>Opens 48 hours before departure on the airline’s site.</p></div>
            <div><Icon name="user" size={20} /><strong>Carry a photo ID</strong><p>The name must match the one on your booking.</p></div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<><Header /><PageSkeleton label="Loading your booking…" /></>}>
      <ConfirmationContent />
    </Suspense>
  );
}
