/**
 * Reference Data Controller
 * Handles airports, cities, airlines reference data endpoints
 * 
 * These endpoints support autocomplete, lookups, and reference data queries
 */

const amadeus = require('../suppliers/amadeus');
const ApiResponse = require('../core/ApiResponse');
const AsyncHandler = require('../core/AsyncHandler');
const StatusCodes = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');

class ReferenceDataController {

  /**
   * Search locations (airports/cities) for autocomplete
   * GET /api/reference/locations/search?q=mumbai&type=AIRPORT
   */
  searchLocations = AsyncHandler(async (req, res) => {
    const { q, type = 'AIRPORT,CITY' } = req.query;

    // Validate keyword length
    if (!q || q.length < 3) {
      return ApiResponse.error(
        res,
        'Search keyword must be at least 3 characters',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🔍 Location search: ${q} (${type})`);

    // Call Amadeus API
    const result = await amadeus.searchLocations(q, type);

    // Format response for autocomplete
    const locations = result.data.map(location => ({
      code: location.iataCode,
      name: location.name,
      city: location.address?.cityName,
      country: location.address?.countryCode,
      type: location.subType,
      detailedName: location.detailedName
    }));

    return ApiResponse.success(
      res,
      locations,
      `Found ${locations.length} locations`,
      StatusCodes.OK
    );
  });

  /**
   * Get airport details by IATA code
   * GET /api/reference/airports/:iataCode
   */
  getAirportInfo = AsyncHandler(async (req, res) => {
    const { iataCode } = req.params;

    if (!iataCode || iataCode.length !== 3) {
      return ApiResponse.error(
        res,
        'Invalid IATA code. Must be 3 characters.',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🛫 Getting airport info: ${iataCode}`);

    const result = await amadeus.getAirportInfo(iataCode.toUpperCase());

    if (!result.data || result.data.length === 0) {
      return ApiResponse.error(
        res,
        `Airport not found: ${iataCode}`,
        StatusCodes.NOT_FOUND
      );
    }

    const airport = result.data[0];
    const airportInfo = {
      code: airport.iataCode,
      name: airport.name,
      city: airport.address?.cityName,
      cityCode: airport.address?.cityCode,
      country: airport.address?.countryName,
      countryCode: airport.address?.countryCode,
      timezone: airport.timeZoneOffset,
      location: {
        latitude: airport.geoCode?.latitude,
        longitude: airport.geoCode?.longitude
      }
    };

    return ApiResponse.success(
      res,
      airportInfo,
      'Airport information retrieved',
      StatusCodes.OK
    );
  });

  /**
   * Get all airports in a city
   * GET /api/reference/cities/:cityCode/airports
   */
  getAirportsByCity = AsyncHandler(async (req, res) => {
    const { cityCode } = req.params;

    if (!cityCode || cityCode.length !== 3) {
      return ApiResponse.error(
        res,
        'Invalid city code. Must be 3 characters.',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🏙️ Getting airports for city: ${cityCode}`);

    const result = await amadeus.getAirportsByCity(cityCode.toUpperCase());

    const city = result.data;
    const airports = result.included || [];

    const response = {
      city: {
        code: city.iataCode,
        name: city.name,
        country: city.address?.countryCode
      },
      airports: airports.map(airport => ({
        code: airport.iataCode,
        name: airport.name,
        type: airport.subType,
        distance: airport.distance?.value,
        distanceUnit: airport.distance?.unit
      }))
    };

    return ApiResponse.success(
      res,
      response,
      `Found ${airports.length} airports`,
      StatusCodes.OK
    );
  });

  /**
   * Get airline information by code
   * GET /api/reference/airlines/:airlineCode
   */
  getAirlineInfo = AsyncHandler(async (req, res) => {
    const { airlineCode } = req.params;

    if (!airlineCode || airlineCode.length !== 2) {
      return ApiResponse.error(
        res,
        'Invalid airline code. Must be 2 characters (IATA).',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`✈️ Getting airline info: ${airlineCode}`);

    const result = await amadeus.getAirlineInfo(airlineCode.toUpperCase());

    if (!result.data || result.data.length === 0) {
      return ApiResponse.error(
        res,
        `Airline not found: ${airlineCode}`,
        StatusCodes.NOT_FOUND
      );
    }

    const airline = result.data[0];
    const airlineInfo = {
      code: airline.iataCode,
      icaoCode: airline.icaoCode,
      name: airline.businessName,
      commonName: airline.commonName,
      type: airline.type
    };

    return ApiResponse.success(
      res,
      airlineInfo,
      'Airline information retrieved',
      StatusCodes.OK
    );
  });

  /**
   * Get routes served by an airline
   * GET /api/reference/airlines/:airlineCode/routes?date=2024-06-15
   */
  getAirlineRoutes = AsyncHandler(async (req, res) => {
    const { airlineCode } = req.params;
    const { date } = req.query;

    if (!airlineCode || airlineCode.length !== 2) {
      return ApiResponse.error(
        res,
        'Invalid airline code. Must be 2 characters (IATA).',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🛫 Getting routes for airline: ${airlineCode}`);

    const result = await amadeus.getAirlineRoutes(
      airlineCode.toUpperCase(),
      date
    );

    const routes = result.data.map(route => ({
      destination: route.destination,
      type: route.type
    }));

    return ApiResponse.success(
      res,
      routes,
      `Found ${routes.length} routes`,
      StatusCodes.OK
    );
  });
}

module.exports = new ReferenceDataController();
