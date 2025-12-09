/**
 * Flight Transformer - Enhance and Normalize Flight Offers
 * Adds computed fields, formatting, and enrichments
 */
const logger = require('../../config/winstonLogger');

/**
 * Transform and enhance flight offers
 * Adds computed fields, human-readable formats, etc.
 * @param {Array} offers - Array of flight offers
 * @returns {Array} Enhanced flight offers
 */
const transformFlightData = (offers) => {
  try {
    const transformedOffers = offers.map((offer) => {
      // Calculate total stops
      const totalStops = offer.itinerary.slices.reduce((sum, slice) => {
        return sum + (slice.segments.length - 1);
      }, 0);

      // Format durations
      offer.itinerary.slices.forEach(slice => {
        slice.durationFormatted = formatDuration(slice.durationMinutes);
        
        // Add layover information
        if (slice.segments.length > 1) {
          slice.layovers = calculateLayovers(slice.segments);
        }
      });

      // Calculate total trip duration
      const totalDuration = offer.itinerary.slices.reduce((sum, slice) => sum + slice.durationMinutes, 0);
      
      // Add computed fields at offer level
      offer.computed = {
        totalStops,
        totalDurationMinutes: totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
        isNonStop: totalStops === 0,
        isOvernight: checkIfOvernight(offer.itinerary.slices[0]),
        pricePerTraveler: calculatePricePerTraveler(offer)
      };

      // Format times for UI
      offer.itinerary.slices.forEach(slice => {
        slice.segments.forEach(segment => {
          const depDate = new Date(segment.departure.time);
          const arrDate = new Date(segment.arrival.time);

          segment.departure.formatted = {
            date: depDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            }),
            time: depDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            dayOfWeek: depDate.toLocaleDateString('en-US', { weekday: 'short' })
          };

          segment.arrival.formatted = {
            date: arrDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            }),
            time: arrDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            dayOfWeek: arrDate.toLocaleDateString('en-US', { weekday: 'short' }),
            nextDay: checkNextDay(depDate, arrDate)
          };
        });
      });

      return offer;
    });

    logger.info(`✅ Transformed ${transformedOffers.length} flight offers`);
    return transformedOffers;

  } catch (error) {
    logger.error('Flight transformation error:', error);
    throw new Error('Failed to transform flight data');
  }
};

/**
 * Format duration in minutes to readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
};

/**
 * Calculate layovers between segments
 * @param {Array} segments - Flight segments
 * @returns {Array} Layover information
 */
const calculateLayovers = (segments) => {
  const layovers = [];

  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i];
    const nextSegment = segments[i + 1];

    const arrivalTime = new Date(currentSegment.arrival.time);
    const departureTime = new Date(nextSegment.departure.time);

    const layoverMinutes = Math.round((departureTime - arrivalTime) / (1000 * 60));

    layovers.push({
      airport: currentSegment.arrival.airportCode,
      durationMinutes: layoverMinutes,
      durationFormatted: formatDuration(layoverMinutes)
    });
  }

  return layovers;
};

/**
 * Check if flight is overnight
 * @param {Object} slice - Flight slice
 * @returns {boolean}
 */
const checkIfOvernight = (slice) => {
  if (!slice || !slice.segments || slice.segments.length === 0) return false;

  const firstSegment = slice.segments[0];
  const lastSegment = slice.segments[slice.segments.length - 1];

  const depDate = new Date(firstSegment.departure.time);
  const arrDate = new Date(lastSegment.arrival.time);

  return depDate.getDate() !== arrDate.getDate() || 
         depDate.getMonth() !== arrDate.getMonth() ||
         depDate.getFullYear() !== arrDate.getFullYear();
};

/**
 * Check if arrival is next day
 * @param {Date} depDate - Departure date
 * @param {Date} arrDate - Arrival date
 * @returns {boolean}
 */
const checkNextDay = (depDate, arrDate) => {
  return arrDate.getDate() !== depDate.getDate() || 
         arrDate.getMonth() !== depDate.getMonth() ||
         arrDate.getFullYear() !== depDate.getFullYear();
};

/**
 * Calculate price per traveler
 * @param {Object} offer - Flight offer
 * @returns {Object} Price breakdown per traveler type
 */
const calculatePricePerTraveler = (offer) => {
  if (!offer.travelerPricing || offer.travelerPricing.length === 0) {
    return { ADULT: offer.pricing.totalAmount };
  }

  const priceByType = {};
  offer.travelerPricing.forEach(tp => {
    priceByType[tp.travelerType] = tp.price.totalAmount;
  });

  return priceByType;
};

module.exports = { 
  transformFlightData,
  formatDuration,
  calculateLayovers
};
