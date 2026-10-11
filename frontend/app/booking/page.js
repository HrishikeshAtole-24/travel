'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/app/contexts/AuthContext';
import './booking.css';

const PASSENGER_TYPE_LABELS = {
  ADULT: 'Adult',
  CHILD: 'Child',
  INFANT: 'Infant (on lap)'
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
    return null;
  }

  const segment = flight.segments?.[0] || {};
  const price = flight.price || {};

  return (
    <>
      <Header />
      <main className="booking-page">
        <div className="container">
          {/* Back Button */}
          <button 
            className="back-btn"
            onClick={() => router.back()}
            type="button"
          >
            <i className="fas fa-arrow-left"></i> Back to Search Results
          </button>

          <div className="booking-layout">
            {/* Booking Form */}
            <section className="booking-form-section">
              <h1>Complete Your Booking</h1>

              {error && (
                <div className="error-banner">
                  <p>⚠️ {error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="booking-form">
                {/* Passenger Details - one card per passenger on the fare */}
                {travelers.map((traveler, index) => (
                <div className="form-card" key={traveler.supplierPassengerId || index}>
                  <h2 className="form-card-title">
                    Passenger {index + 1} · {PASSENGER_TYPE_LABELS[traveler.type] || 'Adult'}
                  </h2>
                  <p className="form-card-subtitle">Enter names exactly as they appear on the passport / government ID</p>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={traveler.firstName}
                        onChange={(e) => handleTravelerChange(index, 'firstName', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={traveler.lastName}
                        onChange={(e) => handleTravelerChange(index, 'lastName', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date of Birth *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={traveler.dateOfBirth}
                        onChange={(e) => handleTravelerChange(index, 'dateOfBirth', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Gender (as on passport) *</label>
                      <select
                        className="form-select"
                        value={traveler.gender}
                        onChange={(e) => handleTravelerChange(index, 'gender', e.target.value)}
                        required
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nationality *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={traveler.nationality}
                        onChange={(e) => handleTravelerChange(index, 'nationality', e.target.value)}
                        placeholder="e.g., IN"
                        maxLength="2"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Document Type{documentsRequired ? ' *' : ''}</label>
                      <select
                        className="form-select"
                        value={traveler.documentType}
                        onChange={(e) => handleTravelerChange(index, 'documentType', e.target.value)}
                      >
                        <option value="PASSPORT">Passport</option>
                        <option value="ID_CARD">ID Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Document Number{documentsRequired ? ' *' : ''}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={traveler.documentNumber}
                        onChange={(e) => handleTravelerChange(index, 'documentNumber', e.target.value)}
                        placeholder="Passport/ID number"
                        required={documentsRequired}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Document Expiry{documentsRequired ? ' *' : ''}</label>
                      <input
                        type="date"
                        className="form-input"
                        value={traveler.documentExpiry}
                        onChange={(e) => handleTravelerChange(index, 'documentExpiry', e.target.value)}
                        required={documentsRequired}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email{index === 0 ? ' *' : ' (optional)'}</label>
                      <input
                        type="email"
                        className="form-input"
                        value={traveler.email}
                        onChange={(e) => handleTravelerChange(index, 'email', e.target.value)}
                        required={index === 0}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone{index === 0 ? ' *' : ' (optional)'}</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={traveler.phone}
                        onChange={(e) => handleTravelerChange(index, 'phone', e.target.value)}
                        placeholder="+919876543210"
                        required={index === 0}
                      />
                    </div>
                  </div>
                </div>
                ))}

                {/* Contact Details */}
                <div className="form-card">
                  <h2 className="form-card-title">Contact Details</h2>
                  <p className="form-card-subtitle">Booking confirmation will be sent to these details</p>
                  
                  <div className="form-group">
                    <label className="form-label">Contact Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={contactDetails.email}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Phone *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={contactDetails.phone}
                      onChange={(e) => handleContactChange('phone', e.target.value)}
                      placeholder="+919876543210"
                      required
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div className="form-card">
                  <h2 className="form-card-title">Special Requests</h2>
                  <div className="form-group">
                    <label className="form-label">Any special requirements? (Optional)</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="E.g., Wheelchair assistance, Vegetarian meal, etc."
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg submit-booking-btn"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Continue to Payment'}
                </button>
              </form>
            </section>

            {/* Booking Summary */}
            <aside className="booking-summary">
              <div className="summary-card">
                <h3>Booking Summary</h3>
                
                {/* Price Validation Badge */}
                {flight.validatedOffer && (
                  <div className="price-validated-badge">
                    <i className="fas fa-shield-check"></i>
                    <span>Price Validated & Confirmed</span>
                  </div>
                )}
                
                <div className="summary-flight">
                  <div className="summary-route">
                    <span>{segment.departure?.airport}</span>
                    <span>→</span>
                    <span>{segment.arrival?.airport}</span>
                  </div>
                  <div className="summary-airline">
                    {segment.airlineName}
                  </div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-row">
                  <span>Base Fare</span>
                  <span>₹{(flight.validatedOffer?.price?.base || flight.price?.base || 0).toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>Taxes & Fees</span>
                  <span>₹{((flight.validatedOffer?.price?.total || flight.price?.total || 0) - (flight.validatedOffer?.price?.base || flight.price?.base || 0)).toLocaleString()}</span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-total">
                  <span>Total Amount</span>
                  <span>₹{(flight.validatedOffer?.price?.total || flight.price?.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
