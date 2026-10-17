'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import getSymbolFromCurrency from 'currency-symbol-map';
import { validateFlightPrice } from '@/lib/api/flights';
import Icon from '../Icon/Icon';
import './FlightCard.css';

export default function FlightCard({ flight }) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);

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

  const handleSelectFlight = async () => {
    try {
      setIsValidating(true);
      setValidationError(null);

      console.log('🔍 Validating flight price for:', flight.id || flight.offerId);

      // Pass the entire flight object - the API function will handle transformation
      const validationResponse = await validateFlightPrice(flight);
      
      console.log('✅ Price validation successful:', validationResponse);

      // Store validated flight data
      const validatedFlight = {
        ...flight,
        validatedOffer: validationResponse.data?.data?.flightOffers?.[0],
        validationTimestamp: new Date().toISOString(),
        dictionaries: validationResponse.data?.dictionaries
      };

      sessionStorage.setItem('selectedFlight', JSON.stringify(validatedFlight));
      
      // Navigate to booking page
      router.push('/booking');
    } catch (error) {
      console.error('❌ Price validation failed:', error);
      setValidationError(error.message || 'Failed to validate price. Please try again.');
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setValidationError(null);
      }, 5000);
    } finally {
      setIsValidating(false);
    }
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

  const stopsLabel = segment.stops === 0 ? 'Non-stop' : `${segment.stops} stop${segment.stops > 1 ? 's' : ''}`;
  const via = layovers.length > 0 ? layovers.map(l => l.airport).join(', ') : '';

  return (
    <article className={`flight-card ${showDetails ? 'is-open' : ''}`}>
      <div className="flight-card-content">
        <div className="flight-airline">
          <div className="airline-logo">
            {segment.airlineLogo ? <img src={segment.airlineLogo} alt="" /> : <span>{segment.airlineCode || 'XX'}</span>}
          </div>
          <div className="airline-info">
            <div className="airline-name">{segment.airlineName || 'Airline'}</div>
            <div className="flight-number">
              {segment.flightNumber || '--'}
              {hasCodeShare && <> · Operated by {segment.operatingAirlineCode}</>}
            </div>
          </div>
        </div>

        <div className="flight-route">
          <div className="route-segment">
            <div className="route-time">{formatTime(segment.departure?.time)}</div>
            <div className="route-airport">
              {segment.departure?.airport || '--'}
              {segment.departure?.terminal && <span className="terminal-info"> · T{segment.departure.terminal}</span>}
            </div>
          </div>

          <div className="route-info">
            <div className="route-duration">{segment.durationFormatted || formatDuration(segment.duration)}</div>
            <div className="route-line">
              <span className="route-dot" />
              <span className="route-path">
                {Array.from({ length: Math.min(segment.stops || 0, 2) }, (_, n) => <span key={n} className="route-stop" />)}
              </span>
              <span className="route-dot route-dot--end" />
            </div>
            <div className={`route-stops ${segment.stops === 0 ? 'is-nonstop' : 'has-stops'}`}>
              {stopsLabel}{via && <span> · via {via}</span>}
            </div>
          </div>

          <div className="route-segment route-segment--end">
            <div className="route-time">
              {formatTime(segment.arrival?.time)}
              {segment.arrival?.nextDay && <sup className="next-day-badge">+1</sup>}
            </div>
            <div className="route-airport">
              {segment.arrival?.airport || '--'}
              {segment.arrival?.terminal && <span className="terminal-info"> · T{segment.arrival.terminal}</span>}
            </div>
          </div>
        </div>

        <div className="flight-price-section">
          <div className="price-info">
            {flight.source?.supplierName && (
              <span className="sw-supplier" title={`Fare supplied by ${flight.source.supplierName}`}>
                <Icon name="shield-check" size={12} /> via <strong>{flight.source.supplierName}</strong>
              </span>
            )}
            <div className="price-amount">{currencySymbol}{Math.round(price.total || 0).toLocaleString('en-IN')}</div>
            <div className="price-label">total incl. taxes</div>
          </div>
          <button className="btn btn-accent select-flight-btn" onClick={handleSelectFlight} disabled={isValidating} aria-busy={isValidating}>
            {isValidating ? (<><span className="spinner-small" /> Checking fare…</>) : 'Select'}
          </button>
        </div>
      </div>

      {validationError && (
        <div className="validation-error-banner" role="alert">
          <Icon name="alert" size={18} />
          <span>{validationError}</span>
          <button className="close-error-btn" onClick={() => setValidationError(null)} aria-label="Dismiss">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <div className="flight-card-footer">
        <div className="flight-amenities">
          {segment.baggage?.checkIn?.pieces > 0 && (
            <span className="amenity-badge"><Icon name="luggage" size={14} /> {segment.baggage.checkIn.weightKg ? `${segment.baggage.checkIn.weightKg} kg check-in` : `${segment.baggage.checkIn.pieces} checked bag${segment.baggage.checkIn.pieces > 1 ? 's' : ''}`}</span>
          )}
          {segment.baggage?.cabin && (
            <span className="amenity-badge"><Icon name="briefcase" size={14} /> {segment.baggage.cabin.weightKg ? `${segment.baggage.cabin.weightKg} kg cabin` : 'Cabin bag'}</span>
          )}
          <span className="amenity-badge">{formatCabinClass(segment.cabinClass)}</span>
          {price.isRefundable
            ? <span className="amenity-badge is-good"><Icon name="check" size={14} /> Refundable</span>
            : <span className="amenity-badge">Non-refundable</span>}
          {computed.isOvernight && <span className="amenity-badge">Overnight</span>}
        </div>

        <button className="view-details-btn" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}>
          {showDetails ? 'Hide details' : 'Flight details'}
          <Icon name={showDetails ? 'chevron-up' : 'chevron-down'} size={16} />
        </button>
      </div>

      {showDetails && (
        <div className="flight-details-expanded">
          {allSegments.length > 0 && (
            <div className="segments-detail">
              <h4>Itinerary</h4>
              {allSegments.map((seg, idx) => (
                <div key={idx} className="segment-item">
                  <div className="segment-header">
                    <span className="segment-airline">
                      <strong>{seg.airlineName}</strong> · {seg.airlineCode}{seg.flightNumber?.replace(seg.airlineCode, '')}
                    </span>
                    {seg.aircraftName && <span className="segment-aircraft">{seg.aircraftName}</span>}
                  </div>
                  <div className="segment-route">
                    <div className="segment-point">
                      <div className="segment-time">{formatTime(seg.departure?.time)}</div>
                      <div className="segment-airport">{seg.departure?.airport}{seg.departure?.terminal && ` · T${seg.departure.terminal}`}</div>
                      {seg.departure?.formatted?.date && <div className="segment-date">{seg.departure.formatted.date}</div>}
                    </div>
                    <div className="segment-duration">
                      <span>{formatDuration(seg.duration)}</span>
                      <div className="segment-line" />
                    </div>
                    <div className="segment-point">
                      <div className="segment-time">{formatTime(seg.arrival?.time)}</div>
                      <div className="segment-airport">{seg.arrival?.airport}{seg.arrival?.terminal && ` · T${seg.arrival.terminal}`}</div>
                      {seg.arrival?.formatted?.date && <div className="segment-date">{seg.arrival.formatted.date}</div>}
                    </div>
                  </div>
                  <div className="segment-info">
                    <span className="info-item">{formatCabinClass(seg.cabinClass)}{seg.bookingClass && ` (${seg.bookingClass})`}</span>
                    {seg.baggage?.checkIn?.pieces > 0 && <span className="info-item">Check-in {seg.baggage.checkIn.weightKg ? `${seg.baggage.checkIn.weightKg} kg` : `${seg.baggage.checkIn.pieces} bag${seg.baggage.checkIn.pieces > 1 ? 's' : ''}`}</span>}
                  </div>
                  {idx < allSegments.length - 1 && layovers[idx] && (
                    <div className="layover-info">
                      <Icon name="clock" size={16} />
                      <span>{layovers[idx].durationFormatted || formatDuration(layovers[idx].durationMinutes)} layover in {layovers[idx].airport}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flight-details-side">
            <div className="price-breakdown">
              <h4>Fare breakdown</h4>
              <div className="price-row"><span>Base fare</span><span>{currencySymbol}{Math.round(price.base || 0).toLocaleString('en-IN')}</span></div>
              <div className="price-row"><span>Taxes &amp; fees</span><span>{currencySymbol}{Math.round(price.taxes || 0).toLocaleString('en-IN')}</span></div>
              <div className="price-row total"><span>Total</span><span>{currencySymbol}{Math.round(price.total || 0).toLocaleString('en-IN')}</span></div>
              {price.fareFamily && <div className="fare-family"><Icon name="tag" size={14} /> {price.fareFamily}</div>}
            </div>
            <div className="fare-conditions">
              <h4>Fare rules</h4>
              <div className="condition-badges">
                <span className={`sw-badge ${price.isRefundable ? 'sw-badge--success' : 'sw-badge--danger'}`}>{price.isRefundable ? 'Refundable' : 'Non-refundable'}</span>
                <span className={`sw-badge ${price.isChangeable ? 'sw-badge--brand' : ''}`}>{price.isChangeable ? 'Changes allowed (fees apply)' : 'No changes'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
