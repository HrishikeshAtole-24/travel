'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import './booking.css';

export default function BookingPage() {
  const router = useRouter();
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [travelers, setTravelers] = useState([{
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
  }]);

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
      
      // Pre-fill contact details if user is logged in
      const token = apiClient.getToken();
      if (token) {
        fetchUserProfile();
      }
    } else {
      router.push('/search');
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      if (response.success && response.data?.user) {
        const user = response.data.user;
        setContactDetails({
          email: user.email || '',
          phone: user.phone || ''
        });
        // Pre-fill first traveler with user info
        setTravelers([{
          ...travelers[0],
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || ''
        }]);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleTravelerChange = (index, field, value) => {
    const updatedTravelers = [...travelers];
    updatedTravelers[index] = {
      ...updatedTravelers[index],
      [field]: value
    };
    setTravelers(updatedTravelers);
  };

  const handleContactChange = (field, value) => {
    setContactDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    // Check travelers
    for (const traveler of travelers) {
      if (!traveler.firstName || !traveler.lastName || !traveler.dateOfBirth || !traveler.gender) {
        setError('Please fill in all required traveler information');
        return false;
      }
      if (!traveler.email || !traveler.phone) {
        setError('Please provide email and phone for all travelers');
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
      // Get segment info
      const segment = flight.segments?.[0] || {};
      const price = flight.price || {};

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

      const bookingRequest = {
        flightData: flightData,
        travelers: travelers,
        contactEmail: contactDetails.email,
        contactPhone: contactDetails.phone,
        totalPrice: price.total || flight.totalPrice || 0,
        currency: price.currency || 'INR',
        specialRequests: specialRequests || undefined,
        paymentAcquirer: 'RAZORPAY',
        successUrl: `${window.location.origin}/confirmation`,
        failureUrl: `${window.location.origin}/payment-failed`
      };

      console.log('Creating booking with data:', bookingRequest);

      const response = await apiClient.createBookingAndPay(bookingRequest);
      
      console.log('Booking response:', response);

      if (response.success && response.data) {
        const { booking, payment } = response.data;
        
        // Store booking info
        sessionStorage.setItem('bookingData', JSON.stringify(booking));
        
        // Redirect to payment URL if available
        if (payment?.paymentUrl) {
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
                {/* Passenger Details */}
                <div className="form-card">
                  <h2 className="form-card-title">Passenger Details</h2>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={travelers[0].firstName}
                        onChange={(e) => handleTravelerChange(0, 'firstName', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={travelers[0].lastName}
                        onChange={(e) => handleTravelerChange(0, 'lastName', e.target.value)}
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
                        value={travelers[0].dateOfBirth}
                        onChange={(e) => handleTravelerChange(0, 'dateOfBirth', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Gender *</label>
                      <select
                        className="form-select"
                        value={travelers[0].gender}
                        onChange={(e) => handleTravelerChange(0, 'gender', e.target.value)}
                        required
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nationality *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={travelers[0].nationality}
                        onChange={(e) => handleTravelerChange(0, 'nationality', e.target.value)}
                        placeholder="e.g., IN"
                        maxLength="2"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Document Type *</label>
                      <select
                        className="form-select"
                        value={travelers[0].documentType}
                        onChange={(e) => handleTravelerChange(0, 'documentType', e.target.value)}
                        required
                      >
                        <option value="PASSPORT">Passport</option>
                        <option value="ID_CARD">ID Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Document Number *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={travelers[0].documentNumber}
                        onChange={(e) => handleTravelerChange(0, 'documentNumber', e.target.value)}
                        placeholder="Passport/ID number"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Document Expiry *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={travelers[0].documentExpiry}
                        onChange={(e) => handleTravelerChange(0, 'documentExpiry', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={travelers[0].email}
                        onChange={(e) => handleTravelerChange(0, 'email', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={travelers[0].phone}
                        onChange={(e) => handleTravelerChange(0, 'phone', e.target.value)}
                        placeholder="+919876543210"
                        required
                      />
                    </div>
                  </div>
                </div>

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
                  <span>₹{flight.price?.base?.toLocaleString() || '0'}</span>
                </div>
                <div className="summary-row">
                  <span>Taxes & Fees</span>
                  <span>₹{flight.price?.taxes?.toLocaleString() || '0'}</span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-total">
                  <span>Total Amount</span>
                  <span>₹{flight.price?.total?.toLocaleString() || '0'}</span>
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
