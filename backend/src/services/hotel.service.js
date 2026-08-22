/**
 * Hotel Service - Multi-Supplier Hotel Search & Business Logic
 * Wrapper API that handles hotel search, offers, ratings, and autocomplete
 * Follows same architecture pattern as flight.service.js
 */
const supplierFactory = require('../suppliers/supplierFactory');
const cacheRepo = require('../repository/cache.repo');
const { 
  mapHotelListData, 
  mapHotelOffersData,
  mapAmadeusHotelRatings,
  mapAmadeusHotelAutocomplete,
  validateHotelListData, 
  validateHotelOfferData,
  validateHotelSearchParams,
  validateHotelOfferSearchParams,
  transformHotelListData, 
  transformHotelOfferData 
} = require('../assembly_line');
const { HotelResponseBuilder, buildHotelDictionaries } = require('../core/HotelResponseFormat');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');

class HotelService {

  // ═══════════════════════════════════════════════════════════════
  // 🏨 HOTEL LIST SEARCH
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search hotels by city
   * @param {Object} searchParams - { cityCode, radius, radiusUnit, chainCodes, amenities, ratings, hotelSource }
   * @param {Object} options - Sorting, pagination
   * @returns {Object} Industry-standard hotel list response
   */
  async searchHotelsByCity(searchParams, options = {}) {
    const startTime = Date.now();

    try {
      // Step 1: Validate search parameters
      const validation = validateHotelSearchParams(searchParams);
      if (!validation.valid) {
        throw ApiError.badRequest('Invalid hotel search parameters', validation.errors);
      }

      // Step 2: Check cache
      const cacheKey = this.generateCacheKey('hotel_city', searchParams);
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        logger.info('✅ Hotel city data retrieved from cache');
        return cachedData;
      }

      // Step 3: Call supplier
      const supplier = supplierFactory('amadeus');
      const rawData = await supplier.searchHotelsByCity(searchParams);

      // Step 4: Assembly Line → Map → Validate → Transform
      const mapped = mapHotelListData(rawData, 'amadeus');
      const validated = validateHotelListData(mapped);
      const transformed = transformHotelListData(validated);

      // Step 5: Paginate
      const page = parseInt(options.page) || 1;
      const pageSize = parseInt(options.pageSize) || 50;
      const startIndex = (page - 1) * pageSize;
      const paginatedData = transformed.slice(startIndex, startIndex + pageSize);

      // Step 6: Build dictionaries
      const dictionaries = buildHotelDictionaries(paginatedData);

      // Step 7: Build response
      const response = new HotelResponseBuilder()
        .setMeta({
          currency: searchParams.currency || 'USD',
          totalResults: transformed.length,
          page,
          pageSize,
          sorting: options.sortBy || 'RELEVANCE',
          suppliersUsed: ['amadeus'],
          requestId: `${Date.now()}_hotel_${searchParams.cityCode}`,
          responseTimeMs: Date.now() - startTime
        })
        .setSearch({
          type: 'HOTEL_LIST_BY_CITY',
          cityCode: searchParams.cityCode,
          radius: searchParams.radius || null,
          radiusUnit: searchParams.radiusUnit || 'KM',
          ratings: searchParams.ratings || null,
          amenities: searchParams.amenities || null,
          hotelSource: searchParams.hotelSource || 'ALL'
        })
        .addOffers(paginatedData)
        .setDictionaries(dictionaries)
        .build();

      // Step 8: Cache result (TTL: 30 minutes for hotel lists)
      await cacheRepo.set(cacheKey, response, 1800);

      logger.info(`✅ Hotel city search completed: ${paginatedData.length} hotels (${Date.now() - startTime}ms)`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel city search error:', error);
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('Failed to search hotels by city');
    }
  }

  /**
   * Search hotels by geocode (latitude/longitude)
   * @param {Object} searchParams - { latitude, longitude, radius, ... }
   * @param {Object} options - Sorting, pagination
   * @returns {Object} Industry-standard hotel list response
   */
  async searchHotelsByGeocode(searchParams, options = {}) {
    const startTime = Date.now();

    try {
      if (!searchParams.latitude || !searchParams.longitude) {
        throw ApiError.badRequest('latitude and longitude are required');
      }

      // Check cache
      const cacheKey = this.generateCacheKey('hotel_geo', searchParams);
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        logger.info('✅ Hotel geocode data retrieved from cache');
        return cachedData;
      }

      const supplier = supplierFactory('amadeus');
      const rawData = await supplier.searchHotelsByGeocode(searchParams);

      const mapped = mapHotelListData(rawData, 'amadeus');
      const validated = validateHotelListData(mapped);
      const transformed = transformHotelListData(validated);

      const page = parseInt(options.page) || 1;
      const pageSize = parseInt(options.pageSize) || 50;
      const startIndex = (page - 1) * pageSize;
      const paginatedData = transformed.slice(startIndex, startIndex + pageSize);

      const dictionaries = buildHotelDictionaries(paginatedData);

      const response = new HotelResponseBuilder()
        .setMeta({
          currency: searchParams.currency || 'USD',
          totalResults: transformed.length,
          page,
          pageSize,
          sorting: options.sortBy || 'DISTANCE',
          suppliersUsed: ['amadeus'],
          requestId: `${Date.now()}_hotel_geo`,
          responseTimeMs: Date.now() - startTime
        })
        .setSearch({
          type: 'HOTEL_LIST_BY_GEOCODE',
          latitude: searchParams.latitude,
          longitude: searchParams.longitude,
          radius: searchParams.radius || null,
          radiusUnit: searchParams.radiusUnit || 'KM'
        })
        .addOffers(paginatedData)
        .setDictionaries(dictionaries)
        .build();

      await cacheRepo.set(cacheKey, response, 1800);

      logger.info(`✅ Hotel geocode search completed: ${paginatedData.length} hotels (${Date.now() - startTime}ms)`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel geocode search error:', error);
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('Failed to search hotels by geocode');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 💰 HOTEL OFFERS (Availability & Pricing)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search hotel offers (availability + pricing) - v3
   * @param {Object} searchParams - { hotelIds, adults, checkInDate, checkOutDate, roomQuantity, ... }
   * @param {Object} options - Sorting, pagination, filters
   * @returns {Object} Industry-standard hotel offers response
   */
  async searchHotelOffers(searchParams, options = {}) {
    const startTime = Date.now();

    try {
      // Step 1: Validate
      const validation = validateHotelOfferSearchParams(searchParams);
      if (!validation.valid) {
        throw ApiError.badRequest('Invalid hotel offer search parameters', validation.errors);
      }

      // Step 2: Check cache
      const cacheKey = this.generateCacheKey('hotel_offers', searchParams);
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        logger.info('✅ Hotel offers data retrieved from cache');
        return cachedData;
      }

      // Step 3: Call supplier
      const supplier = supplierFactory('amadeus');
      const rawData = await supplier.searchHotelOffers(searchParams);

      // Step 4: Assembly Line → Map → Validate → Transform
      const mapped = mapHotelOffersData(rawData, 'amadeus');
      const validated = validateHotelOfferData(mapped);
      const transformed = transformHotelOfferData(validated);

      // Step 5: Sort
      const sortedOffers = this.sortHotelOffers(transformed, options.sortBy || 'PRICE_ASC');

      // Step 6: Paginate
      const page = parseInt(options.page) || 1;
      const pageSize = parseInt(options.pageSize) || 50;
      const startIndex = (page - 1) * pageSize;
      const paginatedData = sortedOffers.slice(startIndex, startIndex + pageSize);

      // Step 7: Build dictionaries
      const dictionaries = buildHotelDictionaries(paginatedData);

      // Step 8: Build response
      const response = new HotelResponseBuilder()
        .setMeta({
          currency: searchParams.currency || 'USD',
          totalResults: sortedOffers.length,
          page,
          pageSize,
          sorting: options.sortBy || 'PRICE_ASC',
          suppliersUsed: ['amadeus'],
          requestId: `${Date.now()}_hotel_offers`,
          responseTimeMs: Date.now() - startTime
        })
        .setSearch({
          type: 'HOTEL_OFFERS',
          hotelIds: searchParams.hotelIds,
          checkInDate: searchParams.checkInDate || null,
          checkOutDate: searchParams.checkOutDate || null,
          adults: parseInt(searchParams.adults) || 1,
          roomQuantity: parseInt(searchParams.roomQuantity) || 1,
          currency: searchParams.currency || null,
          boardType: searchParams.boardType || null,
          paymentPolicy: searchParams.paymentPolicy || null
        })
        .addOffers(paginatedData)
        .setDictionaries(dictionaries)
        .build();

      // Step 9: Cache (TTL: 5 minutes for offers - prices change fast)
      await cacheRepo.set(cacheKey, response, 300);

      logger.info(`✅ Hotel offers search completed: ${paginatedData.length} offers (${Date.now() - startTime}ms)`);
      return response;

    } catch (error) {
      logger.error('❌ Hotel offers search error:', error);
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('Failed to search hotel offers');
    }
  }

  /**
   * Get hotel offer by ID (Price validation)
   * @param {string} offerId - Hotel offer ID
   * @returns {Object} Validated hotel offer
   */
  async getHotelOfferById(offerId) {
    try {
      if (!offerId) {
        throw ApiError.badRequest('Offer ID is required');
      }

      logger.info('🔍 Getting hotel offer by ID:', offerId);

      const supplier = supplierFactory('amadeus');
      const rawData = await supplier.getHotelOfferById(offerId);

      // Map and validate the single offer
      const mapped = mapHotelOffersData(rawData, 'amadeus');
      const validated = validateHotelOfferData(mapped);
      const transformed = transformHotelOfferData(validated);

      if (transformed.length === 0) {
        throw ApiError.notFound('Hotel offer not found or expired');
      }

      logger.info('✅ Hotel offer validated');
      return transformed[0];

    } catch (error) {
      logger.error('❌ Get hotel offer error:', error);
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('Failed to get hotel offer');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ⭐ HOTEL RATINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get hotel ratings/sentiments
   * @param {string} hotelIds - Comma-separated hotel IDs (max 3)
   * @returns {Object} Hotel ratings
   */
  async getHotelRatings(hotelIds) {
    try {
      if (!hotelIds) {
        throw ApiError.badRequest('Hotel IDs are required');
      }

      // Check cache
      const cacheKey = `hotel_ratings:${hotelIds}`;
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const supplier = supplierFactory('amadeus');
      const rawData = await supplier.getHotelRatings(hotelIds);

      const mappedRatings = mapAmadeusHotelRatings(rawData);

      // Cache for 24 hours (ratings don't change frequently)
      await cacheRepo.set(cacheKey, mappedRatings, 86400);

      logger.info(`✅ Got ratings for ${mappedRatings.length} hotels`);
      return mappedRatings;

    } catch (error) {
      logger.error('❌ Hotel ratings error:', error);
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('Failed to get hotel ratings');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔍 HOTEL AUTOCOMPLETE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Hotel name autocomplete
   * @param {Object} params - { keyword, subType, countryCode, lang, max }
   * @returns {Array} Autocomplete results
   */
  async autocompleteHotels(params) {
    try {
      if (!params.keyword || params.keyword.length < 3) {
        throw ApiError.badRequest('Keyword must be at least 3 characters');
      }

      // Check cache
      const cacheKey = `hotel_auto:${params.keyword}:${params.subType || 'HOTEL_LEISURE'}`;
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const supplier = supplierFactory('amadeus');
      const rawData = await supplier.autocompleteHotels(params);

      const mappedResults = mapAmadeusHotelAutocomplete(rawData);

      // Cache for 1 hour
      await cacheRepo.set(cacheKey, mappedResults, 3600);

      logger.info(`✅ Hotel autocomplete returned ${mappedResults.length} results`);
      return mappedResults;

    } catch (error) {
      logger.error('❌ Hotel autocomplete error:', error);
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('Failed to autocomplete hotel names');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Sort hotel offers
   * @param {Array} offers - Hotel offers
   * @param {string} sortBy - Sort criteria
   * @returns {Array} Sorted offers
   */
  sortHotelOffers(offers, sortBy = 'PRICE_ASC') {
    const sortFunctions = {
      PRICE_ASC: (a, b) => a.pricing.totalAmount - b.pricing.totalAmount,
      PRICE_DESC: (a, b) => b.pricing.totalAmount - a.pricing.totalAmount,
      RATING_DESC: (a, b) => (b.hotel?.rating || 0) - (a.hotel?.rating || 0),
      NAME_ASC: (a, b) => (a.hotel?.name || '').localeCompare(b.hotel?.name || ''),
    };

    const sortFn = sortFunctions[sortBy] || sortFunctions.PRICE_ASC;
    return [...offers].sort(sortFn);
  }

  /**
   * Generate cache key
   * @param {string} prefix - Cache key prefix
   * @param {Object} params - Parameters
   * @returns {string} Cache key
   */
  generateCacheKey(prefix, params) {
    const parts = [prefix];
    
    // Add relevant params to key
    Object.keys(params).sort().forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        parts.push(`${key}:${params[key]}`);
      }
    });

    return parts.join(':').toLowerCase();
  }
}

module.exports = new HotelService();
