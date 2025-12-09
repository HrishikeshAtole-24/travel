/**
 * Flight Validator - Validate Industry-Standard Flight Offer Structure
 * Ensures data integrity and completeness
 */
const logger = require('../../config/winstonLogger');

/**
 * Validate flight offers (industry-standard format)
 * @param {Array} offers - Array of flight offers
 * @returns {Array} Valid flight offers
 */
const validateFlightData = (offers) => {
  try {
    const validOffers = offers.filter((offer) => {
      // Basic structure validation
      if (!offer.id || !offer.source || !offer.itinerary || !offer.pricing) {
        logger.warn(`Invalid offer structure: ${offer.id || 'unknown'}`);
        return false;
      }

      // Source validation
      if (!offer.source.supplier || !offer.source.supplierOfferId) {
        logger.warn(`Invalid source data for offer: ${offer.id}`);
        return false;
      }

      // Itinerary validation
      if (!offer.itinerary.slices || offer.itinerary.slices.length === 0) {
        logger.warn(`No slices found for offer: ${offer.id}`);
        return false;
      }

      // Validate each slice
      for (const slice of offer.itinerary.slices) {
        if (!slice.segments || slice.segments.length === 0) {
          logger.warn(`No segments in slice for offer: ${offer.id}`);
          return false;
        }

        // Validate each segment
        for (const segment of slice.segments) {
          if (!validateSegment(segment, offer.id)) {
            return false;
          }
        }
      }

      // Pricing validation
      if (!validatePricing(offer.pricing, offer.id)) {
        return false;
      }

      return true;
    });

    logger.info(`✅ Validated ${validOffers.length}/${offers.length} flight offers`);
    return validOffers;

  } catch (error) {
    logger.error('Flight validation error:', error);
    throw new Error('Failed to validate flight data');
  }
};

/**
 * Validate flight segment
 * @param {Object} segment - Flight segment
 * @param {string} offerId - Offer ID for logging
 * @returns {boolean}
 */
const validateSegment = (segment, offerId) => {
  // Required fields
  if (!segment.segmentId || !segment.marketingAirlineCode || !segment.flightNumber) {
    logger.warn(`Invalid segment structure for offer: ${offerId}`);
    return false;
  }

  // Departure validation
  if (!segment.departure || !segment.departure.airportCode || !segment.departure.time) {
    logger.warn(`Invalid departure data for offer: ${offerId}`);
    return false;
  }

  // Arrival validation
  if (!segment.arrival || !segment.arrival.airportCode || !segment.arrival.time) {
    logger.warn(`Invalid arrival data for offer: ${offerId}`);
    return false;
  }

  // Date validation
  if (!isValidDate(segment.departure.time) || !isValidDate(segment.arrival.time)) {
    logger.warn(`Invalid dates in segment for offer: ${offerId}`);
    return false;
  }

  // Logical validation: arrival should be after departure
  const depTime = new Date(segment.departure.time);
  const arrTime = new Date(segment.arrival.time);
  if (arrTime <= depTime) {
    logger.warn(`Arrival time before departure time for offer: ${offerId}`);
    return false;
  }

  return true;
};

/**
 * Validate pricing
 * @param {Object} pricing - Pricing object
 * @param {string} offerId - Offer ID for logging
 * @returns {boolean}
 */
const validatePricing = (pricing, offerId) => {
  // Price must be positive number
  if (typeof pricing.totalAmount !== 'number' || pricing.totalAmount <= 0) {
    logger.warn(`Invalid total amount for offer: ${offerId}`);
    return false;
  }

  // Base amount validation
  if (typeof pricing.baseAmount !== 'number' || pricing.baseAmount < 0) {
    logger.warn(`Invalid base amount for offer: ${offerId}`);
    return false;
  }

  // Currency validation
  if (!pricing.totalCurrency || pricing.totalCurrency.length !== 3) {
    logger.warn(`Invalid currency for offer: ${offerId}`);
    return false;
  }

  // Logical validation: total = base + taxes
  const calculatedTotal = pricing.baseAmount + pricing.taxesAmount;
  const diff = Math.abs(calculatedTotal - pricing.totalAmount);
  if (diff > 0.01) { // Allow small floating point differences
    logger.warn(`Price calculation mismatch for offer: ${offerId}`);
    // Don't reject, just warn
  }

  return true;
};

/**
 * Check if date string is valid ISO 8601
 * @param {string} dateString - ISO date string
 * @returns {boolean}
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Validate search parameters
 * @param {Object} searchParams - Search parameters
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
const validateSearchParams = (searchParams) => {
  const errors = [];

  // Origin validation
  if (!searchParams.origin || searchParams.origin.length !== 3) {
    errors.push('Invalid origin airport code');
  }

  // Destination validation
  if (!searchParams.destination || searchParams.destination.length !== 3) {
    errors.push('Invalid destination airport code');
  }

  // Departure date validation
  if (!searchParams.departureDate || !isValidDate(searchParams.departureDate)) {
    errors.push('Invalid departure date');
  }

  // Return date validation (if provided)
  if (searchParams.returnDate && !isValidDate(searchParams.returnDate)) {
    errors.push('Invalid return date');
  }

  // Passenger count validation
  const adults = parseInt(searchParams.adults) || 0;
  const children = parseInt(searchParams.children) || 0;
  const infants = parseInt(searchParams.infants) || 0;

  if (adults < 1) {
    errors.push('At least one adult required');
  }

  if (adults + children + infants > 9) {
    errors.push('Maximum 9 passengers allowed');
  }

  if (infants > adults) {
    errors.push('Number of infants cannot exceed number of adults');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = { 
  validateFlightData,
  validateSearchParams,
  validateSegment,
  validatePricing
};
