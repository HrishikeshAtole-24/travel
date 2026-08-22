/**
 * Hotel Validator - Validate Industry-Standard Hotel Data
 * Ensures data integrity and completeness for hotel listings and offers
 */
const logger = require('../../config/winstonLogger');

// ═══════════════════════════════════════════════════════════════
// 🏨 HOTEL LIST VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate hotel list items
 * @param {Array} hotels - Array of standard hotel items
 * @returns {Array} Valid hotel items
 */
const validateHotelListData = (hotels) => {
  try {
    const validHotels = hotels.filter((hotel) => {
      // Hotel ID is required
      if (!hotel.hotelId) {
        logger.warn('Invalid hotel: missing hotelId');
        return false;
      }

      // Source validation
      if (!hotel.source || !hotel.source.supplier) {
        logger.warn(`Invalid source data for hotel: ${hotel.hotelId}`);
        return false;
      }

      // Name should exist (but allow pass-through if missing)
      if (!hotel.name) {
        logger.warn(`Missing name for hotel: ${hotel.hotelId}`);
        // Don't reject, just warn
      }

      return true;
    });

    logger.info(`✅ Validated ${validHotels.length}/${hotels.length} hotels`);
    return validHotels;
  } catch (error) {
    logger.error('Hotel list validation error:', error);
    throw new Error('Failed to validate hotel list data');
  }
};

// ═══════════════════════════════════════════════════════════════
// 💰 HOTEL OFFER VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate hotel offers (industry-standard format)
 * @param {Array} offers - Array of hotel offers
 * @returns {Array} Valid hotel offers
 */
const validateHotelOfferData = (offers) => {
  try {
    const validOffers = offers.filter((offer) => {
      // Basic structure validation
      if (!offer.id || !offer.source) {
        logger.warn(`Invalid offer structure: ${offer.id || 'unknown'}`);
        return false;
      }

      // Source validation
      if (!offer.source.supplier || !offer.source.supplierOfferId) {
        logger.warn(`Invalid source data for offer: ${offer.id}`);
        return false;
      }

      // Pricing validation
      if (!validateHotelPricing(offer.pricing, offer.id)) {
        return false;
      }

      // Dates validation
      if (!validateHotelDates(offer, offer.id)) {
        return false;
      }

      return true;
    });

    logger.info(`✅ Validated ${validOffers.length}/${offers.length} hotel offers`);
    return validOffers;
  } catch (error) {
    logger.error('Hotel offer validation error:', error);
    throw new Error('Failed to validate hotel offer data');
  }
};

/**
 * Validate hotel pricing
 * @param {Object} pricing - Pricing object
 * @param {string} offerId - Offer ID for logging
 * @returns {boolean}
 */
const validateHotelPricing = (pricing, offerId) => {
  if (!pricing) {
    logger.warn(`Missing pricing for offer: ${offerId}`);
    return false;
  }

  // Price must be positive number
  if (typeof pricing.totalAmount !== 'number' || pricing.totalAmount <= 0) {
    logger.warn(`Invalid total amount for offer: ${offerId}`);
    return false;
  }

  // Currency validation
  if (!pricing.totalCurrency || pricing.totalCurrency.length !== 3) {
    logger.warn(`Invalid currency for offer: ${offerId}`);
    return false;
  }

  return true;
};

/**
 * Validate hotel dates
 * @param {Object} offer - Hotel offer
 * @param {string} offerId - Offer ID for logging
 * @returns {boolean}
 */
const validateHotelDates = (offer, offerId) => {
  // Dates are not always present in all responses
  if (offer.checkInDate && offer.checkOutDate) {
    const checkIn = new Date(offer.checkInDate);
    const checkOut = new Date(offer.checkOutDate);

    if (isNaN(checkIn.getTime())) {
      logger.warn(`Invalid check-in date for offer: ${offerId}`);
      return false;
    }

    if (isNaN(checkOut.getTime())) {
      logger.warn(`Invalid check-out date for offer: ${offerId}`);
      return false;
    }

    if (checkOut <= checkIn) {
      logger.warn(`Check-out date before check-in date for offer: ${offerId}`);
      return false;
    }
  }

  return true;
};

// ═══════════════════════════════════════════════════════════════
// 🔍 SEARCH PARAMS VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate hotel search by city parameters
 * @param {Object} searchParams - Search parameters
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
const validateHotelSearchParams = (searchParams) => {
  const errors = [];

  // Must have at least cityCode, or latitude+longitude, or hotelIds
  if (!searchParams.cityCode && !searchParams.hotelIds && !(searchParams.latitude && searchParams.longitude)) {
    errors.push('Must provide cityCode, hotelIds, or latitude/longitude');
  }

  // City code validation (if provided)
  if (searchParams.cityCode && searchParams.cityCode.length !== 3) {
    errors.push('Invalid city code (must be 3 characters)');
  }

  // Radius validation
  if (searchParams.radius) {
    const radius = parseFloat(searchParams.radius);
    if (isNaN(radius) || radius <= 0 || radius > 300) {
      errors.push('Invalid radius (must be between 0 and 300)');
    }
  }

  // Radius unit validation
  if (searchParams.radiusUnit && !['KM', 'MILE'].includes(searchParams.radiusUnit.toUpperCase())) {
    errors.push('Invalid radius unit (must be KM or MILE)');
  }

  // Ratings validation (1-5)
  if (searchParams.ratings) {
    const ratings = searchParams.ratings.toString().split(',');
    for (const r of ratings) {
      const num = parseInt(r.trim());
      if (isNaN(num) || num < 1 || num > 5) {
        errors.push('Invalid rating (must be 1-5)');
        break;
      }
    }
  }

  // Hotel source validation
  if (searchParams.hotelSource && !['ALL', 'BEDBANK', 'DIRECTCHAIN'].includes(searchParams.hotelSource.toUpperCase())) {
    errors.push('Invalid hotelSource (must be ALL, BEDBANK, or DIRECTCHAIN)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate hotel offers search parameters
 * @param {Object} searchParams - Search parameters
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
const validateHotelOfferSearchParams = (searchParams) => {
  const errors = [];

  // hotelIds is required
  if (!searchParams.hotelIds) {
    errors.push('hotelIds is required');
  }

  // Adults validation
  if (searchParams.adults) {
    const adults = parseInt(searchParams.adults);
    if (isNaN(adults) || adults < 1 || adults > 9) {
      errors.push('Invalid number of adults (must be 1-9)');
    }
  }

  // Room quantity validation
  if (searchParams.roomQuantity) {
    const rooms = parseInt(searchParams.roomQuantity);
    if (isNaN(rooms) || rooms < 1 || rooms > 9) {
      errors.push('Invalid room quantity (must be 1-9)');
    }
  }

  // Check-in date validation
  if (searchParams.checkInDate) {
    const date = new Date(searchParams.checkInDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid check-in date format (use YYYY-MM-DD)');
    }
    
    // Check-in should not be in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      errors.push('Check-in date cannot be in the past');
    }
  }

  // Check-out date validation
  if (searchParams.checkOutDate) {
    const date = new Date(searchParams.checkOutDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid check-out date format (use YYYY-MM-DD)');
    }
  }

  // Check-out should be after check-in
  if (searchParams.checkInDate && searchParams.checkOutDate) {
    const checkIn = new Date(searchParams.checkInDate);
    const checkOut = new Date(searchParams.checkOutDate);
    if (checkOut <= checkIn) {
      errors.push('Check-out date must be after check-in date');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateHotelListData,
  validateHotelOfferData,
  validateHotelPricing,
  validateHotelDates,
  validateHotelSearchParams,
  validateHotelOfferSearchParams
};
