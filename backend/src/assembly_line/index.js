/**
 * Assembly Line - Export All Assembly Functions
 * Coordinates the data processing pipeline for flight offers
 */
const { mapFlightData, mapAmadeusData, mapAmadeusOffer, parseDuration } = require('./mappers/flight.mapper');
const { validateFlightData, validateSearchParams, validateSegment, validatePricing } = require('./validators/flight.validator');
const { transformFlightData, formatDuration, calculateLayovers } = require('./transformers/flight.transform');
const FlightAggregator = require('./aggregator');

module.exports = {
  // Mappers
  mapFlightData,
  mapAmadeusData,
  mapAmadeusOffer,
  parseDuration,
  
  // Validators
  validateFlightData,
  validateSearchParams,
  validateSegment,
  validatePricing,
  
  // Transformers
  transformFlightData,
  formatDuration,
  calculateLayovers,
  
  // Aggregator
  FlightAggregator
};
