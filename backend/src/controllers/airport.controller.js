/**
 * PRODUCTION Airport Controller
 * Uses database with 9,000+ airports worldwide
 * Data source: OurAirports.com
 */

const ApiResponse = require('../core/ApiResponse');
const AsyncHandler = require('../core/AsyncHandler');
const { StatusCodes } = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');

// Import database functions (required for production)
const airportModel = require('../models/airport.model');
const { 
  searchAirports, 
  getAirportByCode, 
  getPopularAirports,
  getAirportStats,
  getAirportsByCountry 
} = airportModel;

class ProductionAirportController {

  /**
   * Search airports (DATABASE ONLY)
   * GET /api/airports/search?q=mumbai&limit=10&country=IN&includeAll=false
   */
  searchAirports = AsyncHandler(async (req, res) => {
    const { q, limit = 10, country, includeAll = 'false' } = req.query;

    if (!q || q.trim().length < 2) {
      return ApiResponse.error(
        res,
        'Search query must be at least 2 characters',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🔍 Airport search: "${q}" (limit: ${limit}, country: ${country || 'ALL'})`);

    try {
      const onlyScheduled = includeAll !== 'true';
      const airports = await searchAirports(q.trim(), parseInt(limit), country, onlyScheduled);
      logger.info(`✅ Database search: ${airports.length} results found`);
      
      const formattedResults = airports.map(airport => ({
        iata: airport.iata_code,
        icao: airport.icao_code,
        name: airport.airport_name,
        city: airport.city_name,
        country: airport.country_name,
        countryCode: airport.country_code,
        priority: airport.priority_score,
        isMajor: airport.is_major_airport,
        type: airport.airport_type,
        hasScheduledService: airport.has_scheduled_service,
        coordinates: {
          lat: parseFloat(airport.latitude),
          lng: parseFloat(airport.longitude)
        },
        timezone: airport.timezone,
        displayText: `${airport.city_name} (${airport.iata_code})`,
        subText: `${airport.airport_name}, ${airport.country_name}`
      }));

      return ApiResponse.success(res, {
        query: q,
        results: formattedResults,
        total: formattedResults.length,
        source: 'database',
        responseTime: new Date().toISOString()
      }, 'Airports found successfully');

    } catch (error) {
      logger.error('❌ Database search failed:', error);
      return ApiResponse.error(
        res, 
        'Database search failed. Please check if airports table is populated.', 
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });

  /**
   * Get airport by IATA code (DATABASE ONLY)
   */
  getAirportByCode = AsyncHandler(async (req, res) => {
    const { code } = req.params;

    if (!code || code.length !== 3) {
      return ApiResponse.error(
        res,
        'Valid IATA code required (3 letters)',
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      logger.info(`🔍 Looking up airport: ${code.toUpperCase()}`);
      const airport = await getAirportByCode(code.toUpperCase());
      
      if (!airport) {
        return ApiResponse.error(
          res,
          `Airport with code ${code.toUpperCase()} not found in database`,
          StatusCodes.NOT_FOUND
        );
      }

      return ApiResponse.success(res, {
        iata: airport.iata_code,
        name: airport.airport_name,
        city: airport.city_name,
        country: airport.country_name,
        countryCode: airport.country_code,
        source: 'database'
      }, 'Airport details retrieved');

    } catch (error) {
      logger.error('❌ Get airport error:', error);
      return ApiResponse.error(
        res, 
        'Failed to get airport details from database', 
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });

  /**
   * Get popular airports (DATABASE ONLY)
   * GET /api/airports/popular?country=IN&limit=10
   */
  getPopularAirports = AsyncHandler(async (req, res) => {
    const { country = 'IN', limit = 10 } = req.query;

    try {
      logger.info(`🔍 Getting popular airports for ${country}`);
      const airports = await getPopularAirports(country, parseInt(limit));
      
      const popularAirports = airports.map(airport => ({
        iata: airport.iata_code,
        city: airport.city_name,
        displayText: `${airport.city_name} (${airport.iata_code})`,
        priority: airport.priority_score
      }));

      return ApiResponse.success(res, {
        country,
        airports: popularAirports,
        total: popularAirports.length,
        source: 'database'
      }, 'Popular airports retrieved');

    } catch (error) {
      logger.error('❌ Popular airports error:', error);
      return ApiResponse.error(
        res, 
        'Failed to get popular airports from database', 
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });

  /**
   * Get airport database statistics
   * GET /api/airports/stats
   */
  getStats = AsyncHandler(async (req, res) => {
    try {
      logger.info('📊 Getting airport database statistics');
      const stats = await getAirportStats();
      
      return ApiResponse.success(res, {
        totalAirports: parseInt(stats.total_airports),
        majorAirports: parseInt(stats.major_airports),
        withScheduledService: parseInt(stats.scheduled_service),
        totalCountries: parseInt(stats.total_countries),
        byType: {
          large: parseInt(stats.large_airports),
          medium: parseInt(stats.medium_airports),
          small: parseInt(stats.small_airports)
        },
        topCountries: stats.top_countries.map(c => ({
          code: c.country_code,
          name: c.country_name,
          count: parseInt(c.count)
        }))
      }, 'Airport statistics retrieved');

    } catch (error) {
      logger.error('❌ Stats error:', error);
      return ApiResponse.error(
        res,
        'Failed to get airport statistics',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });

  /**
   * Get all airports by country
   * GET /api/airports/country/:code
   */
  getByCountry = AsyncHandler(async (req, res) => {
    const { code } = req.params;
    const { limit = 100 } = req.query;

    if (!code || code.length !== 2) {
      return ApiResponse.error(
        res,
        'Valid country code required (2 letters)',
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      logger.info(`🔍 Getting airports for country: ${code.toUpperCase()}`);
      const airports = await getAirportsByCountry(code.toUpperCase(), parseInt(limit));
      
      return ApiResponse.success(res, {
        countryCode: code.toUpperCase(),
        airports: airports.map(a => ({
          iata: a.iata_code,
          name: a.airport_name,
          city: a.city_name,
          priority: a.priority_score,
          isMajor: a.is_major_airport,
          type: a.airport_type
        })),
        total: airports.length
      }, `Found ${airports.length} airports`);

    } catch (error) {
      logger.error('❌ Get by country error:', error);
      return ApiResponse.error(
        res,
        'Failed to get airports for country',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });
}

module.exports = new ProductionAirportController();