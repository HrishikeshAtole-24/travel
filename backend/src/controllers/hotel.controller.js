/**
 * Hotel Controller - Request/Response Handling
 * Handles HTTP requests for hotel search, offers, ratings, and autocomplete
 * Delegates to hotel.service.js
 */
const hotelService = require('../services/hotel.service');
const ApiResponse = require('../core/ApiResponse');
const { StatusCodes } = require('../core/StatusCodes');

class HotelController {

  // ═══════════════════════════════════════════════════════════════
  // 🏨 HOTEL LIST ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search hotels by city code
   * GET /api/hotels/search/city
   * Query: cityCode, radius, radiusUnit, chainCodes, amenities, ratings, hotelSource, page, pageSize
   */
  async searchByCity(req, res) {
    const {
      cityCode,
      radius,
      radiusUnit,
      chainCodes,
      amenities,
      ratings,
      hotelSource,
      page,
      pageSize,
      sortBy
    } = req.query;

    const searchParams = {
      cityCode,
      radius: radius || null,
      radiusUnit: radiusUnit || null,
      chainCodes: chainCodes || null,
      amenities: amenities || null,
      ratings: ratings || null,
      hotelSource: hotelSource || null,
    };

    const options = {
      page: page || 1,
      pageSize: pageSize || 50,
      sortBy: sortBy || 'RELEVANCE'
    };

    const result = await hotelService.searchHotelsByCity(searchParams, options);

    res.status(StatusCodes.OK).json(result);
  }

  /**
   * Search hotels by geocode (latitude/longitude)
   * GET /api/hotels/search/geocode
   * Query: latitude, longitude, radius, radiusUnit, amenities, ratings, hotelSource, page, pageSize
   */
  async searchByGeocode(req, res) {
    const {
      latitude,
      longitude,
      radius,
      radiusUnit,
      chainCodes,
      amenities,
      ratings,
      hotelSource,
      page,
      pageSize,
      sortBy
    } = req.query;

    const searchParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: radius || null,
      radiusUnit: radiusUnit || null,
      chainCodes: chainCodes || null,
      amenities: amenities || null,
      ratings: ratings || null,
      hotelSource: hotelSource || null,
    };

    const options = {
      page: page || 1,
      pageSize: pageSize || 50,
      sortBy: sortBy || 'DISTANCE'
    };

    const result = await hotelService.searchHotelsByGeocode(searchParams, options);

    res.status(StatusCodes.OK).json(result);
  }

  // ═══════════════════════════════════════════════════════════════
  // 💰 HOTEL OFFERS (Pricing & Availability)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search hotel offers (availability + pricing)
   * GET /api/hotels/offers
   * Query: hotelIds, adults, checkInDate, checkOutDate, roomQuantity, currency, priceRange, boardType, paymentPolicy
   */
  async searchOffers(req, res) {
    const {
      hotelIds,
      adults,
      checkInDate,
      checkOutDate,
      roomQuantity,
      currency,
      priceRange,
      boardType,
      paymentPolicy,
      page,
      pageSize,
      sortBy
    } = req.query;

    const searchParams = {
      hotelIds,
      adults: adults || 1,
      checkInDate: checkInDate || null,
      checkOutDate: checkOutDate || null,
      roomQuantity: roomQuantity || 1,
      currency: currency || null,
      priceRange: priceRange || null,
      boardType: boardType || null,
      paymentPolicy: paymentPolicy || null,
    };

    const options = {
      page: page || 1,
      pageSize: pageSize || 50,
      sortBy: sortBy || 'PRICE_ASC'
    };

    const result = await hotelService.searchHotelOffers(searchParams, options);

    res.status(StatusCodes.OK).json(result);
  }

  /**
   * Get specific hotel offer by ID (price validation)
   * GET /api/hotels/offers/:offerId
   */
  async getOfferById(req, res) {
    const { offerId } = req.params;

    const result = await hotelService.getHotelOfferById(offerId);

    return ApiResponse.success(
      res,
      result,
      'Hotel offer retrieved and validated',
      StatusCodes.OK
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ⭐ HOTEL RATINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get hotel ratings/sentiments
   * GET /api/hotels/ratings
   * Query: hotelIds (comma-separated, max 3)
   */
  async getRatings(req, res) {
    const { hotelIds } = req.query;

    const result = await hotelService.getHotelRatings(hotelIds);

    return ApiResponse.success(
      res,
      result,
      'Hotel ratings retrieved',
      StatusCodes.OK
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔍 HOTEL AUTOCOMPLETE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Hotel name autocomplete
   * GET /api/hotels/autocomplete
   * Query: keyword, subType, countryCode, lang, max
   */
  async autocomplete(req, res) {
    const { keyword, subType, countryCode, lang, max } = req.query;

    const result = await hotelService.autocompleteHotels({
      keyword,
      subType: subType || 'HOTEL_LEISURE',
      countryCode: countryCode || null,
      lang: lang || null,
      max: max ? parseInt(max) : null
    });

    return ApiResponse.success(
      res,
      result,
      'Hotel autocomplete results',
      StatusCodes.OK
    );
  }
}

module.exports = new HotelController();
