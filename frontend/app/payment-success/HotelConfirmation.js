'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { getHotelBookingByReference, formatMoney, formatStayDate } from '@/lib/api/hotels';
import '../hotels/hotels.css';

// How long to keep checking while the hotel confirms the room with the supplier
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 8;

const FULFILLMENT_MESSAGES = {
  CONFIRMED: { tone: 'success', text: 'Your room is confirmed with the hotel.' },
  PENDING: { tone: 'info', text: 'Confirming your room with the hotel…' },
  IN_PROGRESS: { tone: 'info', text: 'Confirming your room with the hotel…' },
  FAILED: { tone: 'warn', text: 'We received your payment but could not confirm the room automatically. Our team will contact you shortly, or refund you in full.' },
  MANUAL: { tone: 'info', text: 'Our team is confirming your room with the hotel and will email you shortly.' }
};

/**
 * Payment success view for hotel bookings (HB- references)
 */
export default function HotelConfirmation({ bookingReference, paymentId }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [polls, setPolls] = useState(0);

  const contactEmail = (() => {
    if (typeof window === 'undefined') return '';
    try {
      return JSON.parse(sessionStorage.getItem('bookingData') || '{}').contactEmail || '';
    } catch {
      return '';
    }
  })();

  const load = useCallback(async () => {
    try {
      setBooking(await getHotelBookingByReference(bookingReference, contactEmail));
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load your booking.');
    } finally {
      setLoading(false);
    }
  }, [bookingReference, contactEmail]);

  useEffect(() => { load(); }, [load]);

  // The supplier booking happens right after payment; refresh until it settles
  useEffect(() => {
    if (!booking || polls >= MAX_POLLS) return undefined;
    if (!['PENDING', 'IN_PROGRESS'].includes(booking.fulfillmentStatus)) return undefined;
    const timer = setTimeout(() => {
      setPolls(p => p + 1);
      load();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [booking, polls, load]);

  const status = FULFILLMENT_MESSAGES[booking?.fulfillmentStatus] || (booking?.status === 'confirmed' ? FULFILLMENT_MESSAGES.CONFIRMED : null);
  const hotelData = booking?.hotelData || {};

  return (
    <>
      <Header />
      <main className="hotels-page">
        <div className="container">
          <div className="hd-card" style={{ textAlign: 'center' }}>
            <div className="hotel-rating-score" style={{ display: 'inline-flex', fontSize: '2rem', borderRadius: '50%', width: 64, height: 64, alignItems: 'center', justifyContent: 'center', background: 'var(--secondary-color)' }}>
              <i className="fas fa-check"></i>
            </div>
            <h1 style={{ marginBottom: 4 }}>Payment Successful!</h1>
            <p className="hotels-results-sub">Your hotel booking reference is <strong>{bookingReference}</strong></p>
            {paymentId && <p className="hotels-results-sub">Payment ID: {paymentId}</p>}
          </div>

          {loading && (
            <div className="hotels-state"><i className="fas fa-spinner fa-spin"></i><p>Loading your booking…</p></div>
          )}

          {!loading && error && (
            <div className="hotels-state">
              <i className="fas fa-envelope"></i>
              <p>Your payment was received. We couldn&apos;t load the booking details here ({error}). A confirmation will be emailed to you.</p>
              <Link href="/my-bookings" className="btn btn-primary">Go to My Bookings</Link>
            </div>
          )}

          {!loading && booking && (
            <div className="hb-layout">
              <div className="hd-card">
                {status && (
                  <div className={status.tone === 'success' ? 'hb-confirmed' : 'hb-price-change'}>
                    {['PENDING', 'IN_PROGRESS'].includes(booking.fulfillmentStatus) && <i className="fas fa-spinner fa-spin"></i>} {status.text}
                  </div>
                )}

                <div className="hb-summary-hotel">
                  {hotelData.photo && <img src={hotelData.photo} alt={booking.hotelName} />}
                  <div>
                    <h2 style={{ margin: 0 }}>{booking.hotelName}</h2>
                    <small className="hotel-card-address">{hotelData.address}</small>
                  </div>
                </div>

                <div className="hb-stay">
                  <div><span>Check-in</span>{formatStayDate(String(booking.checkInDate).slice(0, 10))}</div>
                  <div><span>Check-out</span>{formatStayDate(String(booking.checkOutDate).slice(0, 10))}</div>
                  <div><span>Rooms</span>{booking.roomQuantity}</div>
                  <div><span>Adults</span>{booking.adults}</div>
                </div>

                {(hotelData.roomName || hotelData.boardName) && (
                  <p><strong>{hotelData.roomName}</strong>{hotelData.boardName ? <><br /><small>{hotelData.boardName}</small></> : null}</p>
                )}

                {booking.providerConfirmationId && (
                  <div className="hb-row"><span>Hotel confirmation no.</span><strong>{booking.providerConfirmationId}</strong></div>
                )}
                <div className="hb-row"><span>Lead guest</span><span>{booking.guests?.[0] ? `${booking.guests[0].firstName} ${booking.guests[0].lastName}` : '-'}</span></div>
                <div className="hb-row"><span>Contact</span><span>{booking.contactEmail}</span></div>
                <div className="hb-row total"><span>Total paid</span><span>{formatMoney(booking.totalPrice, booking.currency)}</span></div>
              </div>

              <aside className="hd-card">
                <h3>What&apos;s next</h3>
                <ul className="hd-room-facts">
                  <li><i className="fas fa-id-card"></i> Carry a government photo ID for every guest at check-in</li>
                  <li><i className="fas fa-receipt"></i> Local taxes, if any, are payable at the hotel</li>
                  <li><i className="fas fa-envelope"></i> Keep your booking reference handy for support</li>
                </ul>
                <Link href="/my-bookings" className="btn btn-primary hb-submit" style={{ marginTop: 16 }}>View My Bookings</Link>
                <Link href="/" className="btn btn-outline hb-submit" style={{ marginTop: 8 }}>Book another stay</Link>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
