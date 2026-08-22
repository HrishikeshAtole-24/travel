/**
 * Amadeus Hotel API Implementation
 * All hotel-related APIs from Amadeus
 * 
 * APIs Implemented:
 * 1. Hotel List (by city, geocode, hotelIds)
 * 2. Hotel Name Autocomplete
 * 3. Hotel Ratings (Sentiments)
 * 4. Hotel Search (Offers & Pricing) - v3
 * 5. Hotel Booking
 * 
 * Documentation: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/hotels/
 */
const amadeusClient = require('./amadeus.client');
const logger = require('../../config/winstonLogger');

class AmadeusHotelAPI {

  // ═══════════════════════════════════════════════════════════════
  // 🏨 HOTEL LIST APIs (Reference Data)
  // ═══════════════════════════════════════════════════════════════

  /**
   * 1️⃣ Search Hotels by City Code
   * API: GET /v1/reference-data/locations/hotels/by-city
   * Purpose: Get list of hotels in a city
   * 
   * @param {Object} params
   * @param {string} params.cityCode - IATA city code (e.g., PAR, LON, BOM)
   * @param {number} [params.radius] - Search radius
   * @param {string} [params.radiusUnit] - KM or MILE (default: KM)
   * @param {string} [params.chainCodes] - Hotel chain codes (e.g., HL for Hilton)
   * @param {string} [params.amenities] - Comma-separated amenities
   * @param {string} [params.ratings] - Star ratings (1-5, comma-separated)
   * @param {string} [params.hotelSource] - ALL, BEDBANK, DIRECTCHAIN
   * @returns {Promise<Object>} List of hotels
   */
  async searchHotelsByCity(params) {
    try {
      const queryParams = {
        cityCode: params.cityCode,
      };

      if (params.radius) queryParams.radius = params.radius;
      if (params.radiusUnit) queryParams.radiusUnit = params.radiusUnit;
      if (params.chainCodes) queryParams.chainCodes = params.chainCodes;
      if (params.amenities) queryParams.amenities = params.amenities;
      if (params.ratings) queryParams.ratings = params.ratings;
      if (params.hotelSource) queryParams.hotelSource = params.hotelSource;

      logger.info('🏨 Searching hotels by city:', queryParams);

      const response = await amadeusClient.get(
        '/v1/reference-data/locations/hotels/by-city',
        queryParams,
        { timeout: 15000 }
      );

      logger.info(`✅ Found ${response.data?.length || 0} hotels in ${params.cityCode}`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel search by city error:', error.response?.data || error.message);
      throw new Error(`Failed to search hotels in city: ${params.cityCode}`);
    }
  }

  /**
   * 2️⃣ Search Hotels by Geocode
   * API: GET /v1/reference-data/locations/hotels/by-geocode
   * Purpose: Get list of hotels near coordinates
   * 
   * @param {Object} params
   * @param {number} params.latitude - Latitude
   * @param {number} params.longitude - Longitude
   * @param {number} [params.radius] - Search radius
   * @param {string} [params.radiusUnit] - KM or MILE
   * @param {string} [params.chainCodes] - Hotel chain codes
   * @param {string} [params.amenities] - Amenities filter
   * @param {string} [params.ratings] - Star ratings
   * @param {string} [params.hotelSource] - ALL, BEDBANK, DIRECTCHAIN
   * @returns {Promise<Object>} List of hotels
   */
  async searchHotelsByGeocode(params) {
    try {
      const queryParams = {
        latitude: params.latitude,
        longitude: params.longitude,
      };

      if (params.radius) queryParams.radius = params.radius;
      if (params.radiusUnit) queryParams.radiusUnit = params.radiusUnit;
      if (params.chainCodes) queryParams.chainCodes = params.chainCodes;
      if (params.amenities) queryParams.amenities = params.amenities;
      if (params.ratings) queryParams.ratings = params.ratings;
      if (params.hotelSource) queryParams.hotelSource = params.hotelSource;

      logger.info('🏨 Searching hotels by geocode:', { lat: params.latitude, lng: params.longitude });

      const response = await amadeusClient.get(
        '/v1/reference-data/locations/hotels/by-geocode',
        queryParams,
        { timeout: 15000 }
      );

      logger.info(`✅ Found ${response.data?.length || 0} hotels near coordinates`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel search by geocode error:', error.response?.data || error.message);
      throw new Error('Failed to search hotels by geocode');
    }
  }

  /**
   * 3️⃣ Search Hotels by Hotel IDs
   * API: GET /v1/reference-data/locations/hotels/by-hotels
   * Purpose: Get hotel info for specific hotel IDs
   * 
   * @param {string} hotelIds - Comma-separated Amadeus hotel IDs
   * @returns {Promise<Object>} Hotel details
   */
  async searchHotelsByIds(hotelIds) {
    try {
      logger.info('🏨 Fetching hotels by IDs:', hotelIds);

      const response = await amadeusClient.get(
        '/v1/reference-data/locations/hotels/by-hotels',
        { hotelIds },
        { timeout: 10000 }
      );

      logger.info(`✅ Found ${response.data?.length || 0} hotels by IDs`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel search by IDs error:', error.response?.data || error.message);
      throw new Error('Failed to search hotels by IDs');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔍 HOTEL AUTOCOMPLETE
  // ═══════════════════════════════════════════════════════════════

  /**
   * 4️⃣ Hotel Name Autocomplete
   * API: GET /v1/reference-data/locations/hotel
   * Purpose: Search hotels by keyword for autocomplete
   * 
   * @param {Object} params
   * @param {string} params.keyword - Search keyword (4-40 chars)
   * @param {string} params.subType - HOTEL_LEISURE or HOTEL_GDS
   * @param {string} [params.countryCode] - ISO 3166-1 alpha-2 country code
   * @param {string} [params.lang] - Language code (EN, FR, etc.)
   * @param {number} [params.max] - Max results (default: 20)
   * @returns {Promise<Object>} Match list of hotel names
   */
  async autocompleteHotels(params) {
    try {
      const queryParams = {
        keyword: params.keyword,
        subType: params.subType || 'HOTEL_LEISURE',
      };

      if (params.countryCode) queryParams.countryCode = params.countryCode;
      if (params.lang) queryParams.lang = params.lang;
      if (params.max) queryParams.max = params.max;

      logger.info('🔍 Hotel autocomplete:', queryParams);

      const response = await amadeusClient.get(
        '/v1/reference-data/locations/hotel',
        queryParams,
        { timeout: 8000 }
      );

      logger.info(`✅ Hotel autocomplete returned ${response.data?.length || 0} results`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel autocomplete error:', error.response?.data || error.message);
      throw new Error('Failed to autocomplete hotel names');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ⭐ HOTEL RATINGS (Sentiments)
  // ═══════════════════════════════════════════════════════════════

  /**
   * 5️⃣ Hotel Ratings / Sentiments
   * API: GET /v2/e-reputation/hotel-sentiments
   * Purpose: Get sentiment analysis of hotel reviews
   * 
   * @param {string} hotelIds - Comma-separated Amadeus hotel IDs (max 3)
   * @returns {Promise<Object>} Sentiment ratings for hotels
   */
  async getHotelRatings(hotelIds) {
    try {
      logger.info('⭐ Getting hotel ratings for:', hotelIds);

      const response = await amadeusClient.get(
        '/v2/e-reputation/hotel-sentiments',
        { hotelIds },
        { timeout: 10000 }
      );

      logger.info(`✅ Got ratings for ${response.data?.length || 0} hotels`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel ratings error:', error.response?.data || error.message);
      throw new Error('Failed to get hotel ratings');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 💰 HOTEL SEARCH / OFFERS (v3 - Real-Time Pricing)
  // ═══════════════════════════════════════════════════════════════

  /**
   * 6️⃣ Hotel Offers Search (v3)
   * API: GET /v3/shopping/hotel-offers
   * Purpose: Get available rooms with real-time prices
   * 
   * @param {Object} params
   * @param {string} params.hotelIds - Comma-separated Amadeus hotel IDs
   * @param {number} [params.adults] - Number of adults (default: 1)
   * @param {string} [params.checkInDate] - Check-in date (YYYY-MM-DD)
   * @param {string} [params.checkOutDate] - Check-out date (YYYY-MM-DD)
   * @param {number} [params.roomQuantity] - Number of rooms (1-9)
   * @param {string} [params.priceRange] - Price range (e.g., 100-300)
   * @param {string} [params.currency] - Currency code (EUR, USD, INR)
   * @param {string} [params.paymentPolicy] - NONE, GUARANTEE, DEPOSIT
   * @param {string} [params.boardType] - ROOM_ONLY, BREAKFAST, etc.
   * @returns {Promise<Object>} Hotel offers with pricing
   */
  async searchHotelOffers(params) {
    try {
      const queryParams = {
        hotelIds: params.hotelIds,
        adults: params.adults || 1,
      };

      if (params.checkInDate) queryParams.checkInDate = params.checkInDate;
      if (params.checkOutDate) queryParams.checkOutDate = params.checkOutDate;
      if (params.roomQuantity) queryParams.roomQuantity = params.roomQuantity;
      if (params.priceRange) queryParams.priceRange = params.priceRange;
      if (params.currency) queryParams.currency = params.currency;
      if (params.paymentPolicy) queryParams.paymentPolicy = params.paymentPolicy;
      if (params.boardType) queryParams.boardType = params.boardType;

      logger.info('💰 Searching hotel offers:', queryParams);

      const response = await amadeusClient.get(
        '/v3/shopping/hotel-offers',
        queryParams,
        { timeout: 20000 }
      );

      logger.info(`✅ Got offers for ${response.data?.length || 0} hotels`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel offers search error:', error.response?.data || error.message);
      throw new Error('Failed to search hotel offers');
    }
  }

  /**
   * 7️⃣ Get Hotel Offer by ID (Price Validation)
   * API: GET /v3/shopping/hotel-offers/{offerId}
   * Purpose: Validate and get latest price for a specific offer
   * 
   * @param {string} offerId - Hotel offer ID
   * @returns {Promise<Object>} Validated hotel offer
   */
  async getHotelOfferById(offerId) {
    try {
      logger.info('🔍 Getting hotel offer:', offerId);

      const response = await amadeusClient.get(
        `/v3/shopping/hotel-offers/${offerId}`,
        {},
        { timeout: 15000 }
      );

      logger.info('✅ Hotel offer retrieved');
      return response;

    } catch (error) {
      logger.error('❌ Get hotel offer error:', error.response?.data || error.message);
      throw new Error('Failed to get hotel offer');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎫 HOTEL BOOKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * 8️⃣ Create Hotel Booking
   * API: POST /v2/booking/hotel-orders
   * Purpose: Book a hotel room
   * 
   * @param {Object} bookingData
   * @param {string} bookingData.offerId - Hotel offer ID from search
   * @param {Array} bookingData.guests - Guest information
   * @param {Array} bookingData.payments - Payment information
   * @param {Array} [bookingData.rooms] - Room-guest distribution
   * @returns {Promise<Object>} Booking confirmation
   */
  async createHotelBooking(bookingData) {
    try {
      const requestBody = {
        data: {
          offerId: bookingData.offerId,
          guests: bookingData.guests,
          payments: bookingData.payments,
        }
      };

      // Add rooms distribution if provided
      if (bookingData.rooms) {
        requestBody.data.rooms = bookingData.rooms;
      }

      logger.info('🎫 Creating hotel booking for offer:', bookingData.offerId);

      const response = await amadeusClient.post(
        '/v2/booking/hotel-orders',
        requestBody,
        { timeout: 30000 }
      );

      logger.info('✅ Hotel booking created:', response.data?.[0]?.id || 'unknown');
      return response;

    } catch (error) {
      logger.error('❌ Hotel booking error:', error.response?.data || error.message);
      throw new Error('Failed to create hotel booking');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔧 HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Hotel API Health Check
   * Tests connectivity by searching hotels in a known city
   */
  async healthCheck() {
    try {
      const response = await this.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 5,
        radiusUnit: 'KM',
      });

      return {
        status: 'OK',
        hotelsFound: response.data?.length || 0,
        message: 'Hotel API is working'
      };
    } catch (error) {
      return {
        status: 'ERROR',
        message: error.message
      };
    }
  }
}

module.exports = new AmadeusHotelAPI();
