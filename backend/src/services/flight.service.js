// Flight Service - Business Logic
const supplierFactory = require('../suppliers/supplierFactory');
const cacheRepo = require('../repository/cache.repo');
const flightRepo = require('../repository/flight.repo');
const { mapFlightData, validateFlightData, transformFlightData } = require('../assembly_line');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');

class FlightService {
  async searchFlights(searchParams) {
    try {
      // Generate cache key
      const cacheKey = `flights:${searchParams.origin}:${searchParams.destination}:${searchParams.departureDate}`;

      // Check cache first
      const cachedData = await cacheRepo.get(cacheKey);
      if (cachedData) {
        logger.info('Flight data retrieved from cache');
        return cachedData;
      }

      // Get supplier (default: Amadeus)
      const supplier = supplierFactory('amadeus');

      // Fetch from supplier
      const rawFlightData = await supplier.searchFlights(searchParams);

      // Assembly Line: Map → Validate → Transform
      const mappedData = mapFlightData(rawFlightData);
      const validatedData = validateFlightData(mappedData);
      const transformedData = transformFlightData(validatedData);

      // Cache the result (TTL: 30 minutes)
      await cacheRepo.set(cacheKey, transformedData, 1800);

      logger.info('Flight data fetched and cached successfully');
      return transformedData;

    } catch (error) {
      logger.error('Flight search error:', error);
      throw ApiError.internal('Failed to search flights');
    }
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
