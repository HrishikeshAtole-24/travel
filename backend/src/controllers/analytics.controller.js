/**
 * Analytics Controller
 * Handles flight analytics and insights endpoints
 * 
 * Provides cheapest dates, destinations inspiration, and travel analytics
 */

const amadeus = require('../suppliers/amadeus');
const ApiResponse = require('../core/ApiResponse');
const AsyncHandler = require('../core/AsyncHandler');
const StatusCodes = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');

class AnalyticsController {

  /**
   * Get cheapest dates to fly (Price Calendar)
   * GET /api/analytics/cheapest-dates?origin=BOM&destination=DEL&departureDate=2024-06-01&duration=7
   */
  getCheapestDates = AsyncHandler(async (req, res) => {
    const { origin, destination, departureDate, duration, oneWay, nonStop, maxPrice } = req.query;

    // Validate required parameters
    if (!origin || !destination) {
      return ApiResponse.error(
        res,
        'Origin and destination are required',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`📅 Cheapest dates search: ${origin} → ${destination}`);

    const params = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
    };

    // Add optional parameters
    if (departureDate) params.departureDate = departureDate;
    if (duration) params.duration = duration;
    if (oneWay !== undefined) params.oneWay = oneWay === 'true';
    if (nonStop !== undefined) params.nonStop = nonStop === 'true';
    if (maxPrice) params.maxPrice = maxPrice;

    const result = await amadeus.getFlightCheapestDates(params);

    // Format response for calendar display
    const calendar = result.data.map(option => ({
      departureDate: option.departureDate,
      returnDate: option.returnDate,
      price: {
        total: option.price.total,
        currency: option.price.currency
      },
      links: option.links
    }));

    return ApiResponse.success(
      res,
      calendar,
      `Found ${calendar.length} date options`,
      StatusCodes.OK
    );
  });

  /**
   * Get flight destination suggestions (Travel Inspiration)
   * GET /api/analytics/destinations?origin=BOM&departureDate=2024-06-15&maxPrice=50000
   */
  getFlightDestinations = AsyncHandler(async (req, res) => {
    const { origin, departureDate, oneWay, duration, nonStop, maxPrice } = req.query;

    if (!origin) {
      return ApiResponse.error(
        res,
        'Origin is required',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🌍 Destination inspiration from: ${origin}`);

    const options = {};
    if (departureDate) options.departureDate = departureDate;
    if (duration) options.duration = duration;
    if (oneWay !== undefined) options.oneWay = oneWay === 'true';
    if (nonStop !== undefined) options.nonStop = nonStop === 'true';
    if (maxPrice) options.maxPrice = maxPrice;

    const result = await amadeus.getFlightDestinations(origin.toUpperCase(), options);

    // Format response with destination details
    const destinations = result.data.map(dest => ({
      destination: dest.destination,
      departureDate: dest.departureDate,
      returnDate: dest.returnDate,
      price: {
        total: dest.price.total,
        currency: dest.price.currency
      },
      links: dest.links
    }));

    return ApiResponse.success(
      res,
      destinations,
      `Found ${destinations.length} destinations`,
      StatusCodes.OK
    );
  });

  /**
   * Get popular routes analytics
   * GET /api/analytics/popular-routes?from=BOM&limit=10
   * 
   * Note: This uses destination inspiration API with different formatting
   */
  getPopularRoutes = AsyncHandler(async (req, res) => {
    const { from, limit = 10 } = req.query;

    if (!from) {
      return ApiResponse.error(
        res,
        'Origin (from) is required',
        StatusCodes.BAD_REQUEST
      );
    }

    logger.info(`🔥 Popular routes from: ${from}`);

    const result = await amadeus.getFlightDestinations(from.toUpperCase(), {
      oneWay: true
    });

    // Sort by price (cheapest first) and limit results
    const popularRoutes = result.data
      .sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total))
      .slice(0, parseInt(limit))
      .map(route => ({
        from: from.toUpperCase(),
        to: route.destination,
        startingPrice: {
          amount: route.price.total,
          currency: route.price.currency
        }
      }));

    return ApiResponse.success(
      res,
      popularRoutes,
      `Found ${popularRoutes.length} popular routes`,
      StatusCodes.OK
    );
  });

  /**
   * Health check for analytics endpoints
   * GET /api/analytics/health
   */
  healthCheck = AsyncHandler(async (req, res) => {
    const health = await amadeus.healthCheck();

    return ApiResponse.success(
      res,
      health,
      'Analytics API health check',
      health.status === 'healthy' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE
    );
  });
}

module.exports = new AnalyticsController();
