/**
 * PRODUCTION Airport Controller
 * Uses database when available, with production fallback
 */

const ApiResponse = require('../core/ApiResponse');
const AsyncHandler = require('../core/AsyncHandler');
const { StatusCodes } = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');

// Import database functions (required for production)
const airportModel = require('../models/airport.model');
const { searchAirports, getAirportByCode, getPopularAirports } = airportModel;

class ProductionAirportController {

  /**
   * Search airports (DATABASE ONLY)
   */
  searchAirports = AsyncHandler(async (req, res) => {
    const { q, limit = 10, country } = req.query;

    if (!q || q.trim().length < 2) {
      return ApiResponse.error(
        res,
        'Search query must be at least 2 characters',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🔍 Airport search: "${q}" (limit: ${limit})`);

    try {
      logger.info('🔄 Searching database...');
      const airports = await searchAirports(q.trim(), parseInt(limit), country);
      logger.info(`✅ Database search: ${airports.length} results found`);
      
      const formattedResults = airports.map(airport => ({
        iata: airport.iata_code,
        name: airport.airport_name,
        city: airport.city_name,
        country: airport.country_name,
        countryCode: airport.country_code,
        priority: airport.priority_score,
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
}

module.exports = new ProductionAirportController();