'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import { useAuth } from '@/app/contexts/AuthContext';
import { confirmHotelOffer, createHotelBookingAndPay, formatMoney, formatStayDate } from '@/lib/api/hotels';
import '../hotels.css';

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]{0,49}$/;

const emptyGuest = () => ({ title: 'Mr', firstName: '', lastName: '' });

export default function HotelBookingPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();

  const [selection, setSelection] = useState(null);
  const [confirmed, setConfirmed] = useState(null); // live offer from the supplier
  const [confirming, setConfirming] = useState(true);
  const [confirmError, setConfirmError] = useState(null);

  const [guests, setGuests] = useState([emptyGuest()]);
  const [contact, setContact] = useState({ email: '', phone: '' });
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load the room the user picked on the details page
  useEffect(() => {
    const saved = sessionStorage.getItem('hotelSelection');
    if (!saved) {
      router.replace('/');
      return;
    }
    const parsed = JSON.parse(saved);
    setSelection(parsed);
    setGuests(Array.from({ length: parsed.stay?.rooms || 1 }, emptyGuest));
  }, [router]);

  // Re-confirm live price and availability with the supplier
  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    (async () => {
      setConfirming(true);
      setConfirmError(null);
      try {
        const offer = await confirmHotelOffer(selection.offerId);
        if (!cancelled) setConfirmed(offer);
      } catch (err) {
        if (!cancelled) setConfirmError(err.message || 'This room is no longer available.');
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selection]);

  // Pre-fill lead guest and contact from the logged-in profile
  useEffect(() => {
    if (authLoading || !isLoggedIn || !user) return;
    setContact({ email: user.email || '', phone: user.phone || '' });
    setGuests(prev => [{ ...prev[0], firstName: prev[0].firstName || user.firstName || '', lastName: prev[0].lastName || user.lastName || '' }, ...prev.slice(1)]);
  }, [authLoading, isLoggedIn, user]);

  if (!selection) return null;

  const { hotel, room, rate, stay } = selection;
  const total = confirmed?.pricing?.totalAmount ?? rate.totalAmount;
  const currency = confirmed?.pricing?.totalCurrency ?? rate.currency;
  const priceChanged = confirmed && Math.abs(confirmed.pricing.totalAmount - rate.totalAmount) > 1;
  const payAtHotel = (confirmed?.pricing?.payAtProperty ?? rate.payAtProperty ?? []).reduce((sum, f) => sum + f.amount, 0);
  const taxesIncluded = confirmed?.pricing?.taxesAmount ?? rate.taxesAmount ?? 0;
  const cancellation = confirmed?.policies?.cancellation?.description || rate.cancellationText;

  const updateGuest = (index, field, value) => {
    setGuests(prev => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const validate = () => {
    for (const [i, guest] of guests.entries()) {
      if (!NAME_PATTERN.test(guest.firstName.trim()) || !NAME_PATTERN.test(guest.lastName.trim())) {
        return `Room ${i + 1}: enter the guest's first and last name as on their ID (letters only)`;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) return 'Please enter a valid email address';
    if (contact.phone.replace(/[^\d]/g, '').length < 10) return 'Please enter a valid mobile number';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await createHotelBookingAndPay({
        offerId: selection.offerId,
        guests: guests.map(g => ({
          title: g.title,
          firstName: g.firstName.trim(),
          lastName: g.lastName.trim(),
          email: contact.email.trim()
        })),
        contactEmail: contact.email.trim(),
        contactPhone: contact.phone.trim(),
        specialRequests: specialRequests.trim() || undefined,
        hotelName: hotel.name,
        hotelData: { ...hotel, roomName: room.name, boardName: rate.boardName },
        successUrl: `${window.location.origin}/payment-success`,
        failureUrl: `${window.location.origin}/payment-failed`
      });

      const { booking, payment } = response.data || {};
      // Lets the success page show a guest booking (lookup needs the contact email)
      sessionStorage.setItem('bookingData', JSON.stringify({
        type: 'hotel',
        bookingReference: booking?.bookingReference,
        contactEmail: contact.email.trim()
      }));

      if (payment?.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
      } else {
        throw new Error('Could not start payment. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Could not create your booking. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="hotels-page">
        <div className="container">
          <nav className="hotels-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>/</span>
            <a href="#" onClick={(e) => { e.preventDefault(); router.back(); }}>{hotel.name}</a>
            <span>/</span> <span>Review & Book</span>
          </nav>

          <div className="hb-layout">
            {/* Guest details */}
            <form className="hb-form" onSubmit={handleSubmit} noValidate>
              {error && <div className="hb-error" role="alert">{error}</div>}

              {guests.map((guest, index) => (
                <div className="hd-card" key={index}>
                  <h2>Room {index + 1} · Lead guest</h2>
                  <p className="hb-sub">Name must match the ID shown at check-in</p>
                  <div className="hb-grid">
                    <label className="hb-field">
                      Title
                      <select value={guest.title} onChange={(e) => updateGuest(index, 'title', e.target.value)}>
                        <option>Mr</option>
                        <option>Ms</option>
                        <option>Mrs</option>
                      </select>
                    </label>
                    <label className="hb-field">
                      First name *
                      <input value={guest.firstName} autoComplete={index === 0 ? 'given-name' : 'off'} required
                        onChange={(e) => updateGuest(index, 'firstName', e.target.value)} />
                    </label>
                    <label className="hb-field">
                      Last name *
                      <input value={guest.lastName} autoComplete={index === 0 ? 'family-name' : 'off'} required
                        onChange={(e) => updateGuest(index, 'lastName', e.target.value)} />
                    </label>
                  </div>
                </div>
              ))}

              <div className="hd-card">
                <h2>Contact details</h2>
                <p className="hb-sub">Your booking confirmation will be sent here</p>
                <div className="hb-grid two">
                  <label className="hb-field">
                    Email *
                    <input type="email" value={contact.email} autoComplete="email" required
                      onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))} />
                  </label>
                  <label className="hb-field">
                    Mobile number *
                    <input type="tel" value={contact.phone} autoComplete="tel" placeholder="+91 98765 43210" required
                      onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))} />
                  </label>
                </div>
                <label className="hb-field">
                  Special requests (optional)
                  <textarea rows="3" value={specialRequests} maxLength={500}
                    placeholder="e.g. late check-in, high floor. Requests are subject to availability."
                    onChange={(e) => setSpecialRequests(e.target.value)} />
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-lg hb-submit" disabled={submitting || confirming || Boolean(confirmError)}>
                {submitting ? 'Creating booking…' : `Pay ${formatMoney(total, currency)} & Book`}
              </button>
              <p className="hb-fineprint">
                By booking you agree to the hotel's cancellation policy and our <Link href="/terms-and-conditions">terms</Link>.
              </p>
            </form>

            {/* Summary */}
            <aside className="hb-summary">
              <div className="hd-card">
                <div className="hb-summary-hotel">
                  {hotel.photo && <img src={hotel.photo} alt={hotel.name} />}
                  <div>
                    <h3>{hotel.name}</h3>
                    <small className="hotel-card-address">{hotel.address}</small>
                  </div>
                </div>

                <div className="hb-stay">
                  <div><span>Check-in</span>{formatStayDate(stay.checkInDate)}</div>
                  <div><span>Check-out</span>{formatStayDate(stay.checkOutDate)}</div>
                  <div><span>Guests</span>{stay.rooms} Room{stay.rooms > 1 ? 's' : ''}, {stay.adults} Adult{stay.adults > 1 ? 's' : ''}{stay.childrenAges?.length ? `, ${stay.childrenAges.length} Child` : ''}</div>
                  <div><span>Nights</span>{stay.nights || rate.nights}</div>
                </div>

                <p><strong>{room.name}</strong><br /><small>{rate.boardName || 'Room Only'}</small></p>
                <div className="hotel-tags">
                  {rate.refundable
                    ? <span className="hotel-tag success"><i className="fas fa-check"></i> Refundable</span>
                    : <span className="hotel-tag danger">Non-refundable</span>}
                </div>
                {cancellation && <p className="hd-rate-policy">{cancellation}</p>}

                {confirming && <p className="hb-sub"><i className="fas fa-spinner fa-spin"></i> Confirming live price with the hotel…</p>}
                {confirmError && (
                  <div className="hb-error">
                    {confirmError} <Link href="/">Search again</Link>
                  </div>
                )}
                {confirmed && !priceChanged && <div className="hb-confirmed"><i className="fas fa-shield-alt"></i> Price confirmed with the hotel</div>}
                {priceChanged && (
                  <div className="hb-price-change">
                    The price changed from {formatMoney(rate.totalAmount, rate.currency)} to {formatMoney(total, currency)} since you searched.
                  </div>
                )}

                <div className="hb-row"><span>Room price ({stay.nights || rate.nights} night{(stay.nights || rate.nights) > 1 ? 's' : ''})</span><span>{formatMoney(total - taxesIncluded, currency)}</span></div>
                {taxesIncluded > 0 && <div className="hb-row"><span>Taxes & fees</span><span>{formatMoney(taxesIncluded, currency)}</span></div>}
                <div className="hb-row total"><span>Pay now</span><span>{formatMoney(total, currency)}</span></div>
                {payAtHotel > 0 && (
                  <div className="hb-row"><span>Payable at hotel (local taxes)</span><span>{formatMoney(payAtHotel, currency)}</span></div>
                )}
                {rate.supplierName && <span className="supplier-badge">via <strong>{rate.supplierName}</strong></span>}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
