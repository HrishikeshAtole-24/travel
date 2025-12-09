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
          currency: searchParams.currency || 'INR',
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

      // Assembly Line: Map → Validate → Transform
      const mappedData = mapFlightData(rawData, supplierCode);
      const validatedData = validateFlightData(mappedData);
      const transformedData = transformFlightData(validatedData);

      logger.info(`✅ ${supplierCode}: ${transformedData.length} offers fetched`);
      return transformedData;

    } catch (error) {
      logger.error(`❌ ${supplierCode} failed:`, error.message);
      // Don't break entire search if one supplier fails
      // Return empty array so other suppliers can still provide results
      return [];
    }
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
}

module.exports = new FlightService();
