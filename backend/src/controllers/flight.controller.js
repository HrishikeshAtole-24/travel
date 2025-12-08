// Flight Controller - Request/Response Handling Only
const flightService = require('../services/flight.service');
const ApiResponse = require('../core/ApiResponse');
const StatusCodes = require('../core/StatusCodes');

class FlightController {
  async searchFlights(req, res) {
    const { origin, destination, departureDate, returnDate, adults } = req.query;

    const searchParams = {
      origin,
      destination,
      departureDate,
      returnDate: returnDate || null,
      adults: adults || 1
    };

    const flights = await flightService.searchFlights(searchParams);

    res.status(StatusCodes.OK).json(
      ApiResponse.success(flights, StatusCodes.OK, 'Flights retrieved successfully')
    );
  }

  async getFlightDetails(req, res) {
    const { flightId } = req.params;

    const flightDetails = await flightService.getFlightDetails(flightId);

    res.status(StatusCodes.OK).json(
      ApiResponse.success(flightDetails, StatusCodes.OK, 'Flight details retrieved')
    );
  }
}

module.exports = new FlightController();
