/**
 * Industry-Standard Hotel API Response Format
 * Based on IATA standards, OTA schemas, and modern hotel APIs (Amadeus, Booking.com)
 * 
 * This format is used for standardizing hotel data across multiple suppliers
 */

/**
 * @typedef {Object} HotelSearchResponse
 * @property {MetaData} meta - Technical metadata
 * @property {SearchParams} search - Echo of search parameters
 * @property {HotelOffer[]} data - List of hotel offers or hotels
 * @property {Dictionaries} dictionaries - Lookup tables (chains, cities)
 */

/**
 * @typedef {Object} MetaData
 * @property {string} currency - Default currency code
 * @property {number} totalResults - Total number of results found
 * @property {number} page - Current page number
 * @property {number} pageSize - Results per page
 * @property {string} sorting - Sorting applied (PRICE_ASC, RATING_DESC, etc.)
 * @property {string[]} suppliersUsed - List of suppliers queried
 * @property {string} requestId - Unique request identifier
 * @property {number} responseTimeMs - API response time in milliseconds
 */

/**
 * @typedef {Object} HotelSearchParams
 * @property {string} cityCode - City IATA code
 * @property {string|null} hotelIds - Comma-separated hotel IDs
 * @property {string|null} checkInDate - Check-in date (YYYY-MM-DD)
 * @property {string|null} checkOutDate - Check-out date (YYYY-MM-DD)
 * @property {number} adults - Number of adults
 * @property {number} roomQuantity - Number of rooms
 * @property {string|null} ratings - Star ratings filter
 * @property {string|null} amenities - Amenities filter
 * @property {string|null} boardType - Board type filter
 */

/**
 * @typedef {Object} HotelInfo
 * @property {string} hotelId - Amadeus hotel ID
 * @property {string} name - Hotel name
 * @property {string|null} chainCode - Hotel chain code
 * @property {string|null} cityCode - City IATA code
 * @property {number|null} latitude - Latitude
 * @property {number|null} longitude - Longitude
 */

/**
 * @typedef {Object} HotelOffer
 * @property {string} id - Unique offer ID (HOTEL_OFFER_xxx)
 * @property {SourceInfo} source - Supplier information
 * @property {HotelInfo} hotel - Hotel information
 * @property {string} checkInDate - Check-in date
 * @property {string} checkOutDate - Check-out date
 * @property {RoomInfo} room - Room details
 * @property {HotelPricing} pricing - Price breakdown
 * @property {HotelPolicies} policies - Cancellation, payment policies
 * @property {ComputedFields} computed - Computed/formatted fields
 */

/**
 * @typedef {Object} RoomInfo
 * @property {string|null} type - Room type code
 * @property {Object|null} typeEstimated - Estimated room type
 * @property {string|null} description - Room description
 */

/**
 * @typedef {Object} HotelPricing
 * @property {number} totalAmount - Total price for stay
 * @property {string} totalCurrency - Currency code
 * @property {number} baseAmount - Base room rate
 * @property {number} taxesAmount - Taxes
 * @property {Object|null} variations - Per-night price variations
 */

/**
 * @typedef {Object} HotelPolicies
 * @property {string|null} paymentType - GUARANTEE, DEPOSIT, PREPAY
 * @property {Object|null} cancellation - Cancellation policy
 * @property {Object|null} deposit - Deposit policy
 * @property {Object|null} holdTime - Hold policy
 * @property {Object|null} checkInOut - Check in/out times
 */

/**
 * @typedef {Object} Dictionaries
 * @property {Object.<string, ChainInfo>} chains - Hotel chain lookup
 * @property {Object.<string, CityInfo>} cities - City lookup
 */

// ═══════════════════════════════════════════════════════════════
// Standard Response Builder
// ═══════════════════════════════════════════════════════════════

class HotelResponseBuilder {
  constructor() {
    this.meta = null;
    this.search = null;
    this.data = [];
    this.dictionaries = {
      chains: {},
      cities: {}
    };
  }

  setMeta(meta) {
    this.meta = meta;
    return this;
  }

  setSearch(search) {
    this.search = search;
    return this;
  }

  addOffer(offer) {
    this.data.push(offer);
    return this;
  }

  addOffers(offers) {
    this.data.push(...offers);
    return this;
  }

  addChain(code, info) {
    this.dictionaries.chains[code] = info;
    return this;
  }

  addCity(code, info) {
    this.dictionaries.cities[code] = info;
    return this;
  }

  setDictionaries(dictionaries) {
    this.dictionaries = { ...this.dictionaries, ...dictionaries };
    return this;
  }

  build() {
    return {
      meta: this.meta,
      search: this.search,
      data: this.data,
      dictionaries: this.dictionaries
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Hotel Dictionaries Manager
// ═══════════════════════════════════════════════════════════════

/**
 * Known hotel chains lookup
 */
const HOTEL_CHAINS = {
  'HL': { name: 'Hilton', logo: null },
  'HY': { name: 'Hyatt', logo: null },
  'MC': { name: 'Marriott', logo: null },
  'SI': { name: 'Sheraton', logo: null },
  'IC': { name: 'InterContinental', logo: null },
  'HI': { name: 'Holiday Inn', logo: null },
  'BW': { name: 'Best Western', logo: null },
  'RT': { name: 'Radisson', logo: null },
  'WI': { name: 'Wyndham', logo: null },
  'AC': { name: 'Accor', logo: null },
  'FI': { name: 'Fairfield Inn', logo: null },
  'CP': { name: 'Crowne Plaza', logo: null },
  'CI': { name: 'Comfort Inn', logo: null },
  'EM': { name: 'Embassy Suites', logo: null },
  'DT': { name: 'DoubleTree', logo: null },
  'HG': { name: 'Hampton Inn', logo: null },
  'RZ': { name: 'Ritz-Carlton', logo: null },
  'WH': { name: 'W Hotels', logo: null },
  'SP': { name: 'St. Regis', logo: null },
  'OZ': { name: 'Oyo', logo: null },
  'TA': { name: 'Taj Hotels', logo: null },
  'OB': { name: 'Oberoi', logo: null },
  'IT': { name: 'ITC Hotels', logo: null },
  'LM': { name: 'Le Meridien', logo: null },
  'NO': { name: 'Novotel', logo: null },
};

/**
 * Build dictionaries from hotel offers
 * @param {Array} offers - Hotel offers or hotel list items
 * @returns {Object} Dictionaries
 */
const buildHotelDictionaries = (offers) => {
  const chains = {};
  const cities = {};

  offers.forEach(item => {
    // Extract chain info
    const chainCode = item.chainCode || item.hotel?.chainCode;
    if (chainCode && !chains[chainCode]) {
      chains[chainCode] = HOTEL_CHAINS[chainCode] || { name: chainCode, logo: null };
    }

    // Extract city info
    const cityCode = item.iataCode || item.hotel?.cityCode;
    if (cityCode && !cities[cityCode]) {
      cities[cityCode] = { code: cityCode };
    }
  });

  return { chains, cities };
};

module.exports = {
  HotelResponseBuilder,
  buildHotelDictionaries,
  HOTEL_CHAINS
};
