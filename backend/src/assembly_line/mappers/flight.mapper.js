// Flight Mapper - Convert Amadeus Format → Standard Format
const logger = require('../../config/winstonLogger');

/**
 * Map Amadeus flight data to standardized format
 */
const mapFlightData = (amadeusData) => {
  try {
    if (!amadeusData || !amadeusData.data) {
      return [];
    }

    const flights = amadeusData.data.map((offer) => {
      const itinerary = offer.itineraries[0]; // First itinerary (outbound)
      const segment = itinerary.segments[0]; // First segment

      return {
        id: offer.id,
        source: 'amadeus',
        price: {
          total: parseFloat(offer.price.total),
          currency: offer.price.currency,
          base: parseFloat(offer.price.base || 0),
        },
        airline: {
          code: segment.carrierCode,
          name: segment.carrierCode, // Map to full name in transformer
          flightNumber: segment.number,
        },
        departure: {
          airport: segment.departure.iataCode,
          time: segment.departure.at,
          terminal: segment.departure.terminal || null,
        },
        arrival: {
          airport: segment.arrival.iataCode,
          time: segment.arrival.at,
          terminal: segment.arrival.terminal || null,
        },
        duration: itinerary.duration,
        stops: itinerary.segments.length - 1,
        seatsAvailable: offer.numberOfBookableSeats || null,
        rawData: offer, // Keep original for reference
      };
    });

    logger.info(`✅ Mapped ${flights.length} flights from Amadeus`);
    return flights;

  } catch (error) {
    logger.error('Flight mapping error:', error);
    throw new Error('Failed to map flight data');
  }
};

module.exports = { mapFlightData };
