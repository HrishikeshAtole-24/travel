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
  
  const [passengerData, setPassengerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    passportNumber: '',
  });

  const [contactDetails, setContactDetails] = useState({
    email: '',
    phone: ''
  });

  useEffect(() => {
    const flightData = sessionStorage.getItem('selectedFlight');
    if (flightData) {
      setFlight(JSON.parse(flightData));
    } else {
      router.push('/search');
    }
  }, []);

  const handlePassengerChange = (field, value) => {
    setPassengerData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (field, value) => {
    setContactDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const bookingRequest = {
        flightDetails: {
          offerId: flight.offerId,
          supplier: flight.supplier,
          segments: flight.segments
        },
        travelers: [
          {
            id: '1',
            type: 'adult',
            firstName: passengerData.firstName,
            lastName: passengerData.lastName,
            dateOfBirth: passengerData.dateOfBirth,
            gender: passengerData.gender,
            ...(passengerData.passportNumber && {
              documents: [{
                documentType: 'PASSPORT',
                number: passengerData.passportNumber
              }]
            }),
            contact: {
              email: contactDetails.email,
              phone: contactDetails.phone
            }
          }
        ],
        contactInfo: contactDetails
      };

      const response = await apiClient.post('/bookings/create-and-pay', bookingRequest);
      
      if (response.success && response.data) {
        // Redirect to payment page or confirmation
        sessionStorage.setItem('bookingData', JSON.stringify(response.data));
        router.push(`/payment?bookingId=${response.data.bookingId}`);
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

  return (
    <>
      <Header />
      <main className="booking-page">
        <div className="container">
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
                        value={passengerData.firstName}
                        onChange={(e) => handlePassengerChange('firstName', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={passengerData.lastName}
                        onChange={(e) => handlePassengerChange('lastName', e.target.value)}
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
                        value={passengerData.dateOfBirth}
                        onChange={(e) => handlePassengerChange('dateOfBirth', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Gender *</label>
                      <select
                        className="form-select"
                        value={passengerData.gender}
                        onChange={(e) => handlePassengerChange('gender', e.target.value)}
                        required
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Passport Number (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={passengerData.passportNumber}
                      onChange={(e) => handlePassengerChange('passportNumber', e.target.value)}
                      placeholder="For international flights"
                    />
                  </div>
                </div>

                {/* Contact Details */}
                <div className="form-card">
                  <h2 className="form-card-title">Contact Details</h2>
                  
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={contactDetails.email}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={contactDetails.phone}
                      onChange={(e) => handleContactChange('phone', e.target.value)}
                      required
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
