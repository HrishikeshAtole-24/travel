/**
 * Assembly Line - Export All Assembly Functions
 * Coordinates the data processing pipeline for flight and hotel offers
 */
const { mapFlightData, mapAmadeusData, mapAmadeusOffer, parseDuration } = require('./mappers/flight.mapper');
const { validateFlightData, validateSearchParams, validateSegment, validatePricing } = require('./validators/flight.validator');
const { transformFlightData, formatDuration, calculateLayovers } = require('./transformers/flight.transform');
const FlightAggregator = require('./aggregator');

// Hotel Assembly Line
const { mapHotelListData, mapHotelOffersData, mapAmadeusHotelList, mapAmadeusHotelOffers, mapAmadeusHotelRatings, mapAmadeusHotelAutocomplete } = require('./mappers/hotel.mapper');
const { validateHotelListData, validateHotelOfferData, validateHotelSearchParams, validateHotelOfferSearchParams } = require('./validators/hotel.validator');
const { transformHotelListData, transformHotelOfferData, calculateNights, formatBoardType } = require('./transformers/hotel.transform');

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // ✈️ FLIGHT Assembly Line
  // ═══════════════════════════════════════════════════════════════

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
  FlightAggregator,

  // ═══════════════════════════════════════════════════════════════
  // 🏨 HOTEL Assembly Line
  // ═══════════════════════════════════════════════════════════════

  // Hotel Mappers
  mapHotelListData,
  mapHotelOffersData,
  mapAmadeusHotelList,
  mapAmadeusHotelOffers,
  mapAmadeusHotelRatings,
  mapAmadeusHotelAutocomplete,

  // Hotel Validators
  validateHotelListData,
  validateHotelOfferData,
  validateHotelSearchParams,
  validateHotelOfferSearchParams,

  // Hotel Transformers
  transformHotelListData,
  transformHotelOfferData,
  calculateNights,
  formatBoardType,
};
