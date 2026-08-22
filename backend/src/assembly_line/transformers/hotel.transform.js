/**
 * Hotel Transformer - Enhance and Normalize Hotel Data
 * Adds computed fields, formatting, and enrichments
 */
const logger = require('../../config/winstonLogger');

// ═══════════════════════════════════════════════════════════════
// 🏨 HOTEL LIST TRANSFORMER
// ═══════════════════════════════════════════════════════════════

/**
 * Transform and enhance hotel list data
 * Adds computed fields and formatting
 * @param {Array} hotels - Array of standard hotel items
 * @returns {Array} Enhanced hotel items
 */
const transformHotelListData = (hotels) => {
  try {
    const transformed = hotels.map(hotel => {
      // Add computed fields
      hotel.computed = {
        hasLocation: !!(hotel.location?.latitude && hotel.location?.longitude),
        distanceFormatted: hotel.location?.distance 
          ? `${hotel.location.distance.value} ${hotel.location.distance.unit}`
          : null,
        isChainHotel: !!hotel.chainCode,
      };

      return hotel;
    });

    logger.info(`✅ Transformed ${transformed.length} hotel list items`);
    return transformed;
  } catch (error) {
    logger.error('Hotel list transformation error:', error);
    throw new Error('Failed to transform hotel list data');
  }
};

// ═══════════════════════════════════════════════════════════════
// 💰 HOTEL OFFER TRANSFORMER
// ═══════════════════════════════════════════════════════════════

/**
 * Transform and enhance hotel offers
 * Adds computed fields, human-readable formats, nights calculation, etc.
 * @param {Array} offers - Array of standard hotel offers
 * @returns {Array} Enhanced hotel offers
 */
const transformHotelOfferData = (offers) => {
  try {
    const transformed = offers.map(offer => {
      // Calculate number of nights
      const nights = calculateNights(offer.checkInDate, offer.checkOutDate);

      // Calculate price per night
      const pricePerNight = nights > 0
        ? Math.round((offer.pricing.totalAmount / nights) * 100) / 100
        : offer.pricing.totalAmount;

      // Format dates
      const checkInFormatted = offer.checkInDate ? formatDate(offer.checkInDate) : null;
      const checkOutFormatted = offer.checkOutDate ? formatDate(offer.checkOutDate) : null;

      // Determine cancellation type
      const cancellationType = determineCancellationType(offer.policies);

      // Add computed fields
      offer.computed = {
        nights,
        pricePerNight,
        pricePerNightFormatted: `${offer.pricing.totalCurrency} ${pricePerNight.toFixed(2)}`,
        totalPriceFormatted: `${offer.pricing.totalCurrency} ${offer.pricing.totalAmount.toFixed(2)}`,
        checkInFormatted,
        checkOutFormatted,
        cancellationType,
        isFreeCancellation: cancellationType === 'FREE_CANCELLATION',
        isNonRefundable: cancellationType === 'NON_REFUNDABLE',
        roomDescription: formatRoomDescription(offer.room),
        boardTypeFormatted: formatBoardType(offer.boardType),
        paymentTypeFormatted: formatPaymentType(offer.policies?.paymentType),
      };

      return offer;
    });

    logger.info(`✅ Transformed ${transformed.length} hotel offers`);
    return transformed;
  } catch (error) {
    logger.error('Hotel offer transformation error:', error);
    throw new Error('Failed to transform hotel offer data');
  }
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate number of nights between check-in and check-out
 * @param {string} checkInDate - Check-in date (YYYY-MM-DD)
 * @param {string} checkOutDate - Check-out date (YYYY-MM-DD)
 * @returns {number} Number of nights
 */
const calculateNights = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate) return 0;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

/**
 * Format date to human-readable format
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {Object} Formatted date parts
 */
const formatDate = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  return {
    date: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
    iso: dateString
  };
};

/**
 * Determine cancellation type from policies
 * @param {Object} policies - Hotel offer policies
 * @returns {string} Cancellation type
 */
const determineCancellationType = (policies) => {
  if (!policies) return 'UNKNOWN';

  const cancellation = policies.cancellation;

  if (!cancellation) {
    // No cancellation policy means typically non-refundable
    return policies.paymentType === 'GUARANTEE' ? 'FLEXIBLE' : 'UNKNOWN';
  }

  // Array of cancellation rules
  if (Array.isArray(cancellation)) {
    const hasFreeCancellation = cancellation.some(c =>
      c.type === 'FULL_STAY' || c.amount === 0 || c.numberOfNights === 0
    );
    return hasFreeCancellation ? 'FREE_CANCELLATION' : 'PARTIAL_REFUND';
  }

  // Single cancellation rule
  if (cancellation.amount === 0 || cancellation.numberOfNights === 0) {
    return 'FREE_CANCELLATION';
  }

  if (cancellation.deadline) {
    return 'FREE_CANCELLATION_UNTIL_DEADLINE';
  }

  return 'PARTIAL_REFUND';
};

/**
 * Format room description from room info
 * @param {Object} room - Room info
 * @returns {string} Formatted description
 */
const formatRoomDescription = (room) => {
  if (!room) return 'Standard Room';

  const parts = [];

  if (room.typeEstimated?.category) {
    parts.push(formatRoomCategory(room.typeEstimated.category));
  }

  if (room.typeEstimated?.beds) {
    parts.push(`${room.typeEstimated.beds} ${formatBedType(room.typeEstimated.bedType || 'DOUBLE')}`);
  }

  if (room.description) {
    // If we have a description, use it as primary
    return room.description;
  }

  return parts.length > 0 ? parts.join(' - ') : 'Standard Room';
};

/**
 * Format room category code to readable string
 * @param {string} category - Room category code
 * @returns {string} Formatted category
 */
const formatRoomCategory = (category) => {
  const categories = {
    'STANDARD_ROOM': 'Standard Room',
    'SUPERIOR_ROOM': 'Superior Room',
    'DELUXE_ROOM': 'Deluxe Room',
    'FAMILY_ROOM': 'Family Room',
    'SUITE': 'Suite',
    'JUNIOR_SUITE': 'Junior Suite',
    'EXECUTIVE_SUITE': 'Executive Suite',
    'STUDIO': 'Studio',
    'APARTMENT': 'Apartment',
    'VILLA': 'Villa',
    'PENTHOUSE': 'Penthouse',
  };
  return categories[category] || category || 'Room';
};

/**
 * Format bed type to readable string
 * @param {string} bedType - Bed type code
 * @returns {string} Formatted bed type
 */
const formatBedType = (bedType) => {
  const types = {
    'SINGLE': 'Single Bed',
    'DOUBLE': 'Double Bed',
    'QUEEN': 'Queen Bed',
    'KING': 'King Bed',
    'TWIN': 'Twin Beds',
  };
  return types[bedType] || bedType || 'Bed';
};

/**
 * Format board type to readable string
 * @param {string} boardType - Board type code
 * @returns {string} Formatted board type
 */
const formatBoardType = (boardType) => {
  const types = {
    'ROOM_ONLY': 'Room Only',
    'BREAKFAST': 'Breakfast Included',
    'HALF_BOARD': 'Half Board',
    'FULL_BOARD': 'Full Board',
    'ALL_INCLUSIVE': 'All Inclusive',
    'BUFFET_BREAKFAST': 'Buffet Breakfast',
    'CARIBBEAN_BREAKFAST': 'Caribbean Breakfast',
    'CONTINENTAL_BREAKFAST': 'Continental Breakfast',
    'ENGLISH_BREAKFAST': 'English Breakfast',
    'FULL_BREAKFAST': 'Full Breakfast',
    'DINNER_BED_AND_BREAKFAST': 'Dinner, B&B',
    'LUNCH': 'Lunch Included',
    'DINNER': 'Dinner Included',
    'FAMILY_PLAN': 'Family Plan',
    'AS_BROCHURED': 'As Brochured',
    'SELF_CATERING': 'Self Catering',
    'BERMUDA': 'Bermuda Plan',
    'AMERICAN': 'American Plan',
    'FAMILY_AMERICAN': 'Family American Plan',
    'MODIFIED_AMERICAN': 'Modified American Plan',
  };
  return types[boardType] || boardType || 'Room Only';
};

/**
 * Format payment type
 * @param {string} paymentType - Payment type code
 * @returns {string} Formatted payment type
 */
const formatPaymentType = (paymentType) => {
  const types = {
    'GUARANTEE': 'Credit Card Guarantee',
    'DEPOSIT': 'Deposit Required',
    'PREPAY': 'Full Prepayment',
    'HOLDTIME': 'Hold Without Payment',
    'NONE': 'No Payment Required',
  };
  return types[paymentType] || paymentType || 'Not Specified';
};

module.exports = {
  transformHotelListData,
  transformHotelOfferData,
  calculateNights,
  formatDate,
  formatBoardType,
  formatPaymentType,
  formatRoomDescription
};
