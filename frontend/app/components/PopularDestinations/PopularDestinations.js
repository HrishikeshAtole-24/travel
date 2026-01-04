'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './PopularDestinations.css';

export default function PopularDestinations() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('international');

  // Get dates for the flights
  const getFlightDates = (daysFromNow, duration) => {
    const departDate = new Date();
    departDate.setDate(departDate.getDate() + daysFromNow);
    const returnDate = new Date(departDate);
    returnDate.setDate(returnDate.getDate() + duration);
    
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    
    const formatDisplay = (date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return {
      depart: formatDate(departDate),
      return: formatDate(returnDate),
      displayDepart: formatDisplay(departDate),
      displayReturn: formatDisplay(returnDate)
    };
  };

  const internationalFlights = [
    {
      from: 'DEL',
      fromCity: 'Delhi',
      to: 'LHR',
      toCity: 'London',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop',
      ...getFlightDates(3, 18)
    },
    {
      from: 'BOM',
      fromCity: 'Mumbai',
      to: 'DXB',
      toCity: 'Dubai',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop',
      ...getFlightDates(4, 7)
    },
    {
      from: 'DEL',
      fromCity: 'Delhi',
      to: 'BKK',
      toCity: 'Bangkok',
      image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=300&fit=crop',
      ...getFlightDates(3, 7)
    },
    {
      from: 'BOM',
      fromCity: 'Mumbai',
      to: 'SIN',
      toCity: 'Singapore',
      image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop',
      ...getFlightDates(6, 8)
    }
  ];

  const domesticFlights = [
    {
      from: 'BOM',
      fromCity: 'Mumbai',
      to: 'DEL',
      toCity: 'New Delhi',
      image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop',
      ...getFlightDates(3, 2)
    },
    {
      from: 'DEL',
      fromCity: 'Delhi',
      to: 'GOI',
      toCity: 'Goa',
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&h=300&fit=crop',
      ...getFlightDates(6, 4)
    },
    {
      from: 'BOM',
      fromCity: 'Mumbai',
      to: 'BLR',
      toCity: 'Bangalore',
      image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&h=300&fit=crop',
      ...getFlightDates(3, 6)
    },
    {
      from: 'DEL',
      fromCity: 'Delhi',
      to: 'MAA',
      toCity: 'Chennai',
      image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&h=300&fit=crop',
      ...getFlightDates(3, 3)
    }
  ];

  const handleFlightClick = (flight) => {
    const params = new URLSearchParams({
      from: flight.from,
      to: flight.to,
      departDate: flight.depart,
      returnDate: flight.return,
      passengers: 1,
      cabinClass: 'economy',
      tripType: 'roundtrip'
    });
    
    router.push(`/search?${params.toString()}`);
  };

  const flights = activeTab === 'international' ? internationalFlights : domesticFlights;

  return (
    <section className="popular-flights-section">
      <div className="container">
        {/* Header */}
        <div className="popular-flights-header">
          <h2>Popular flights near you</h2>
          <p>Find deals on domestic and international flights</p>
        </div>

        {/* Tabs */}
        <div className="flights-tabs">
          <button 
            className={`flights-tab ${activeTab === 'international' ? 'active' : ''}`}
            onClick={() => setActiveTab('international')}
          >
            International
          </button>
          <button 
            className={`flights-tab ${activeTab === 'domestic' ? 'active' : ''}`}
            onClick={() => setActiveTab('domestic')}
          >
            Domestic
          </button>
        </div>

        {/* Flight Cards */}
        <div className="popular-flights-grid">
          {flights.map((flight, index) => (
            <div 
              key={index} 
              className="popular-flight-card"
              onClick={() => handleFlightClick(flight)}
            >
              <div className="popular-flight-image">
                <img src={flight.image} alt={flight.toCity} />
              </div>
              <div className="popular-flight-info">
                <h3>{flight.fromCity} to {flight.toCity}</h3>
                <p>{flight.displayDepart} - {flight.displayReturn} · Round-trip</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
