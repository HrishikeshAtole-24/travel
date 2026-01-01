'use client';

import { useRouter } from 'next/navigation';
import './FlightCard.css';

export default function FlightCard({ flight }) {
  const router = useRouter();

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleSelectFlight = () => {
    // Store flight data and navigate to booking page
    sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
    router.push('/booking');
  };

  const segment = flight.segments?.[0] || {};
  const price = flight.price || {};

  return (
    <div className="flight-card">
      <div className="flight-card-content">
        {/* Airline Info */}
        <div className="flight-airline">
          <div className="airline-logo">
            {segment.airlineCode || 'XX'}
          </div>
          <div className="airline-info">
            <div className="airline-name">{segment.airlineName || 'Airline'}</div>
            <div className="flight-number">{segment.flightNumber || '--'}</div>
          </div>
        </div>

        {/* Flight Route */}
        <div className="flight-route">
          <div className="route-segment">
            <div className="route-time">{formatTime(segment.departure?.time)}</div>
            <div className="route-airport">{segment.departure?.airport || '--'}</div>
          </div>

          <div className="route-info">
            <div className="route-duration">{formatDuration(segment.duration)}</div>
            <div className="route-line">
              <div className="route-dot"></div>
              <div className="route-path"></div>
              <div className="route-dot"></div>
            </div>
            <div className="route-stops">
              {segment.stops === 0 ? 'Non-stop' : `${segment.stops} stop(s)`}
            </div>
          </div>

          <div className="route-segment">
            <div className="route-time">{formatTime(segment.arrival?.time)}</div>
            <div className="route-airport">{segment.arrival?.airport || '--'}</div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flight-price-section">
          <div className="price-info">
            <div className="price-amount">
              ₹{price.total?.toLocaleString() || '0'}
            </div>
            <div className="price-label">per person</div>
          </div>
          <button 
            className="btn btn-primary select-flight-btn"
            onClick={handleSelectFlight}
          >
            Select Flight
          </button>
        </div>
      </div>

      {/* Additional Info */}
      <div className="flight-card-footer">
        <div className="flight-amenities">
          {segment.cabinClass && (
            <span className="amenity-badge">{segment.cabinClass}</span>
          )}
          {segment.baggage && (
            <span className="amenity-badge">✈️ {segment.baggage}</span>
          )}
        </div>
      </div>
    </div>
  );
}
