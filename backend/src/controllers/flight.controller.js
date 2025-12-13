/**
 * Flight Controller - Request/Response Handling
 * Handles HTTP requests and delegates to service layer
 */
const flightService = require('../services/flight.service');
const ApiResponse = require('../core/ApiResponse');
const { StatusCodes } = require('../core/StatusCodes');
const AsyncHandler = require('../core/AsyncHandler');

class FlightController {
  /**
   * Search flights across all suppliers
   * GET /api/flights/search
   */
  async searchFlights(req, res) {
    const { 
      origin, 
      destination, 
      departureDate, 
      returnDate, 
      adults, 
      children,
      infants,
      cabin,
      nonStopOnly,
      sortBy,
      page,
      pageSize,
      maxPrice,
      minPrice,
      airlines,
      maxStops,
      refundableOnly
    } = req.query;

    // Build search parameters
    const searchParams = {
      origin,
      destination,
      departureDate,
      returnDate: returnDate || null,
      adults: adults || 1,
      children: children || 0,
      infants: infants || 0,
      cabin: cabin || 'ECONOMY',
      nonStopOnly: nonStopOnly === 'true'
    };

    // Build options (sorting, filtering, pagination)
    const options = {
      sortBy: sortBy || 'PRICE_ASC',
      page: page || 1,
      pageSize: pageSize || 50,
      filters: {}
    };

    // Add filters if provided
    if (nonStopOnly === 'true') options.filters.nonStopOnly = true;
    if (maxPrice) options.filters.maxPrice = parseFloat(maxPrice);
    if (minPrice) options.filters.minPrice = parseFloat(minPrice);
    if (airlines) options.filters.airlines = airlines.split(',');
    if (maxStops) options.filters.maxStops = parseInt(maxStops);
    if (refundableOnly === 'true') options.filters.refundableOnly = true;

    // Call service
    const result = await flightService.searchFlights(searchParams, options);

    // Return industry-standard response
    res.status(StatusCodes.OK).json(result);
  }

  async getFlightDetails(req, res) {
    const { flightId } = req.params;

    const flightDetails = await flightService.getFlightDetails(flightId);

    res.status(StatusCodes.OK).json(
      ApiResponse.success(flightDetails, StatusCodes.OK, 'Flight details retrieved')
    );
  }

  /**
   * Validate flight price
   * POST /api/flights/price
   */
  priceFlights = AsyncHandler(async (req, res) => {
    const { flightOffer } = req.body;

    if (!flightOffer) {
      return ApiResponse.error(res, 'Flight offer is required', StatusCodes.BAD_REQUEST);
    }

    const result = await flightService.priceFlights(flightOffer);
    return ApiResponse.success(res, result, 'Flight price validated', StatusCodes.OK);
  });
}

module.exports = new FlightController();
