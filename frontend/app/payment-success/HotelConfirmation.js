'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { getHotelBookingByReference, formatMoney, formatStayDate } from '@/lib/api/hotels';
import Icon from '../components/Icon/Icon';
import { Skeleton, StateMessage } from '../components/Skeleton/Skeleton';
import '../hotels/hotels.css';
import '../styles/confirmation.css';

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
  const pending = ['PENDING', 'IN_PROGRESS'].includes(booking?.fulfillmentStatus);
  const city = hotelData.city || (hotelData.address || '').split(',').map(s => s.trim()).filter(Boolean).pop();
  const lead = booking?.guests?.[0];

  return (
    <>
      <Header />
      <main className="cf-page">
        <section className={`cf-hero ${pending ? 'is-pending' : ''}`}>
          <div className="container">
            <span className="cf-tick"><Icon name={pending ? 'clock' : 'check'} size={36} strokeWidth={2.5} /></span>
            <h1 className="cf-title">
              {city ? <>Your stay in <em className="sw-editorial">{city}</em> is booked</> : <>Payment <em className="sw-editorial">received</em></>}
            </h1>
            <p className="cf-sub">
              {booking?.contactEmail ? `We’ve sent the voucher to ${booking.contactEmail}.` : 'Your confirmation is on its way to your inbox.'}
            </p>
          </div>
        </section>

        <div className="cf-body">
          {loading && <div className="cf-voucher cf-loading"><PageSkeletonBlock /></div>}

          {!loading && error && (
            <StateMessage icon="mail" tone="brand" title="Payment received"
              action={<Link href="/my-bookings" className="btn btn-primary">Go to My trips</Link>}>
              We couldn’t load the booking here ({error}). Your confirmation will be emailed to you.
            </StateMessage>
          )}

          {!loading && booking && (
            <>
              <article className="cf-voucher">
                <div className="cf-ref">
                  <div>
                    <span className="sw-overline">Booking reference</span>
                    <strong className="cf-ref__code">{bookingReference}</strong>
                  </div>
                  <div className="cf-ref__tags">
                    <span className={`sw-badge ${status?.tone === 'success' ? 'sw-badge--success' : status?.tone === 'warn' ? 'sw-badge--warning' : ''}`}>
                      {status?.tone === 'success' ? 'Confirmed' : pending ? 'Confirming' : 'Received'}
                    </span>
                    {hotelData.supplierName && <span className="sw-supplier">via <strong>{hotelData.supplierName}</strong></span>}
                  </div>
                </div>

                {status && status.tone !== 'success' && (
                  <div className={`cf-status is-${status.tone === 'warn' ? 'warn' : 'info'}`}>
                    {pending ? <span className="spinner-dark" /> : <Icon name="info" size={16} />} {status.text}
                  </div>
                )}

                <div className="cf-main">
                  {hotelData.photo && <img className="cf-main__photo" src={hotelData.photo} alt="" />}
                  <div className="cf-main__info">
                    {hotelData.stars ? <span className="hotel-stars">{'★'.repeat(Math.round(hotelData.stars))}</span> : null}
                    <h2>{booking.hotelName}</h2>
                    {hotelData.address && <p>{hotelData.address}</p>}
                    {(hotelData.roomName || hotelData.boardName) && <strong>{[hotelData.roomName, hotelData.boardName].filter(Boolean).join(' · ')}</strong>}
                    {booking.providerConfirmationId && <p>Hotel confirmation no. <strong>{booking.providerConfirmationId}</strong></p>}
                  </div>
                </div>

                <div className="cf-perf" />

                <div className="cf-facts">
                  <div><span className="sw-overline">Check-in</span><strong>{formatStayDate(String(booking.checkInDate).slice(0, 10))}</strong></div>
                  <div><span className="sw-overline">Check-out</span><strong>{formatStayDate(String(booking.checkOutDate).slice(0, 10))}</strong></div>
                  <div><span className="sw-overline">Guests</span><strong>{booking.adults} adult{booking.adults > 1 ? 's' : ''} · {booking.roomQuantity} room{booking.roomQuantity > 1 ? 's' : ''}</strong>{lead && <small>{lead.firstName} {lead.lastName}</small>}</div>
                  <div><span className="sw-overline">Paid</span><strong>{formatMoney(booking.totalPrice, booking.currency)}</strong>{paymentId && <small>Payment {paymentId}</small>}</div>
                </div>

                <div className="cf-actions">
                  <Link href="/my-bookings" className="btn btn-primary"><Icon name="ticket" size={16} /> View in My trips</Link>
                  <button type="button" className="btn btn-secondary" onClick={() => window.print()}><Icon name="download" size={16} /> Save voucher</button>
                  <span className="spacer" />
                  <Link href="/contact" className="btn btn-ghost">Need help?</Link>
                </div>
              </article>

              <h2 className="cf-next-title">What happens next</h2>
              <div className="cf-next">
                <div><Icon name="mail" size={20} /><strong>Voucher in your inbox</strong><p>Show it on your phone at check-in — no printout needed.</p></div>
                <div><Icon name="user" size={20} /><strong>Bring a photo ID</strong><p>Every guest needs a government ID matching the booking name.</p></div>
                <div><Icon name="info" size={20} /><strong>Local taxes</strong><p>Any city or tourist tax is paid directly at the hotel.</p></div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function PageSkeletonBlock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Skeleton w={160} h={12} /><Skeleton w={220} h={28} />
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}><Skeleton w={180} h={120} r={12} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}><Skeleton w="60%" h={20} /><Skeleton w="40%" h={12} /><Skeleton w="50%" h={12} /></div>
      </div>
    </div>
  );
}
