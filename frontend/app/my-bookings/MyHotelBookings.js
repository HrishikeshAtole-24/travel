'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '../components/Icon/Icon';
import { BookingListSkeleton, StateMessage } from '../components/Skeleton/Skeleton';
import { getMyHotelBookings, formatMoney, formatStayDate } from '@/lib/api/hotels';

const STATUS_LABELS = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  payment_initiated: { label: 'Payment pending', tone: 'warning' },
  pending: { label: 'Payment pending', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  expired: { label: 'Expired', tone: 'neutral' }
};

/**
 * Logged-in user's hotel bookings (My trips → Hotels) — same trip card as flights
 */
export default function MyHotelBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setBookings(await getMyHotelBookings());
      } catch (err) {
        setError(err.message || 'Failed to load hotel bookings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <BookingListSkeleton />;

  if (error) {
    return <StateMessage icon="alert" tone="danger" title="We couldn’t load your stays">{error}</StateMessage>;
  }

  if (bookings.length === 0) {
    return (
      <StateMessage icon="hotel" tone="brand" title="No stays booked yet"
        action={<Link href="/?tab=hotels" className="btn btn-primary"><Icon name="search" size={16} /> Find a hotel</Link>}>
        Hotels you book will appear here with their vouchers.
      </StateMessage>
    );
  }

  return (
    <div className="trips-list">
      {bookings.map(booking => {
        const status = STATUS_LABELS[booking.status] || { label: booking.status, tone: 'neutral' };
        const hotelData = booking.hotelData || {};
        return (
          <article className={`trip-card ${['cancelled', 'expired'].includes(booking.status) ? 'is-muted' : ''}`} key={booking.bookingId}>
            <div className="trip-card__art trip-card__art--photo">
              {hotelData.photo
                ? <img src={hotelData.photo} alt="" loading="lazy" />
                : <Icon name="hotel" size={32} />}
            </div>
            <div className="trip-card__body">
              <div className="trip-card__tags">
                <span className={`sw-badge sw-badge--${status.tone}`}>{status.label}</span>
                {hotelData.supplierName && <span className="sw-supplier">via <strong>{hotelData.supplierName}</strong></span>}
              </div>
              <h3>{booking.hotelName || 'Hotel booking'}</h3>
              <p>{[hotelData.roomName, hotelData.boardName].filter(Boolean).join(' · ') || hotelData.address}</p>
              <div className="trip-card__meta">
                <span><Icon name="calendar" size={14} /> {formatStayDate(String(booking.checkInDate).slice(0, 10))} – {formatStayDate(String(booking.checkOutDate).slice(0, 10))}</span>
                <span><Icon name="tag" size={14} /> {booking.bookingReference}</span>
              </div>
              {booking.status === 'confirmed' && booking.fulfillmentStatus === 'FAILED' && (
                <p className="trip-card__warn"><Icon name="info" size={14} /> Hotel confirmation pending — our team will contact you</p>
              )}
            </div>
            <div className="trip-card__side">
              <div className="trip-card__price">
                <strong>{formatMoney(booking.totalPrice, booking.currency)}</strong>
                <small>{booking.roomQuantity} room{booking.roomQuantity > 1 ? 's' : ''} · {booking.adults} adult{booking.adults > 1 ? 's' : ''}</small>
              </div>
              {booking.providerConfirmationId && <small className="trip-card__conf">Hotel conf. {booking.providerConfirmationId}</small>}
              <Link href={`/payment-success?booking=${encodeURIComponent(booking.bookingReference)}`} className="btn btn-secondary btn-sm">View voucher</Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
