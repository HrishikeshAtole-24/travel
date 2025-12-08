// Flight Transformer - Normalize & Enhance Data
const logger = require('../../config/winstonLogger');

// Airline code to name mapping (sample)
const AIRLINE_NAMES = {
  'AA': 'American Airlines',
  'UA': 'United Airlines',
  'DL': 'Delta Air Lines',
  'BA': 'British Airways',
  'LH': 'Lufthansa',
  'AF': 'Air France',
  'KL': 'KLM Royal Dutch Airlines',
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  '6E': 'IndiGo',
  'AI': 'Air India',
};

/**
 * Transform and enhance flight data
 */
const transformFlightData = (flights) => {
  try {
    const transformedFlights = flights.map((flight) => {
      // Enhance airline name
      if (AIRLINE_NAMES[flight.airline.code]) {
        flight.airline.name = AIRLINE_NAMES[flight.airline.code];
      }

      // Calculate duration in readable format
      flight.durationFormatted = formatDuration(flight.duration);

      // Add trip type
      flight.tripType = flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop(s)`;

      // Calculate departure/arrival dates
      const depDate = new Date(flight.departure.time);
      const arrDate = new Date(flight.arrival.time);
      
      flight.departure.date = depDate.toLocaleDateString();
      flight.departure.timeOnly = depDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      flight.arrival.date = arrDate.toLocaleDateString();
      flight.arrival.timeOnly = arrDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      // Remove raw data for cleaner response
      delete flight.rawData;

      return flight;
    });

    // Sort by price (cheapest first)
    transformedFlights.sort((a, b) => a.price.total - b.price.total);

    logger.info(`✅ Transformed ${transformedFlights.length} flights`);
    return transformedFlights;

  } catch (error) {
    logger.error('Flight transformation error:', error);
    throw new Error('Failed to transform flight data');
  }
};

/**
 * Convert ISO 8601 duration to readable format
 * Example: PT2H30M → "2h 30m"
 */
const formatDuration = (duration) => {
  if (!duration) return 'N/A';

  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return duration;

  const hours = match[1] ? match[1].replace('H', 'h') : '';
  const minutes = match[2] ? ` ${match[2].replace('M', 'm')}` : '';

  return `${hours}${minutes}`.trim();
};

module.exports = { transformFlightData };
