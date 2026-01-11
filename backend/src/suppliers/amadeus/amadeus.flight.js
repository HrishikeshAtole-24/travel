/**
 * Amadeus Flight API Implementation
 * All flight-related APIs from Amadeus
 * 
 * API Documentation: https://developers.amadeus.com/self-service/apis-docs
 */
const amadeusClient = require('./amadeus.client');
const logger = require('../../config/winstonLogger');

class AmadeusFlightAPI {
  
  // ═══════════════════════════════════════════════════════════════
  // 🔥 CORE FLIGHT SEARCH & BOOKING APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * 2️⃣ Flight Offers Search (v2)
   * API: GET /v2/shopping/flight-offers
   * Purpose: Search for multiple flight offers
   * 
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Raw Amadeus flight offers response
   */
  async searchFlights(searchParams) {
    try {
      const params = {
        originLocationCode: searchParams.origin,
        destinationLocationCode: searchParams.destination,
        departureDate: searchParams.departureDate,
        adults: searchParams.adults || 1,
        max: searchParams.max || 250, // Max results (default 250, max 250)
      };

      // Optional parameters
      if (searchParams.returnDate) params.returnDate = searchParams.returnDate;
      if (searchParams.children) params.children = searchParams.children;
      if (searchParams.infants) params.infants = searchParams.infants;
      if (searchParams.travelClass) params.travelClass = searchParams.travelClass; // ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
      if (searchParams.nonStop !== undefined) params.nonStop = searchParams.nonStop;
      if (searchParams.currencyCode) params.currencyCode = searchParams.currencyCode;
      if (searchParams.maxPrice) params.maxPrice = searchParams.maxPrice;

      logger.info('🔍 Amadeus Flight Search:', params);

      // Use v2 endpoint for flight offers search
      const response = await amadeusClient.get('/v2/shopping/flight-offers', params);

      logger.info(`✅ Amadeus returned ${response.data?.length || 0} flight offers`);
      return response;

    } catch (error) {
      logger.error('❌ Amadeus flight search error:', error.message);
      throw new Error('Failed to search flights from Amadeus');
    }
  }

  /**
   * 3️⃣ Flight Offers Pricing
   * API: POST /v1/shopping/flight-offers/pricing
   * Purpose: Validate and get final price of selected flight offer before booking
   * 
   * @param {Object} flightOffer - Flight offer to price
   * @param {Array} payments - Payment details (optional)
   * @returns {Promise<Object>} Priced flight offer with final price
   */
  async getFlightPrice(flightOffer, payments = null) {
    try {
      const requestBody = {
        data: {
          type: 'flight-offers-pricing',
          flightOffers: Array.isArray(flightOffer) ? flightOffer : [flightOffer],
        },
      };

      // Add payment details if provided
      if (payments) {
        requestBody.data.payments = payments;
      }

      logger.info('💰 Getting flight pricing from Amadeus');

      const response = await amadeusClient.post('/v1/shopping/flight-offers/pricing', requestBody);

      logger.info('✅ Flight pricing retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus flight pricing error:', error.message);
      throw new Error('Failed to get flight pricing from Amadeus');
    }
  }

  /**
   * 4️⃣ Flight Create Orders (Booking)
   * API: POST /v1/booking/flight-orders
   * Purpose: Create a flight booking order
   * 
   * @param {Object} flightOffer - Priced flight offer
   * @param {Array} travelers - Traveler information
   * @param {Object} contacts - Contact information
   * @param {Array} remarks - Booking remarks (optional)
   * @returns {Promise<Object>} Flight order (booking confirmation)
   */
  async createFlightOrder(flightOffer, travelers, contacts, remarks = null) {
    try {
      const requestBody = {
        data: {
          type: 'flight-order',
          flightOffers: Array.isArray(flightOffer) ? flightOffer : [flightOffer],
          travelers,
          contacts,
        },
      };

      // Add remarks if provided
      if (remarks) {
        requestBody.data.remarks = remarks;
      }

      logger.info('🎫 Creating flight order with Amadeus');

      const response = await amadeusClient.post('/v1/booking/flight-orders', requestBody);

      logger.info(`✅ Flight order created: ${response.data?.id}`);
      return response;

    } catch (error) {
      logger.error('❌ Amadeus create booking error:', error.message);
      throw new Error('Failed to create flight booking with Amadeus');
    }
  }

  /**
   * Retrieve Flight Order
   * API: GET /v1/booking/flight-orders/{orderId}
   * Purpose: Get booking details by order ID
   * 
   * @param {String} orderId - Flight order ID
   * @returns {Promise<Object>} Flight order details
   */
  async getFlightOrder(orderId) {
    try {
      logger.info(`📋 Fetching flight order: ${orderId}`);

      const response = await amadeusClient.get(`/v1/booking/flight-orders/${orderId}`);

      logger.info('✅ Flight order retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus get flight order error:', error.message);
      throw new Error('Failed to get flight order from Amadeus');
    }
  }

  /**
   * Cancel Flight Order
   * API: DELETE /v1/booking/flight-orders/{orderId}
   * Purpose: Cancel a flight booking
   * 
   * @param {String} orderId - Flight order ID
   * @returns {Promise<Object>} Cancellation confirmation
   */
  async cancelFlightOrder(orderId) {
    try {
      logger.info(`❌ Cancelling flight order: ${orderId}`);

      const response = await amadeusClient.delete(`/v1/booking/flight-orders/${orderId}`);

      logger.info('✅ Flight order cancelled');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus cancel flight order error:', error.message);
      throw new Error('Failed to cancel flight order from Amadeus');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🌍 REFERENCE DATA APIs (Airports, Cities, Airlines)
  // ═══════════════════════════════════════════════════════════════

  /**
   * 5️⃣ Airport & City Search (Autocomplete)
   * API: GET /v1/reference-data/locations
   * Purpose: Search for airports and cities for autocomplete
   * 
   * @param {String} keyword - Search keyword (min 3 characters)
   * @param {String} subType - AIRPORT or CITY (default: AIRPORT,CITY)
   * @returns {Promise<Object>} List of matching airports/cities
   */
  async searchLocations(keyword, subType = 'AIRPORT,CITY') {
    try {
      if (!keyword || keyword.length < 3) {
        throw new Error('Keyword must be at least 3 characters');
      }

      const params = {
        keyword,
        subType,
        'page[limit]': 10,
      };

      logger.info(`🔍 Searching locations: ${keyword}`);

      const response = await amadeusClient.get('/v1/reference-data/locations', params);

      logger.info(`✅ Found ${response.data?.length || 0} locations`);
      return response;

    } catch (error) {
      logger.error('❌ Amadeus location search error:', error.message);
      throw new Error('Failed to search locations from Amadeus');
    }
  }

  /**
   * 6️⃣ Airport Information
   * API: GET /v1/reference-data/locations/airports
   * Purpose: Get detailed airport information by IATA code
   * 
   * @param {String} iataCode - Airport IATA code (e.g., BOM)
   * @returns {Promise<Object>} Airport details
   */
  async getAirportInfo(iataCode) {
    try {
      const params = {
        keyword: iataCode,
        subType: 'AIRPORT',
        'page[limit]': 10
      };

      logger.info(`🛫 Getting airport info: ${iataCode}`);

      const response = await amadeusClient.get('/v1/reference-data/locations', params);

      logger.info('✅ Airport info retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus airport info error:', error.message);
      throw new Error('Failed to get airport info from Amadeus');
    }
  }

  /**
   * Get Airports by City
   * API: GET /v1/reference-data/locations (search by city keyword)
   * Purpose: Get all airports in a city
   * 
   * @param {String} cityCode - City IATA code
   * @returns {Promise<Object>} City and its airports
   */
  async getAirportsByCity(cityCode) {
    try {
      logger.info(`🏙️ Getting airports for city: ${cityCode}`);

      // Use locations search with city code as keyword
      const params = {
        keyword: cityCode,
        subType: 'AIRPORT,CITY',
        'page[limit]': 20
      };

      const response = await amadeusClient.get('/v1/reference-data/locations', params);

      logger.info('✅ City airports retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus city airports error:', error.message);
      throw new Error('Failed to get city airports from Amadeus');
    }
  }

  /**
   * 7️⃣ Airline Information
   * API: GET /v1/reference-data/airlines
   * Purpose: Get airline details by code
   * 
   * @param {String} airlineCode - IATA airline code (e.g., EK, AI)
   * @returns {Promise<Object>} Airline details
   */
  async getAirlineInfo(airlineCode) {
    try {
      const params = {
        airlineCodes: airlineCode,
      };

      logger.info(`✈️ Getting airline info: ${airlineCode}`);

      const response = await amadeusClient.get('/v1/reference-data/airlines', params);

      logger.info('✅ Airline info retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus airline info error:', error.message);
      throw new Error('Failed to get airline info from Amadeus');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 OPTIONAL: ANALYTICS & INSIGHTS APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Flight Cheapest Date Search
   * API: GET /v1/shopping/flight-dates
   * Purpose: Find cheapest dates to fly
   * 
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Cheapest flight dates
   */
  async getFlightCheapestDates(params) {
    try {
      const queryParams = {
        origin: params.origin,
        destination: params.destination,
      };

      if (params.departureDate) queryParams.departureDate = params.departureDate;
      if (params.oneWay !== undefined) queryParams.oneWay = params.oneWay;
      if (params.duration) queryParams.duration = params.duration;
      if (params.nonStop !== undefined) queryParams.nonStop = params.nonStop;
      if (params.maxPrice) queryParams.maxPrice = params.maxPrice;

      logger.info('📅 Getting cheapest flight dates');

      const response = await amadeusClient.get('/v1/shopping/flight-dates', queryParams);

      logger.info('✅ Cheapest dates retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus cheapest dates error:', error.message);
      throw new Error('Failed to get cheapest dates from Amadeus');
    }
  }

  /**
   * Flight Inspiration Search
   * API: GET /v1/shopping/flight-destinations
   * Purpose: Find flight destinations from an origin
   * 
   * @param {String} origin - Origin IATA code
   * @param {Object} options - Optional filters
   * @returns {Promise<Object>} Destination suggestions
   */
  async getFlightDestinations(origin, options = {}) {
    try {
      const params = {
        origin,
      };

      if (options.departureDate) params.departureDate = options.departureDate;
      if (options.oneWay !== undefined) params.oneWay = options.oneWay;
      if (options.duration) params.duration = options.duration;
      if (options.nonStop !== undefined) params.nonStop = options.nonStop;
      if (options.maxPrice) params.maxPrice = options.maxPrice;

      logger.info(`🌍 Getting flight destinations from: ${origin}`);

      const response = await amadeusClient.get('/v1/shopping/flight-destinations', params);

      logger.info(`✅ Found ${response.data?.length || 0} destinations`);
      return response;

    } catch (error) {
      logger.error('❌ Amadeus flight destinations error:', error.message);
      throw new Error('Failed to get flight destinations from Amadeus');
    }
  }

  /**
   * Airline Routes
   * API: GET /v1/airline/destinations
   * Purpose: Get routes served by an airline
   * 
   * @param {String} airlineCode - Airline IATA code
   * @param {String} departureDate - Departure date (YYYY-MM-DD)
   * @returns {Promise<Object>} Airline routes
   */
  async getAirlineRoutes(airlineCode, departureDate) {
    try {
      const params = {
        airlineCode,
      };

      // Note: departureDate is NOT supported by this endpoint
      // Remove if provided to avoid 400 error

      logger.info(`🛫 Getting routes for airline: ${airlineCode}`);

      const response = await amadeusClient.get('/v1/airline/destinations', params);

      logger.info('✅ Airline routes retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Amadeus airline routes error:', error.message);
      throw new Error('Failed to get airline routes from Amadeus');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check API Health
   * Tests connection to Amadeus API
   */
  async healthCheck() {
    try {
      // Try to get token as a health check
      const tokenStatus = amadeusClient.getTokenStatus();
      
      if (!tokenStatus.hasToken || !tokenStatus.isValid) {
        await amadeusClient.getAccessToken();
      }

      return {
        status: 'healthy',
        tokenValid: true,
        message: 'Amadeus API connection successful'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        tokenValid: false,
        message: error.message
      };
    }
  }
}

module.exports = new AmadeusFlightAPI();
