'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMyHotelBookings, formatMoney, formatStayDate } from '@/lib/api/hotels';
import '../hotels/hotels.css';

const STATUS_LABELS = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  payment_initiated: { label: 'Payment pending', tone: 'muted' },
  pending: { label: 'Payment pending', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  expired: { label: 'Expired', tone: 'muted' }
};

/**
 * Logged-in user's hotel bookings (My Bookings → Hotels)
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

  if (loading) {
    return <div className="hotels-state"><i className="fas fa-spinner fa-spin"></i><p>Loading your hotel bookings…</p></div>;
  }

  if (error) {
    return <div className="hotels-state"><i className="fas fa-exclamation-circle"></i><p>{error}</p></div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="hotels-state">
        <i className="fas fa-hotel"></i>
        <p>No hotel bookings yet.</p>
        <Link href="/" className="btn btn-primary">Find a hotel</Link>
      </div>
    );
  }

  return (
    <div className="hotels-list">
      {bookings.map(booking => {
        const status = STATUS_LABELS[booking.status] || { label: booking.status, tone: 'muted' };
        const hotelData = booking.hotelData || {};
        return (
          <article className="hotel-card" key={booking.bookingId}>
            <div className="hotel-card-image">
              {hotelData.photo
                ? <img src={hotelData.photo} alt={booking.hotelName} loading="lazy" />
                : <div className="hotel-image-placeholder"><i className="fas fa-hotel"></i></div>}
            </div>
            <div className="hotel-card-body">
              <h3 className="hotel-card-name">{booking.hotelName || 'Hotel booking'}</h3>
              <p className="hotel-card-address">{hotelData.address}</p>
              <p className="hotel-card-room">
                {formatStayDate(booking.checkInDate)} – {formatStayDate(booking.checkOutDate)} · {booking.roomQuantity} Room{booking.roomQuantity > 1 ? 's' : ''}, {booking.adults} Adult{booking.adults > 1 ? 's' : ''}
              </p>
              {hotelData.roomName && <p className="hotel-card-room">{hotelData.roomName}{hotelData.boardName ? ` · ${hotelData.boardName}` : ''}</p>}
              <div className="hotel-tags">
                <span className={`hotel-tag ${status.tone}`}>{status.label}</span>
                {booking.status === 'confirmed' && booking.fulfillmentStatus === 'FAILED' && (
                  <span className="hotel-tag danger">Hotel confirmation pending - support will contact you</span>
                )}
              </div>
            </div>
            <div className="hotel-card-price">
              <div className="hotel-price-block">
                <span className="hotel-price-note">Booking ref</span>
                <strong>{booking.bookingReference}</strong>
                {booking.providerConfirmationId && (
                  <span className="hotel-price-note">Hotel conf. {booking.providerConfirmationId}</span>
                )}
              </div>
              <div className="hotel-price-block">
                <div className="hotel-price-amount">{formatMoney(booking.totalPrice, booking.currency)}</div>
                <span className="hotel-price-note">total</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
