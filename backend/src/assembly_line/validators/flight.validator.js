// Flight Validator - Validate Flight Data Structure
const logger = require('../../config/winstonLogger');

/**
 * Validate flight data
 */
const validateFlightData = (flights) => {
  try {
    const validFlights = flights.filter((flight) => {
      // Required fields validation
      if (!flight.id || !flight.price || !flight.departure || !flight.arrival) {
        logger.warn(`Invalid flight data: ${flight.id || 'unknown'}`);
        return false;
      }

      // Price validation
      if (typeof flight.price.total !== 'number' || flight.price.total <= 0) {
        logger.warn(`Invalid price for flight: ${flight.id}`);
        return false;
      }

      // Date validation
      if (!isValidDate(flight.departure.time) || !isValidDate(flight.arrival.time)) {
        logger.warn(`Invalid dates for flight: ${flight.id}`);
        return false;
      }

      return true;
    });

    logger.info(`✅ Validated ${validFlights.length}/${flights.length} flights`);
    return validFlights;

  } catch (error) {
    logger.error('Flight validation error:', error);
    throw new Error('Failed to validate flight data');
  }
};

/**
 * Check if date string is valid
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

module.exports = { validateFlightData };
