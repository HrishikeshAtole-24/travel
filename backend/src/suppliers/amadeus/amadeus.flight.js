// Amadeus Flight API Calls
const amadeusClient = require('./amadeus.client');
const logger = require('../../config/winstonLogger');

class AmadeusFlightAPI {
  /**
   * Search for flights
   */
  async searchFlights(searchParams) {
    try {
      const params = {
        originLocationCode: searchParams.origin,
        destinationLocationCode: searchParams.destination,
        departureDate: searchParams.departureDate,
        returnDate: searchParams.returnDate,
        adults: searchParams.adults || 1,
        currencyCode: 'USD',
        max: 50, // Maximum results
      };

      logger.info('Searching flights with Amadeus:', params);

      const response = await amadeusClient.get('/shopping/flight-offers', params);

      return response;

    } catch (error) {
      logger.error('Amadeus flight search error:', error);
      throw new Error('Failed to search flights from Amadeus');
    }
  }

  /**
   * Get flight details by ID
   */
  async getFlightDetails(flightId) {
    try {
      logger.info(`Fetching flight details for: ${flightId}`);

      const response = await amadeusClient.get(`/shopping/flight-offers/${flightId}`);

      return response;

    } catch (error) {
      logger.error('Amadeus flight details error:', error);
      throw new Error('Failed to get flight details from Amadeus');
    }
  }

  /**
   * Get flight price (for booking confirmation)
   */
  async getFlightPrice(flightOffer) {
    try {
      const response = await amadeusClient.post('/shopping/flight-offers/pricing', {
        data: {
          type: 'flight-offers-pricing',
          flightOffers: [flightOffer],
        },
      });

      return response;

    } catch (error) {
      logger.error('Amadeus flight pricing error:', error);
      throw new Error('Failed to get flight pricing from Amadeus');
    }
  }

  /**
   * Create flight order (booking)
   */
  async createFlightOrder(flightOffer, travelers) {
    try {
      const response = await amadeusClient.post('/booking/flight-orders', {
        data: {
          type: 'flight-order',
          flightOffers: [flightOffer],
          travelers,
        },
      });

      return response;

    } catch (error) {
      logger.error('Amadeus create booking error:', error);
      throw new Error('Failed to create flight booking with Amadeus');
    }
  }
}

module.exports = new AmadeusFlightAPI();
