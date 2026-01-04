'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import getSymbolFromCurrency from 'currency-symbol-map';
import './FlightCard.css';

export default function FlightCard({ flight }) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

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

  const formatCabinClass = (cabin) => {
    if (!cabin) return 'Economy';
    const classMap = {
      'ECONOMY': 'Economy',
      'PREMIUM_ECONOMY': 'Premium Economy',
      'BUSINESS': 'Business',
      'FIRST': 'First Class'
    };
    return classMap[cabin] || cabin;
  };

  const handleSelectFlight = () => {
    // Store flight data and navigate to booking page
    sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
    router.push('/booking');
  };

  const segment = flight.segments?.[0] || {};
  const price = flight.price || {};
  const computed = flight.computed || {};
  const layovers = flight.layovers || [];
  const allSegments = flight.allSegments || [];
  
  // Get currency symbol
  const currencySymbol = getSymbolFromCurrency(price.currency) || price.currency || '₹';

  // Check if different operating airline
  const hasCodeShare = segment.operatingAirlineCode && 
    segment.operatingAirlineCode !== segment.airlineCode;

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
            {hasCodeShare && (
              <div className="codeshare-info">
                <i className="fas fa-info-circle"></i>
                Operated by {segment.operatingAirlineCode}
              </div>
            )}
          </div>
        </div>

        {/* Flight Route */}
        <div className="flight-route">
          <div className="route-segment">
            <div className="route-time">{formatTime(segment.departure?.time)}</div>
            <div className="route-airport">
              {segment.departure?.airport || '--'}
              {segment.departure?.terminal && (
                <span className="terminal-info">T{segment.departure.terminal}</span>
              )}
            </div>
          </div>

          <div className="route-info">
            <div className="route-duration">
              {segment.durationFormatted || formatDuration(segment.duration)}
            </div>
            <div className="route-line">
              <div className="route-dot"></div>
              <div className="route-path">
                {segment.stops > 0 && (
                  <div className="stop-indicator">
                    {segment.stops === 1 ? '1 stop' : `${segment.stops} stops`}
                  </div>
                )}
              </div>
              <div className="route-dot"></div>
            </div>
            <div className="route-stops">
              {segment.stops === 0 ? (
                <span className="nonstop-badge">Non-stop</span>
              ) : (
                <span className="stops-text">
                  {layovers.length > 0 ? layovers.map(l => l.airport).join(', ') : `${segment.stops} stop(s)`}
                </span>
              )}
            </div>
          </div>

          <div className="route-segment">
            <div className="route-time">
              {formatTime(segment.arrival?.time)}
              {segment.arrival?.nextDay && (
                <span className="next-day-badge">+1</span>
              )}
            </div>
            <div className="route-airport">
              {segment.arrival?.airport || '--'}
              {segment.arrival?.terminal && (
                <span className="terminal-info">T{segment.arrival.terminal}</span>
              )}
            </div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flight-price-section">
          <div className="price-info">
            <div className="price-amount">
              {currencySymbol}{price.total?.toLocaleString() || '0'}
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

      {/* Flight Card Footer - Quick Info */}
      <div className="flight-card-footer">
        <div className="flight-amenities">
          {segment.cabinClass && (
            <span className="amenity-badge">
              <i className="fas fa-chair"></i> {formatCabinClass(segment.cabinClass)}
            </span>
          )}
          {segment.baggage?.checkIn && (
            <span className="amenity-badge">
              <i className="fas fa-suitcase"></i> {segment.baggage.checkIn.pieces}x{segment.baggage.checkIn.weightKg}kg
            </span>
          )}
          {segment.baggage?.cabin && (
            <span className="amenity-badge cabin-bag">
              <i className="fas fa-briefcase"></i> {segment.baggage.cabin.weightKg}kg cabin
            </span>
          )}
          {segment.aircraftName && (
            <span className="amenity-badge aircraft">
              <i className="fas fa-plane"></i> {segment.aircraftName}
            </span>
          )}
          {price.isRefundable && (
            <span className="amenity-badge refundable">
              <i className="fas fa-undo"></i> Refundable
            </span>
          )}
          {computed.isOvernight && (
            <span className="amenity-badge overnight">
              <i className="fas fa-moon"></i> Overnight
            </span>
          )}
        </div>
        
        {/* View Details Toggle */}
        <button 
          className="view-details-btn"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Flight Details'}
          <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {/* Expanded Flight Details */}
      {showDetails && (
        <div className="flight-details-expanded">
          {/* All Segments */}
          {allSegments.length > 0 && (
            <div className="segments-detail">
              <h4>Flight Segments</h4>
              {allSegments.map((seg, idx) => (
                <div key={idx} className="segment-item">
                  <div className="segment-header">
                    <span className="segment-airline">
                      <strong>{seg.airlineCode}{seg.flightNumber?.replace(seg.airlineCode, '')}</strong>
                      {' '}{seg.airlineName}
                    </span>
                    {seg.aircraftName && (
                      <span className="segment-aircraft">{seg.aircraftName}</span>
                    )}
                  </div>
                  <div className="segment-route">
                    <div className="segment-point">
                      <div className="segment-time">{formatTime(seg.departure?.time)}</div>
                      <div className="segment-airport">
                        {seg.departure?.airport}
                        {seg.departure?.terminal && <span className="terminal"> (T{seg.departure.terminal})</span>}
                      </div>
                      {seg.departure?.formatted?.date && (
                        <div className="segment-date">{seg.departure.formatted.date}</div>
                      )}
                    </div>
                    <div className="segment-duration">
                      <span>{formatDuration(seg.duration)}</span>
                      <div className="segment-line"></div>
                    </div>
                    <div className="segment-point">
                      <div className="segment-time">{formatTime(seg.arrival?.time)}</div>
                      <div className="segment-airport">
                        {seg.arrival?.airport}
                        {seg.arrival?.terminal && <span className="terminal"> (T{seg.arrival.terminal})</span>}
                      </div>
                      {seg.arrival?.formatted?.date && (
                        <div className="segment-date">{seg.arrival.formatted.date}</div>
                      )}
                    </div>
                  </div>
                  <div className="segment-info">
                    <span className="info-item">
                      <i className="fas fa-chair"></i> {formatCabinClass(seg.cabinClass)}
                      {seg.bookingClass && ` (${seg.bookingClass})`}
                    </span>
                    {seg.baggage?.checkIn && (
                      <span className="info-item">
                        <i className="fas fa-suitcase"></i> Check-in: {seg.baggage.checkIn.pieces}x{seg.baggage.checkIn.weightKg}kg
                      </span>
                    )}
                  </div>
                  
                  {/* Layover info after segment (except last) */}
                  {idx < allSegments.length - 1 && layovers[idx] && (
                    <div className="layover-info">
                      <i className="fas fa-clock"></i>
                      <span>Layover at {layovers[idx].airport}: {layovers[idx].durationFormatted || formatDuration(layovers[idx].durationMinutes)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Price Breakdown */}
          <div className="price-breakdown">
            <h4>Fare Breakdown</h4>
            <div className="price-row">
              <span>Base Fare</span>
              <span>{currencySymbol}{price.base?.toLocaleString() || '0'}</span>
            </div>
            <div className="price-row">
              <span>Taxes & Fees</span>
              <span>{currencySymbol}{price.taxes?.toLocaleString() || '0'}</span>
            </div>
            <div className="price-row total">
              <span>Total</span>
              <span>{currencySymbol}{price.total?.toLocaleString() || '0'}</span>
            </div>
            {price.fareFamily && (
              <div className="fare-family">
                <i className="fas fa-tag"></i> {price.fareFamily}
              </div>
            )}
          </div>

          {/* Fare Conditions */}
          <div className="fare-conditions">
            <h4>Fare Conditions</h4>
            <div className="condition-badges">
              {price.isRefundable ? (
                <span className="condition-badge refundable">
                  <i className="fas fa-check-circle"></i> Refundable
                </span>
              ) : (
                <span className="condition-badge non-refundable">
                  <i className="fas fa-times-circle"></i> Non-refundable
                </span>
              )}
              {price.isChangeable ? (
                <span className="condition-badge changeable">
                  <i className="fas fa-exchange-alt"></i> Changeable (fees apply)
                </span>
              ) : (
                <span className="condition-badge non-changeable">
                  <i className="fas fa-ban"></i> No changes allowed
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
