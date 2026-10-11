/**
 * Hotel Controller - Request/Response Handling
 * Handles HTTP requests for hotel search, offers, ratings, and autocomplete
 * Delegates to hotel.service.js
 */
const hotelService = require('../services/hotel.service');
const ApiResponse = require('../core/ApiResponse');
const { StatusCodes } = require('../core/StatusCodes');

/**
 * Stay parameters shared by hotel search and hotel details
 */
function parseStayParams(query) {
  return {
    checkInDate: query.checkInDate || null,
    checkOutDate: query.checkOutDate || null,
    adults: Math.min(Math.max(parseInt(query.adults) || 2, 1), 18),
    roomQuantity: Math.min(Math.max(parseInt(query.rooms || query.roomQuantity) || 1, 1), 9),
    childrenAges: query.childrenAges
      ? String(query.childrenAges).split(',').map(a => parseInt(a)).filter(a => !isNaN(a) && a >= 0 && a < 18)
      : []
  };
}

class HotelController {

  // ═══════════════════════════════════════════════════════════════
  // 🔎 HOTEL SEARCH / DETAILS / DESTINATIONS (booking site)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Destination autocomplete
   * GET /api/hotels/destinations?q=goa
   */
  async destinations(req, res) {
    const result = await hotelService.searchDestinations(req.query.q || '');
    return ApiResponse.success(res, result, 'Destinations', StatusCodes.OK);
  }

  /**
   * Search hotels in a destination (one card per hotel)
   * GET /api/hotels/search?cityName=Goa&countryCode=IN&checkInDate=...&checkOutDate=...&adults=2&rooms=1&childrenAges=5,8&sortBy=PRICE_ASC
   */
  async searchHotels(req, res) {
    const { cityName, countryCode, latitude, longitude, hotelIds, sortBy } = req.query;

    const result = await hotelService.searchHotels({
      ...parseStayParams(req.query),
      cityName: cityName || null,
      countryCode: countryCode ? String(countryCode).toUpperCase() : null,
      latitude: latitude || null,
      longitude: longitude || null,
      hotelIds: hotelIds || null
    }, { sortBy: sortBy || 'POPULARITY' });

    return ApiResponse.success(res, result, 'Hotels found', StatusCodes.OK);
  }

  /**
   * Hotel details with room rates for the stay
   * GET /api/hotels/:hotelId/details?checkInDate=...&checkOutDate=...&adults=2&rooms=1
   */
  async getHotelDetails(req, res) {
    const result = await hotelService.getHotelDetails(req.params.hotelId, parseStayParams(req.query));
    return ApiResponse.success(res, result, 'Hotel details', StatusCodes.OK);
  }

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
   * Query: (hotelIds | cityName+countryCode | latitude+longitude[,radius]), checkInDate, checkOutDate,
   *        adults, roomQuantity, childrenAges (e.g. 5,9), starRating (e.g. 4,5), minRating, refundableOnly,
   *        priceRange, boardType, paymentPolicy, page, pageSize, sortBy
   */
  async searchOffers(req, res) {
    const {
      hotelIds,
      cityName,
      countryCode,
      latitude,
      longitude,
      radius,
      childrenAges,
      starRating,
      minRating,
      refundableOnly,
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
      hotelIds: hotelIds || null,
      cityName: cityName || null,
      countryCode: countryCode ? String(countryCode).toUpperCase() : null,
      latitude: latitude || null,
      longitude: longitude || null,
      radius: radius || null,
      childrenAges: childrenAges ? String(childrenAges).split(',').map(a => parseInt(a)).filter(a => !isNaN(a)) : [],
      starRating: starRating || null,
      minRating: minRating || null,
      refundableOnly: refundableOnly === 'true',
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
