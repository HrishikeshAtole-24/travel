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
const SupplierConfigManager = require('../config/suppliers.config');
const { LITEAPI_OFFER_PREFIX } = require('../assembly_line/mappers/hotel.mapper');
const { mapLiteApiHotelDetails } = require('../assembly_line/mappers/hotelContent.mapper');

// Board types that include breakfast (LiteAPI codes: BB, HB, FB, AI, ...)
const BREAKFAST_BOARDS = ['BB', 'BI', 'HB', 'FB', 'AI', 'BREAKFAST'];

// Popular destinations shown before the user types, and international cities
// (LiteAPI's city list is per country; India is our home market)
const POPULAR_DESTINATIONS = [
  ['Goa', 'IN'], ['Mumbai', 'IN'], ['New Delhi', 'IN'], ['Bangalore', 'IN'], ['Jaipur', 'IN'],
  ['Udaipur', 'IN'], ['Manali', 'IN'], ['Hyderabad', 'IN'], ['Chennai', 'IN'], ['Kochi', 'IN']
];
const INTERNATIONAL_DESTINATIONS = [
  ['Dubai', 'AE', 'United Arab Emirates'], ['Abu Dhabi', 'AE', 'United Arab Emirates'], ['Singapore', 'SG', 'Singapore'],
  ['Bangkok', 'TH', 'Thailand'], ['Phuket', 'TH', 'Thailand'], ['Pattaya', 'TH', 'Thailand'],
  ['Kuala Lumpur', 'MY', 'Malaysia'], ['Male', 'MV', 'Maldives'], ['Colombo', 'LK', 'Sri Lanka'],
  ['Kathmandu', 'NP', 'Nepal'], ['London', 'GB', 'United Kingdom'], ['Paris', 'FR', 'France'],
  ['New York', 'US', 'United States'], ['Tokyo', 'JP', 'Japan'], ['Istanbul', 'TR', 'Turkey'],
  ['Hong Kong', 'HK', 'Hong Kong'], ['Doha', 'QA', 'Qatar'], ['Bali', 'ID', 'Indonesia']
];
const COUNTRY_NAMES = { IN: 'India' };
const CITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cityCache = new Map(); // countryCode → { cities, fetchedAt }

const toDestination = (cityName, countryCode, countryName) => ({
  cityName,
  countryCode,
  label: `${cityName}, ${countryName || COUNTRY_NAMES[countryCode] || countryCode}`
});

// Currency hotel prices are shown and charged in (Razorpay India charges INR)
const CHARGE_CURRENCY = process.env.CHARGE_CURRENCY || 'INR';

/**
 * Supplier used for hotel offers: the highest-priority active hotel supplier
 * (LiteAPI when configured; Amadeus Self-Service was decommissioned)
 */
const getHotelSupplierCode = () =>
  SupplierConfigManager.getActiveSuppliers('hotels')[0]?.code || 'amadeus';

/**
 * Work out which supplier issued an offer ID.
 * Accepts our standard IDs (HOTEL_OFFER_LITEAPI_..., HOTEL_OFFER_...) or a raw supplier ID.
 * @returns {{ supplier: string, supplierOfferId: string }}
 */
const parseHotelOfferId = (offerId) => {
  const id = String(offerId);
  if (id.startsWith(LITEAPI_OFFER_PREFIX)) {
    return { supplier: 'liteapi', supplierOfferId: id.slice(LITEAPI_OFFER_PREFIX.length) };
  }
  if (id.startsWith('HOTEL_OFFER_')) {
    return { supplier: 'amadeus', supplierOfferId: id.slice('HOTEL_OFFER_'.length) };
  }
  return { supplier: getHotelSupplierCode(), supplierOfferId: id };
};

/**
 * Tag offers with the supplier name shown to customers ("via Nuitée")
 */
const tagSupplier = (offers, supplierCode) => {
  const supplierName = SupplierConfigManager.getDisplayName(supplierCode);
  offers.forEach(offer => { offer.source.supplierName = supplierName; });
  return offers;
};

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
      const supplierCode = getHotelSupplierCode();
      const supplier = supplierFactory(supplierCode);
      const rawData = await supplier.searchHotelOffers({ ...searchParams, currency: CHARGE_CURRENCY });

      // Step 4: Assembly Line → Map → Validate → Transform
      const mapped = mapHotelOffersData(rawData, supplierCode);
      const validated = validateHotelOfferData(mapped);
      const transformed = tagSupplier(transformHotelOfferData(validated), supplierCode);

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
          currency: CHARGE_CURRENCY,
          totalResults: sortedOffers.length,
          page,
          pageSize,
          sorting: options.sortBy || 'PRICE_ASC',
          suppliersUsed: [supplierCode],
          requestId: `${Date.now()}_hotel_offers`,
          responseTimeMs: Date.now() - startTime
        })
        .setSearch({
          type: 'HOTEL_OFFERS',
          hotelIds: searchParams.hotelIds || null,
          cityName: searchParams.cityName || null,
          countryCode: searchParams.countryCode || null,
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

      const { supplier: supplierCode, supplierOfferId } = parseHotelOfferId(offerId);
      logger.info(`🔍 Confirming hotel offer with ${supplierCode}`);

      const supplier = supplierFactory(supplierCode);
      // LiteAPI confirms price/availability via prebook; the prebookId is reused to book after payment
      const rawData = supplierCode === 'liteapi'
        ? await supplier.prebookHotelOffer(supplierOfferId)
        : await supplier.getHotelOfferById(supplierOfferId);

      // Map and validate the single offer
      const mapped = mapHotelOffersData(rawData, supplierCode);
      const validated = validateHotelOfferData(mapped);
      const transformed = tagSupplier(transformHotelOfferData(validated), supplierCode);

      if (transformed.length === 0) {
        throw ApiError.notFound('Hotel offer not found or expired');
      }

      logger.info('✅ Hotel offer validated');
      return transformed[0];

    } catch (error) {
      logger.error('❌ Get hotel offer error:', error.message);
      if (error instanceof ApiError) throw error;
      // Supplier rejected the offer (expired / sold out)
      if (error.status >= 400 && error.status < 500) {
        throw ApiError.badRequest('This room is no longer available at this price. Please search again.');
      }
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

  // ═══════════════════════════════════════════════════════════════
  // 🔎 HOTEL SEARCH (one card per hotel) / DETAILS / DESTINATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search hotels in a destination and return one card per hotel (cheapest room).
   * @param {Object} searchParams - { cityName+countryCode | latitude+longitude | hotelIds, checkInDate, checkOutDate, adults, roomQuantity, childrenAges }
   * @param {Object} options - { sortBy: POPULARITY | PRICE_ASC | PRICE_DESC | STARS_DESC | RATING_DESC }
   */
  async searchHotels(searchParams, options = {}) {
    const startTime = Date.now();

    const validation = validateHotelOfferSearchParams(searchParams);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.errors[0], validation.errors);
    }

    const cacheKey = this.generateCacheKey('hotel_search', { ...searchParams, childrenAges: (searchParams.childrenAges || []).join('-') });
    let cards = await cacheRepo.get(cacheKey);

    const supplierCode = getHotelSupplierCode();

    if (!cards) {
      try {
        const supplier = supplierFactory(supplierCode);
        const rawData = await supplier.searchHotelOffers({
          ...searchParams,
          currency: CHARGE_CURRENCY,
          maxRatesPerHotel: 10,
          limit: 100,
          sort: 'popularity'
        });

        const offers = tagSupplier(
          transformHotelOfferData(validateHotelOfferData(mapHotelOffersData(rawData, supplierCode))),
          supplierCode
        );

        // Group by hotel, keeping the supplier's popularity order
        const byHotel = new Map();
        offers.forEach(offer => {
          const hotelId = offer.hotel?.hotelId;
          if (!hotelId) return;
          if (!byHotel.has(hotelId)) byHotel.set(hotelId, []);
          byHotel.get(hotelId).push(offer);
        });

        cards = [...byHotel.values()].map((hotelOffers, index) => {
          const cheapest = hotelOffers.reduce((min, o) => (o.pricing.totalAmount < min.pricing.totalAmount ? o : min));
          const hotel = cheapest.hotel;
          return {
            hotelId: hotel.hotelId,
            name: hotel.name,
            photo: hotel.photo,
            thumbnail: hotel.thumbnail,
            address: hotel.address,
            cityName: hotel.cityName,
            countryCode: hotel.countryCode,
            stars: hotel.stars,
            rating: hotel.rating,
            reviewCount: hotel.reviewCount,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            currency: cheapest.pricing.totalCurrency,
            nights: cheapest.computed.nights,
            minPrice: cheapest.pricing.totalAmount,
            minPricePerNight: cheapest.computed.pricePerNight,
            payAtPropertyAmount: Math.round((cheapest.pricing.payAtProperty || []).reduce((sum, f) => sum + f.amount, 0) * 100) / 100,
            cheapestRoomName: cheapest.room?.description || null,
            cheapestBoardName: cheapest.boardName || null,
            hasFreeCancellation: hotelOffers.some(o => o.computed.cancellationType === 'FREE_CANCELLATION_UNTIL_DEADLINE' || o.computed.isFreeCancellation),
            hasBreakfast: hotelOffers.some(o => BREAKFAST_BOARDS.includes(String(o.boardType || '').toUpperCase())),
            offersCount: hotelOffers.length,
            supplier: cheapest.source.supplier,
            supplierName: cheapest.source.supplierName,
            popularityRank: index + 1
          };
        });

        // Short TTL: prices and availability change quickly
        await cacheRepo.set(cacheKey, cards, 300);
      } catch (error) {
        logger.error('❌ Hotel search error:', error.message);
        if (error instanceof ApiError) throw error;
        if (error.status >= 400 && error.status < 500) {
          throw ApiError.badRequest(`Hotel search failed: ${error.message}`);
        }
        throw ApiError.internal('Failed to search hotels');
      }
    }

    const sorters = {
      POPULARITY: (a, b) => a.popularityRank - b.popularityRank,
      PRICE_ASC: (a, b) => a.minPrice - b.minPrice,
      PRICE_DESC: (a, b) => b.minPrice - a.minPrice,
      STARS_DESC: (a, b) => (b.stars || 0) - (a.stars || 0) || a.minPrice - b.minPrice,
      RATING_DESC: (a, b) => (b.rating || 0) - (a.rating || 0) || a.minPrice - b.minPrice
    };
    const sortBy = sorters[options.sortBy] ? options.sortBy : 'POPULARITY';
    const sorted = [...cards].sort(sorters[sortBy]);

    logger.info(`✅ Hotel search: ${sorted.length} hotels (${Date.now() - startTime}ms)`);

    return {
      meta: {
        currency: CHARGE_CURRENCY,
        totalResults: sorted.length,
        sorting: sortBy,
        suppliersUsed: [supplierCode],
        responseTimeMs: Date.now() - startTime
      },
      search: {
        cityName: searchParams.cityName || null,
        countryCode: searchParams.countryCode || null,
        checkInDate: searchParams.checkInDate,
        checkOutDate: searchParams.checkOutDate,
        adults: parseInt(searchParams.adults) || 1,
        roomQuantity: parseInt(searchParams.roomQuantity) || 1,
        childrenAges: searchParams.childrenAges || []
      },
      data: sorted
    };
  }

  /**
   * Hotel details page: content + live room rates for the stay, grouped by room
   * @param {string} hotelId
   * @param {Object} stayParams - { checkInDate, checkOutDate, adults, roomQuantity, childrenAges }
   */
  async getHotelDetails(hotelId, stayParams = {}) {
    const supplierCode = getHotelSupplierCode();
    if (supplierCode !== 'liteapi') {
      throw ApiError.badRequest('Hotel details are not available for this supplier');
    }

    const supplier = supplierFactory(supplierCode);
    const hasStay = Boolean(stayParams.checkInDate && stayParams.checkOutDate);

    try {
      const [content, rawRates] = await Promise.all([
        supplier.getHotelDetails(hotelId),
        hasStay
          ? supplier.searchHotelOffers({ ...stayParams, hotelIds: hotelId, currency: CHARGE_CURRENCY, maxRatesPerHotel: 60 })
          : Promise.resolve(null)
      ]);

      const hotel = mapLiteApiHotelDetails(content);
      if (!hotel) {
        throw ApiError.notFound('Hotel not found');
      }

      const offers = rawRates
        ? tagSupplier(transformHotelOfferData(validateHotelOfferData(mapHotelOffersData(rawRates, supplierCode))), supplierCode)
        : [];

      // Group rates under the room they belong to (mappedRoomId → content room, else by room name)
      const contentRooms = new Map(hotel.rooms.map(r => [String(r.roomId), r]));
      const groups = new Map();
      offers.forEach(offer => {
        const mapped = offer.room?.mappedRoomId ? contentRooms.get(String(offer.room.mappedRoomId)) : null;
        const key = mapped ? `room_${mapped.roomId}` : `name_${offer.room?.description}`;
        if (!groups.has(key)) {
          groups.set(key, {
            roomId: mapped?.roomId ?? null,
            name: mapped?.name || offer.room?.description || 'Room',
            description: mapped?.description || null,
            photos: mapped?.photos || [],
            sizeSqm: mapped?.sizeSqm ?? null,
            maxOccupancy: mapped?.maxOccupancy ?? offer.room?.maxOccupancy ?? null,
            bedTypes: mapped?.bedTypes || [],
            amenities: mapped?.amenities || [],
            views: mapped?.views || [],
            offers: []
          });
        }
        groups.get(key).offers.push({
          offerId: offer.id,
          rateName: offer.room?.description,
          boardType: offer.boardType,
          boardName: offer.boardName,
          refundable: Boolean(offer.policies?.refundable),
          cancellationType: offer.computed.cancellationType,
          cancellationText: offer.policies?.cancellation?.description || null,
          totalAmount: offer.pricing.totalAmount,
          pricePerNight: offer.computed.pricePerNight,
          currency: offer.pricing.totalCurrency,
          taxesAmount: offer.pricing.taxesAmount,
          payAtProperty: offer.pricing.payAtProperty || [],
          nights: offer.computed.nights,
          supplierName: offer.source.supplierName
        });
      });

      const rooms = [...groups.values()]
        .map(group => ({ ...group, offers: group.offers.sort((a, b) => a.totalAmount - b.totalAmount) }))
        .sort((a, b) => a.offers[0].totalAmount - b.offers[0].totalAmount);

      const cheapest = rooms[0]?.offers[0] || null;

      return {
        hotel: { ...hotel, rooms: undefined },
        stay: hasStay ? {
          checkInDate: stayParams.checkInDate,
          checkOutDate: stayParams.checkOutDate,
          adults: parseInt(stayParams.adults) || 1,
          roomQuantity: parseInt(stayParams.roomQuantity) || 1,
          childrenAges: stayParams.childrenAges || [],
          nights: cheapest?.nights || null
        } : null,
        fromPrice: cheapest ? {
          totalAmount: cheapest.totalAmount,
          pricePerNight: cheapest.pricePerNight,
          currency: cheapest.currency,
          taxesAmount: cheapest.taxesAmount
        } : null,
        rooms,
        supplierName: SupplierConfigManager.getDisplayName(supplierCode)
      };
    } catch (error) {
      logger.error('❌ Hotel details error:', error.message);
      if (error instanceof ApiError) throw error;
      if (error.status === 404) throw ApiError.notFound('Hotel not found');
      throw ApiError.internal('Failed to load hotel details');
    }
  }

  /**
   * Destination autocomplete: Indian cities from the supplier + popular international cities
   * @param {string} query
   * @returns {Promise<Array>} [{ cityName, countryCode, label }]
   */
  async searchDestinations(query = '') {
    const q = String(query).trim().toLowerCase();

    if (q.length < 2) {
      return POPULAR_DESTINATIONS.map(([city, cc]) => toDestination(city, cc))
        .concat(INTERNATIONAL_DESTINATIONS.slice(0, 4).map(([city, cc, name]) => toDestination(city, cc, name)));
    }

    let indianCities = [];
    const cached = cityCache.get('IN');
    if (cached && Date.now() - cached.fetchedAt < CITY_CACHE_TTL_MS) {
      indianCities = cached.cities;
    } else if (getHotelSupplierCode() === 'liteapi') {
      try {
        const cities = await supplierFactory('liteapi').getHotelCities('IN');
        indianCities = [...new Set(cities.map(c => c.city).filter(Boolean))];
        cityCache.set('IN', { cities: indianCities, fetchedAt: Date.now() });
      } catch (error) {
        logger.warn(`[Hotels] City list unavailable: ${error.message}`);
        indianCities = POPULAR_DESTINATIONS.map(([city]) => city);
      }
    }

    // Prefix matches first, then other substring matches; popular cities rank higher
    const popular = new Set(POPULAR_DESTINATIONS.map(([city]) => city.toLowerCase()));
    const score = (name) => {
      const n = name.toLowerCase();
      return (n.startsWith(q) ? 0 : 2) - (popular.has(n) ? 1 : 0);
    };

    const domestic = indianCities
      .filter(city => city.toLowerCase().includes(q))
      .sort((a, b) => score(a) - score(b) || a.length - b.length)
      .slice(0, 8)
      .map(city => toDestination(city, 'IN'));

    const international = INTERNATIONAL_DESTINATIONS
      .filter(([city, , country]) => city.toLowerCase().includes(q) || country.toLowerCase().includes(q))
      .map(([city, cc, name]) => toDestination(city, cc, name));

    return [...domestic, ...international].slice(0, 10);
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
