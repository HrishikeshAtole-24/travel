'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import Icon from '../components/Icon/Icon';
import CheckoutSteps, { CheckoutSection } from '../components/CheckoutSteps/CheckoutSteps';
import { PageSkeleton } from '../components/Skeleton/Skeleton';
import '../hotels/hotels.css';
import './booking.css';

const PASSENGER_TYPE_LABELS = {
  ADULT: 'Adult',
  CHILD: 'Child',
  INFANT: 'Infant on lap'
};

// One empty traveler form for a passenger slot on the fare
const createTraveler = (passenger = {}) => ({
  type: passenger.type || 'ADULT',
  supplierPassengerId: passenger.supplierPassengerId || undefined,
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'MALE',
  nationality: 'IN',
  documentType: 'PASSPORT',
  documentNumber: '',
  documentExpiry: '',
  email: '',
  phone: ''
});

export default function BookingPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [travelers, setTravelers] = useState([createTraveler()]);

  const [contactDetails, setContactDetails] = useState({
    email: '',
    phone: ''
  });

  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    const flightData = sessionStorage.getItem('selectedFlight');
    if (flightData) {
      const parsedFlight = JSON.parse(flightData);
      setFlight(parsedFlight);
      // One form per passenger on the fare, in the order the airline expects
      const passengers = parsedFlight.validatedOffer?.passengers;
      if (Array.isArray(passengers) && passengers.length > 0) {
        setTravelers(passengers.map(createTraveler));
      }
    } else {
      router.push('/search');
    }
  }, [router]);

  // Pre-fill contact details from user profile
  useEffect(() => {
    if (!authLoading && isLoggedIn && user) {
      setContactDetails({
        email: user.email || '',
        phone: user.phone || ''
      });
      // Pre-fill first traveler with user info (keep the other passengers)
      setTravelers(prev => [{
        ...prev[0],
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      }, ...prev.slice(1)]);
    }
  }, [authLoading, isLoggedIn, user]);

  const handleTravelerChange = (index, field, value) => {
    const updatedTravelers = [...travelers];
    updatedTravelers[index] = {
      ...updatedTravelers[index],
      [field]: value
    };
    setTravelers(updatedTravelers);
  };

  // Airline requires passport details for this itinerary (e.g. international)
  const documentsRequired = Boolean(flight?.validatedOffer?.requirements?.identityDocumentsRequired);

  const handleContactChange = (field, value) => {
    setContactDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    // Check travelers (passengers after the first fall back to the contact email/phone)
    for (const [index, traveler] of travelers.entries()) {
      if (!traveler.firstName || !traveler.lastName || !traveler.dateOfBirth || !traveler.gender) {
        setError(`Please fill in all required details for passenger ${index + 1}`);
        return false;
      }
      if (index === 0 && (!traveler.email || !traveler.phone)) {
        setError('Please provide email and phone for the lead passenger');
        return false;
      }
      if (documentsRequired && (!traveler.documentNumber || !traveler.documentExpiry)) {
        setError(`Passport details are required for passenger ${index + 1} on this flight`);
        return false;
      }
    }

    // Check contact details
    if (!contactDetails.email || !contactDetails.phone) {
      setError('Please provide contact information');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Validated (re-priced) offer from the flight card; required to book
      const validatedOffer = flight.validatedOffer;
      const segment = flight.segments?.[0] || {};

      // Build flight data object matching backend expectations
      const flightData = {
        flightId: flight.offerId || flight.flightId || `${segment.airlineCode}${segment.flightNumber}`,
        origin: segment.departure?.airport || flight.origin,
        destination: segment.arrival?.airport || flight.destination,
        departureDate: segment.departure?.date || flight.departureDate,
        departureTime: segment.departure?.time ? new Date(segment.departure.time).toTimeString().slice(0, 5) : '',
        arrivalDate: segment.arrival?.date || flight.arrivalDate,
        arrivalTime: segment.arrival?.time ? new Date(segment.arrival.time).toTimeString().slice(0, 5) : '',
        airline: segment.airlineCode || flight.airline,
        flightNumber: segment.flightNumber || flight.flightNumber,
        cabin: flight.cabin || 'ECONOMY',
        stops: flight.stops || (flight.segments?.length - 1) || 0
      };

      if (!validatedOffer) {
        setError('This fare could not be confirmed. Please go back and select the flight again.');
        return;
      }

      // Price is NOT sent: the server re-prices validatedFlightOffer with the airline
      const bookingRequest = {
        flightData: flightData,
        travelers: travelers,
        contactEmail: contactDetails.email,
        contactPhone: contactDetails.phone,
        specialRequests: specialRequests || undefined,
        paymentAcquirer: 'RAZORPAY',
        successUrl: `${window.location.origin}/confirmation`,
        failureUrl: `${window.location.origin}/payment-failed`,
        // Validated flight offer - re-priced server-side and used for the Amadeus booking
        validatedFlightOffer: validatedOffer
      };

      console.log('Creating booking with data:', bookingRequest);

      const response = await apiClient.createBookingAndPay(bookingRequest);
      
      console.log('Booking response:', response);

      if (response.success && response.data) {
        const { booking, payment } = response.data;
        
        // Store booking info
        sessionStorage.setItem('bookingData', JSON.stringify(booking));
        
        // Redirect to payment checkout URL
        if (payment?.checkoutUrl) {
          window.location.href = payment.checkoutUrl;
        } else if (payment?.paymentUrl) {
          window.location.href = payment.paymentUrl;
        } else if (booking?.bookingId) {
          router.push(`/confirmation?bookingId=${booking.bookingReference || booking.bookingId}`);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create booking');
      console.error('Booking error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!flight) {
    return <><Header /><PageSkeleton label="Loading your flight…" /></>;
  }

  const segment = flight.segments?.[0] || {};
  const total = flight.validatedOffer?.price?.total || flight.price?.total || 0;
  const base = flight.validatedOffer?.price?.base || flight.price?.base || 0;
  const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const time = (t) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--');
  const day = (t) => (t ? new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '');

  const field = (index, key, label, props = {}) => (
    <label className="hb-field">
      <span className="form-label">{label}</span>
      <input className="form-input" value={travelers[index][key]} onChange={(e) => handleTravelerChange(index, key, e.target.value)} {...props} />
    </label>
  );

  return (
    <>
      <Header />
      <main className="hotels-page checkout-page">
        <div className="container">
          <button type="button" className="sw-link co-back" onClick={() => router.back()}>
            <Icon name="chevron-left" size={16} /> Back to flights
          </button>
          <CheckoutSteps steps={['Flight', 'Travellers', 'Payment', 'Confirmed']} current={1} />
          <h1 className="co-title">Who’s flying?</h1>
          <p className="co-sub">Enter names exactly as on the passport or government ID.</p>

          <div className="hb-layout">
            <form onSubmit={handleSubmit} className="hb-form" noValidate>
              {error && <div className="hb-error" role="alert"><Icon name="alert" size={18} /> {error}</div>}

              {travelers.map((traveler, index) => (
                <CheckoutSection key={traveler.supplierPassengerId || index} number={index + 1}
                  title={`Traveller ${index + 1} · ${PASSENGER_TYPE_LABELS[traveler.type] || 'Adult'}`}
                  subtitle={index === 0 ? 'Lead traveller — we’ll contact them about this trip' : undefined}>
                  <div className="title-chips" role="radiogroup" aria-label="Gender as on passport">
                    {[['MALE', 'Male'], ['FEMALE', 'Female']].map(([v, l]) => (
                      <button key={v} type="button" role="radio" aria-checked={traveler.gender === v}
                        className={`sw-chip-outline ${traveler.gender === v ? 'active' : ''}`} onClick={() => handleTravelerChange(index, 'gender', v)}>{l}</button>
                    ))}
                  </div>
                  <div className="hb-grid two">
                    {field(index, 'firstName', 'First name', { required: true, autoComplete: index === 0 ? 'given-name' : 'off' })}
                    {field(index, 'lastName', 'Last name', { required: true, autoComplete: index === 0 ? 'family-name' : 'off' })}
                    {field(index, 'dateOfBirth', 'Date of birth', { type: 'date', required: true })}
                    {field(index, 'nationality', 'Nationality', { placeholder: 'IN', maxLength: 2, required: true })}
                    {index === 0 && field(index, 'email', 'Email', { type: 'email', required: true, autoComplete: 'email' })}
                    {index === 0 && field(index, 'phone', 'Mobile number', { type: 'tel', required: true, placeholder: '+91 98765 43210', autoComplete: 'tel' })}
                  </div>

                  <details className="bk-docs" open={documentsRequired}>
                    <summary>
                      <Icon name="shield-check" size={16} /> Passport / ID {documentsRequired ? <span className="sw-badge sw-badge--warning">Required for this flight</span> : <span className="hb-optional">optional</span>}
                    </summary>
                    <div className="hb-grid">
                      <label className="hb-field">
                        <span className="form-label">Document</span>
                        <select className="form-select" value={traveler.documentType} onChange={(e) => handleTravelerChange(index, 'documentType', e.target.value)}>
                          <option value="PASSPORT">Passport</option>
                          <option value="ID_CARD">ID card</option>
                        </select>
                      </label>
                      {field(index, 'documentNumber', 'Number', { required: documentsRequired })}
                      {field(index, 'documentExpiry', 'Expiry', { type: 'date', required: documentsRequired })}
                    </div>
                  </details>
                </CheckoutSection>
              ))}

              <CheckoutSection number={travelers.length + 1} title="Contact details" subtitle="Your e-ticket and updates go here">
                <div className="hb-grid two">
                  <label className="hb-field">
                    <span className="form-label">Email</span>
                    <input type="email" className="form-input" value={contactDetails.email} onChange={(e) => handleContactChange('email', e.target.value)} required autoComplete="email" />
                  </label>
                  <label className="hb-field">
                    <span className="form-label">Mobile number</span>
                    <input type="tel" className="form-input" value={contactDetails.phone} onChange={(e) => handleContactChange('phone', e.target.value)} placeholder="+91 98765 43210" required autoComplete="tel" />
                  </label>
                </div>
                <label className="hb-field">
                  <span className="form-label">Special requests <span className="hb-optional">optional</span></span>
                  <textarea className="form-textarea" rows="3" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. wheelchair assistance, vegetarian meal" />
                </label>
              </CheckoutSection>

              <div className="hb-actions">
                <p className="hb-fineprint">By continuing you agree to the airline’s fare rules and our <Link href="/terms-and-conditions">terms</Link>.</p>
                <button type="submit" className="btn btn-accent btn-lg hb-submit" disabled={loading}>
                  {loading ? 'Creating booking…' : `Pay ${inr(total)}`}
                </button>
              </div>
            </form>

            <aside className="hb-summary">
              <div className="hb-card">
                <div className="bk-flight">
                  <div className="bk-flight__head">
                    <span className="airline-logo">{segment.airlineLogo ? <img src={segment.airlineLogo} alt="" /> : segment.airlineCode}</span>
                    <span><strong>{segment.airlineName}</strong><small>{segment.flightNumber} · {day(segment.departure?.time)}</small></span>
                  </div>
                  <div className="bk-flight__route">
                    <div><strong>{time(segment.departure?.time)}</strong><small>{segment.departure?.airport}</small></div>
                    <div className="bk-flight__line"><small>{segment.durationFormatted || ''}</small><span /><small>{segment.stops === 0 ? 'Non-stop' : `${segment.stops} stop${segment.stops > 1 ? 's' : ''}`}</small></div>
                    <div><strong>{time(segment.arrival?.time)}</strong><small>{segment.arrival?.airport}</small></div>
                  </div>
                </div>
              </div>

              <div className="hb-card hb-price">
                <h3>Price details</h3>
                <div className="hb-row"><span>Base fare · {travelers.length} traveller{travelers.length > 1 ? 's' : ''}</span><span>{inr(base)}</span></div>
                <div className="hb-row"><span>Taxes &amp; fees</span><span>{inr(total - base)}</span></div>
                <div className="hb-row total"><span>Total</span><span>{inr(total)}</span></div>
                {flight.validatedOffer && <div className="hb-confirmed"><Icon name="shield-check" size={16} /> Fare confirmed with the airline</div>}
                {flight.source?.supplierName && <span className="sw-supplier"><Icon name="shield-check" size={12} /> via <strong>{flight.source.supplierName}</strong></span>}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
