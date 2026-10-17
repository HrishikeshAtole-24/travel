'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import { useAuth } from '@/app/contexts/AuthContext';
import { confirmHotelOffer, createHotelBookingAndPay, formatMoney, formatStayDate } from '@/lib/api/hotels';
import Icon from '../../components/Icon/Icon';
import CheckoutSteps, { CheckoutSection } from '../../components/CheckoutSteps/CheckoutSteps';
import { PageSkeleton } from '../../components/Skeleton/Skeleton';
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

  if (!selection) return <><Header /><PageSkeleton label="Loading your room…" /></>;

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

  const nights = stay.nights || rate.nights;

  return (
    <>
      <Header />
      <main className="hotels-page checkout-page">
        <div className="container">
          <button type="button" className="sw-link co-back" onClick={() => router.back()}>
            <Icon name="chevron-left" size={16} /> Back to rooms
          </button>
          <CheckoutSteps steps={['Room', 'Guest details', 'Payment', 'Confirmed']} current={1} />
          <h1 className="co-title">Who’s checking in?</h1>
          <p className="co-sub">We’ll send the confirmation and hotel voucher to these details.</p>

          <div className="hb-layout">
            <form className="hb-form" onSubmit={handleSubmit} noValidate>
              {error && <div className="hb-error" role="alert"><Icon name="alert" size={18} /> {error}</div>}

              {guests.map((guest, index) => (
                <CheckoutSection key={index} number={index + 1} title={guests.length > 1 ? `Room ${index + 1} · lead guest` : 'Lead guest'}
                  subtitle="Name must match the government ID shown at check-in">
                  <div className="title-chips" role="radiogroup" aria-label="Title">
                    {['Mr', 'Ms', 'Mrs'].map(t => (
                      <button key={t} type="button" role="radio" aria-checked={guest.title === t}
                        className={`sw-chip-outline ${guest.title === t ? 'active' : ''}`} onClick={() => updateGuest(index, 'title', t)}>{t}</button>
                    ))}
                  </div>
                  <div className="hb-grid two">
                    <label className="hb-field">
                      <span className="form-label">First name</span>
                      <input className="form-input" value={guest.firstName} autoComplete={index === 0 ? 'given-name' : 'off'} required
                        onChange={(e) => updateGuest(index, 'firstName', e.target.value)} />
                    </label>
                    <label className="hb-field">
                      <span className="form-label">Last name</span>
                      <input className="form-input" value={guest.lastName} autoComplete={index === 0 ? 'family-name' : 'off'} required
                        onChange={(e) => updateGuest(index, 'lastName', e.target.value)} />
                    </label>
                  </div>
                </CheckoutSection>
              ))}

              <CheckoutSection number={guests.length + 1} title="Contact details" subtitle="Your voucher and updates go here">
                <div className="hb-grid two">
                  <label className="hb-field">
                    <span className="form-label">Email</span>
                    <input className="form-input" type="email" value={contact.email} autoComplete="email" required
                      onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))} />
                  </label>
                  <label className="hb-field">
                    <span className="form-label">Mobile number</span>
                    <input className="form-input" type="tel" value={contact.phone} autoComplete="tel" placeholder="+91 98765 43210" required
                      onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))} />
                  </label>
                </div>
                <label className="hb-field">
                  <span className="form-label">Special requests <span className="hb-optional">optional</span></span>
                  <textarea className="form-textarea" rows="3" value={specialRequests} maxLength={500}
                    placeholder="e.g. late check-in, high floor — subject to availability"
                    onChange={(e) => setSpecialRequests(e.target.value)} />
                </label>
              </CheckoutSection>

              {cancellation && (
                <CheckoutSection number={guests.length + 2} title="Cancellation policy">
                  <div className={`hb-policy ${rate.refundable ? 'is-free' : 'is-strict'}`}>
                    <Icon name={rate.refundable ? 'check' : 'info'} size={18} />
                    <p>{cancellation}</p>
                  </div>
                </CheckoutSection>
              )}

              <div className="hb-actions">
                <p className="hb-fineprint">
                  By continuing you agree to the hotel’s policies and our <Link href="/terms-and-conditions">terms</Link>.
                </p>
                <button type="submit" className="btn btn-accent btn-lg hb-submit" disabled={submitting || confirming || Boolean(confirmError)}>
                  {submitting ? 'Creating booking…' : `Pay ${formatMoney(total, currency)}`}
                </button>
              </div>
            </form>

            <aside className="hb-summary">
              <div className="hb-card">
                {hotel.photo && <img className="hb-card__photo" src={hotel.photo} alt="" />}
                <div className="hb-card__body">
                  {hotel.stars ? <span className="hotel-stars">{'★'.repeat(Math.round(hotel.stars))}</span> : null}
                  <h3>{hotel.name}</h3>
                  <p className="hb-card__room">{room.name} · {rate.boardName || 'Room only'}</p>
                  <div className="hb-stay">
                    <div><span className="sw-overline">Check-in</span><strong>{formatStayDate(stay.checkInDate)}</strong></div>
                    <div><span className="sw-overline">Check-out</span><strong>{formatStayDate(stay.checkOutDate)}</strong></div>
                  </div>
                  <p className="hb-card__guests"><Icon name="users" size={16} /> {nights} night{nights > 1 ? 's' : ''} · {stay.rooms} room{stay.rooms > 1 ? 's' : ''} · {stay.adults} adult{stay.adults > 1 ? 's' : ''}{stay.childrenAges?.length ? ` · ${stay.childrenAges.length} child` : ''}</p>
                </div>
              </div>

              <div className="hb-card hb-price">
                <h3>Price details</h3>
                <div className="hb-row"><span>Room price · {nights} night{nights > 1 ? 's' : ''}</span><span>{formatMoney(total - taxesIncluded, currency)}</span></div>
                {taxesIncluded > 0 && <div className="hb-row"><span>Taxes &amp; fees</span><span>{formatMoney(taxesIncluded, currency)}</span></div>}
                <div className="hb-row total"><span>Pay now</span><span>{formatMoney(total, currency)}</span></div>
                {payAtHotel > 0 && <div className="hb-row warn"><span>Pay at hotel (local taxes)</span><span>{formatMoney(payAtHotel, currency)}</span></div>}

                {confirming && <div className="hb-status"><span className="spinner-dark" /> Confirming live price…</div>}
                {confirmError && <div className="hb-error">{confirmError} <Link href="/?tab=hotels">Search again</Link></div>}
                {confirmed && !priceChanged && <div className="hb-confirmed"><Icon name="shield-check" size={16} /> Price confirmed with the hotel</div>}
                {priceChanged && (
                  <div className="hb-price-change">
                    <Icon name="info" size={16} /> Price changed from {formatMoney(rate.totalAmount, rate.currency)} to {formatMoney(total, currency)} since you searched.
                  </div>
                )}
                {rate.supplierName && <span className="sw-supplier"><Icon name="shield-check" size={12} /> via <strong>{rate.supplierName}</strong></span>}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
