/**
 * Flight Service - Multi-Supplier Aggregation & Business Logic
 * This is the WRAPPER API that calls all active suppliers in parallel
 */
const supplierFactory = require('../suppliers/supplierFactory');
const cacheRepo = require('../repository/cache.repo');
const flightRepo = require('../repository/flight.repo');
const { mapFlightData, validateFlightData, transformFlightData } = require('../assembly_line');
const FlightAggregator = require('../assembly_line/aggregator');
const SupplierConfigManager = require('../config/suppliers.config');
const DictionariesManager = require('../utils/DictionariesManager');
const { FlightResponseBuilder } = require('../core/FlightResponseFormat');
const { validateSearchParams } = require('../assembly_line/validators/flight.validator');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');
const currencyService = require('./currency.service');
const { convertOffersCurrency } = require('../assembly_line/transformers/currency.transform');

// Currency every offer is presented and charged in (Razorpay India charges INR)
const CHARGE_CURRENCY = process.env.CHARGE_CURRENCY || 'INR';

// Shown when a supplier no longer has the fare the customer selected
const FARE_UNAVAILABLE_MESSAGE = 'This fare is no longer available. Please search again.';

class FlightService {
  /**
   * Search flights across all active suppliers
   * This is the INDUSTRY-STANDARD WRAPPER API
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Additional options (sorting, filters, pagination)
   * @returns {Object} Industry-standard flight search response
   */
  async searchFlights(searchParams, options = {}) {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate search parameters
      const validation = validateSearchParams(searchParams);
      if (!validation.valid) {
        throw ApiError.badRequest('Invalid search parameters', validation.errors);
      }

      // Step 2: Generate cache key
      const cacheKey = this.generateCacheKey(searchParams, options);

      // Step 3: Check cache first
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        logger.info('✅ Flight data retrieved from cache');
        return cachedData;
      }

      // Step 4: Get all active suppliers
      const activeSuppliers = SupplierConfigManager.getActiveSuppliers();
      logger.info(`🚀 Searching across ${activeSuppliers.length} suppliers: ${activeSuppliers.map(s => s.code).join(', ')}`);

      // Step 5: Call all suppliers in parallel
      const supplierPromises = activeSuppliers.map(supplierConfig => 
        this.fetchFromSupplier(supplierConfig, searchParams)
      );

      const supplierResults = await Promise.all(supplierPromises);

      // Step 6: Aggregate results (merge, dedupe, filter, sort, paginate)
      const aggregationOptions = {
        sortBy: options.sortBy || 'PRICE_ASC',
        filters: options.filters || {},
        page: parseInt(options.page) || 1,
        pageSize: parseInt(options.pageSize) || 50
      };

      const aggregatedResult = FlightAggregator.aggregate(supplierResults, aggregationOptions);

      // Step 7: Build dictionaries (airlines, airports, aircraft)
      const dictionaries = DictionariesManager.buildFromOffers(aggregatedResult.data);

      // Step 8: Build industry-standard response
      const response = new FlightResponseBuilder()
        .setMeta({
          currency: CHARGE_CURRENCY,
          totalResults: aggregatedResult.pagination.totalResults,
          page: aggregatedResult.pagination.page,
          pageSize: aggregatedResult.pagination.pageSize,
          sorting: aggregationOptions.sortBy,
          suppliersUsed: activeSuppliers.map(s => s.code),
          requestId: `${Date.now()}_${searchParams.origin}-${searchParams.destination}`,
          responseTimeMs: Date.now() - startTime
        })
        .setSearch({
          origin: searchParams.origin,
          destination: searchParams.destination,
          departureDate: searchParams.departureDate,
          returnDate: searchParams.returnDate || null,
          tripType: searchParams.returnDate ? 'ROUND_TRIP' : 'ONE_WAY',
          adults: parseInt(searchParams.adults) || 1,
          children: parseInt(searchParams.children) || 0,
          infants: parseInt(searchParams.infants) || 0,
          cabin: searchParams.cabin || 'ECONOMY',
          nonStopOnly: searchParams.nonStopOnly === 'true' || searchParams.nonStopOnly === true
        })
        .addOffers(aggregatedResult.data)
        .setDictionaries(dictionaries)
        .build();

      // Step 9: Cache the result (TTL: 5 minutes for flight searches)
      await cacheRepo.set(cacheKey, response, 300);

      logger.info(`✅ Flight search completed: ${response.data.length} offers returned (${Date.now() - startTime}ms)`);
      return response;

    } catch (error) {
      logger.error('❌ Flight search error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to search flights');
    }
  }

  /**
   * Fetch flights from a single supplier with error handling
   * @param {Object} supplierConfig - Supplier configuration
   * @param {Object} searchParams - Search parameters
   * @returns {Array} Mapped and validated flight offers from this supplier
   */
  async fetchFromSupplier(supplierConfig, searchParams) {
    const supplierCode = supplierConfig.code;
    const timeout = supplierConfig.timeout || 7000;

    try {
      logger.info(`📡 Fetching from ${supplierCode}...`);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supplier timeout')), timeout)
      );

      // Get supplier instance
      const supplier = supplierFactory(supplierCode);

      // Race between supplier call and timeout
      const rawData = await Promise.race([
        supplier.searchFlights(searchParams),
        timeoutPromise
      ]);

      const offers = await this.processSupplierData(rawData, supplierCode);

      logger.info(`✅ ${supplierCode}: ${offers.length} offers fetched`);
      return offers;

    } catch (error) {
      logger.error(`❌ ${supplierCode} failed:`, error.message);
      // Don't break entire search if one supplier fails
      // Return empty array so other suppliers can still provide results
      return [];
    }
  }

  /**
   * Assembly Line: Map → Validate → Transform → Convert currency
   * @param {Object} rawData - Raw supplier response
   * @param {string} supplierCode - Supplier code
   * @returns {Promise<Array>} Standard offers priced in CHARGE_CURRENCY
   */
  async processSupplierData(rawData, supplierCode) {
    const mappedData = mapFlightData(rawData, supplierCode);
    const validatedData = validateFlightData(mappedData);
    const transformedData = transformFlightData(validatedData);

    const rates = await currencyService.getRatesForOffers(transformedData, CHARGE_CURRENCY);
    return convertOffersCurrency(transformedData, rates, CHARGE_CURRENCY);
  }

  /**
   * Generate cache key for search
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Additional options
   * @returns {string} Cache key
   */
  generateCacheKey(searchParams, options) {
    const key = [
      'flights',
      searchParams.origin,
      searchParams.destination,
      searchParams.departureDate,
      searchParams.returnDate || 'ow',
      searchParams.adults || 1,
      searchParams.children || 0,
      searchParams.infants || 0,
      searchParams.cabin || 'economy',
      options.sortBy || 'price',
      options.page || 1
    ].join(':');

    return key.toLowerCase();
  }

  async getFlightDetails(flightId) {
    try {
      // Check cache
      const cacheKey = `flight:${flightId}`;
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Get from supplier
      const supplier = supplierFactory('amadeus');
      const rawData = await supplier.getFlightDetails(flightId);

      // Process through assembly line
      const mappedData = mapFlightData(rawData);
      const validatedData = validateFlightData(mappedData);
      const transformedData = transformFlightData(validatedData);

      // Cache result
      await cacheRepo.set(cacheKey, transformedData, 3600);

      return transformedData;

    } catch (error) {
      logger.error('Get flight details error:', error);
      throw ApiError.internal('Failed to get flight details');
    }
  }

  /**
   * Validate flight price (Price Confirmation)
   * @param {Object} flightOffer - Flight offer to validate
   * @returns {Object} Validated flight price
   */
  async priceFlights(flightOffer) {
    const supplierCode = flightOffer?.source?.supplier;

    try {
      // Legacy: raw Amadeus offer (no standard source block)
      if (!supplierCode) {
        logger.info('💰 Validating flight price (legacy Amadeus offer)');
        const supplier = supplierFactory('amadeus');
        return await supplier.priceFlights(flightOffer);
      }

      if (!SupplierConfigManager.isSupplierActive(supplierCode)) {
        throw ApiError.badRequest(FARE_UNAVAILABLE_MESSAGE);
      }

      logger.info(`💰 Validating flight price with ${supplierCode}: ${flightOffer.source.supplierOfferId}`);

      // The supplier re-prices by its own offer ID; client-sent prices are ignored
      const supplier = supplierFactory(supplierCode);
      const rawData = await supplier.priceFlights(flightOffer);
      const [pricedOffer] = await this.processSupplierData(rawData, supplierCode);

      if (!pricedOffer) {
        throw ApiError.badRequest(FARE_UNAVAILABLE_MESSAGE);
      }

      // Compact price summary (same shape the booking page and booking service read)
      pricedOffer.price = {
        currency: pricedOffer.pricing.totalCurrency,
        total: String(pricedOffer.pricing.totalAmount),
        base: String(pricedOffer.pricing.baseAmount),
        grandTotal: String(pricedOffer.pricing.totalAmount)
      };

      logger.info(`✅ Flight price validated: ${pricedOffer.pricing.totalAmount} ${pricedOffer.pricing.totalCurrency}`);

      return {
        data: { flightOffers: [pricedOffer] },
        dictionaries: DictionariesManager.buildFromOffers([pricedOffer])
      };

    } catch (error) {
      logger.error('❌ Price validation error:', error.message);

      if (error instanceof ApiError) throw error;

      // Supplier rejected the offer (expired, sold out, invalid ID)
      if (error.status >= 400 && error.status < 500) {
        throw ApiError.badRequest(FARE_UNAVAILABLE_MESSAGE);
      }

      throw ApiError.internal('Failed to validate flight price');
    }
  }
}

module.exports = new FlightService();
