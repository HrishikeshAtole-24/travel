/**
 * Industry-Standard Flight API Response Format
 * Based on IATA NDC, OTA standards, and modern flight APIs (Amadeus, etc.)
 * 
 * This format is used by major players like MMT, Booking.com, Goibibo
 */

/**
 * @typedef {Object} FlightSearchResponse
 * @property {MetaData} meta - Technical metadata
 * @property {SearchParams} search - Echo of search parameters
 * @property {FlightOffer[]} data - List of flight offers
 * @property {Dictionaries} dictionaries - Lookup tables (airlines, airports, aircraft)
 */

/**
 * @typedef {Object} MetaData
 * @property {string} currency - Currency code (ISO 4217)
 * @property {number} totalResults - Total number of results found
 * @property {number} page - Current page number
 * @property {number} pageSize - Results per page
 * @property {string} sorting - Sorting applied (PRICE_ASC, DURATION_ASC, etc.)
 * @property {string[]} suppliersUsed - List of suppliers queried
 * @property {string} requestId - Unique request identifier for tracking
 * @property {number} responseTimeMs - API response time in milliseconds
 */

/**
 * @typedef {Object} SearchParams
 * @property {string} origin - Origin airport code (IATA)
 * @property {string} destination - Destination airport code (IATA)
 * @property {string} departureDate - Departure date (YYYY-MM-DD)
 * @property {string|null} returnDate - Return date for round trip
 * @property {string} tripType - ONE_WAY | ROUND_TRIP | MULTI_CITY
 * @property {number} adults - Number of adult passengers
 * @property {number} children - Number of child passengers
 * @property {number} infants - Number of infant passengers
 * @property {string} cabin - ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
 * @property {boolean} nonStopOnly - Filter for non-stop flights only
 */

/**
 * @typedef {Object} FlightOffer
 * @property {string} id - Unique offer ID
 * @property {SourceInfo} source - Supplier information
 * @property {Itinerary} itinerary - Flight itinerary details
 * @property {Pricing} pricing - Price breakdown
 * @property {TravelerPricing[]} travelerPricing - Per-traveler pricing details
 * @property {number} validatingAirlineCode - Airline code for ticketing
 */

/**
 * @typedef {Object} SourceInfo
 * @property {string} supplier - Supplier name (amadeus, sabre, etc.)
 * @property {string} supplierOfferId - Original offer ID from supplier
 * @property {string} distributionChannel - GDS | NDC | DIRECT
 * @property {number} fetchedAt - Unix timestamp when data was fetched
 */

/**
 * @typedef {Object} Itinerary
 * @property {Slice[]} slices - Flight slices (outbound, inbound)
 */

/**
 * @typedef {Object} Slice
 * @property {string} sliceId - OUTBOUND | INBOUND
 * @property {number} durationMinutes - Total duration in minutes
 * @property {Segment[]} segments - Flight segments
 */

/**
 * @typedef {Object} Segment
 * @property {string} segmentId - Unique segment identifier
 * @property {string} marketingAirlineCode - Marketing carrier code (IATA)
 * @property {string} operatingAirlineCode - Operating carrier code (IATA)
 * @property {string} flightNumber - Flight number
 * @property {LocationTime} departure - Departure details
 * @property {LocationTime} arrival - Arrival details
 * @property {string} aircraftCode - Aircraft type code (IATA)
 * @property {string} cabinClass - ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
 * @property {string} bookingClass - Fare booking class (RBD)
 * @property {Baggage} baggage - Baggage allowance
 * @property {number} durationMinutes - Segment duration
 */

/**
 * @typedef {Object} LocationTime
 * @property {string} airportCode - Airport IATA code
 * @property {string|null} terminal - Terminal number/letter
 * @property {string} time - ISO 8601 datetime with timezone
 */

/**
 * @typedef {Object} Baggage
 * @property {BaggageAllowance} checkIn - Checked baggage
 * @property {BaggageAllowance} cabin - Cabin baggage
 */

/**
 * @typedef {Object} BaggageAllowance
 * @property {number} pieces - Number of pieces allowed
 * @property {number} weightKg - Weight in kilograms
 */

/**
 * @typedef {Object} Pricing
 * @property {number} totalAmount - Total price
 * @property {string} totalCurrency - Currency code
 * @property {number} baseAmount - Base fare
 * @property {number} taxesAmount - Taxes and fees
 * @property {string|null} fareFamily - Fare family name (SAVER, FLEX, etc.)
 * @property {boolean} isRefundable - Is ticket refundable
 * @property {boolean} isChangeable - Is ticket changeable
 * @property {PenaltiesSummary} penaltiesSummary - Penalties info
 */

/**
 * @typedef {Object} PenaltiesSummary
 * @property {string} changeFeeType - FIXED | VARIABLE | NOT_PERMITTED
 * @property {string} refundFeeType - FIXED | VARIABLE | NOT_PERMITTED
 */

/**
 * @typedef {Object} TravelerPricing
 * @property {string} travelerType - ADULT | CHILD | INFANT
 * @property {number} quantity - Number of travelers of this type
 * @property {PriceDetail} price - Price breakdown for this traveler type
 * @property {FareDetailBySegment[]} fareDetailsBySegment - Per-segment fare details
 */

/**
 * @typedef {Object} PriceDetail
 * @property {number} totalAmount - Total amount
 * @property {string} totalCurrency - Currency code
 * @property {number} baseAmount - Base fare
 * @property {number} taxesAmount - Taxes
 */

/**
 * @typedef {Object} FareDetailBySegment
 * @property {string} segmentId - Reference to segment ID
 * @property {string} cabinClass - Cabin class for this segment
 * @property {string} bookingClass - Booking class (RBD)
 * @property {string} fareBasisCode - Fare basis code
 * @property {Baggage} baggage - Baggage allowance for this segment
 */

/**
 * @typedef {Object} Dictionaries
 * @property {Object.<string, AirlineInfo>} airlines - Airline lookup
 * @property {Object.<string, AirportInfo>} airports - Airport lookup
 * @property {Object.<string, AircraftInfo>} aircraft - Aircraft lookup
 */

/**
 * @typedef {Object} AirlineInfo
 * @property {string} name - Airline full name
 * @property {string} [logo] - Airline logo URL (optional)
 */

/**
 * @typedef {Object} AirportInfo
 * @property {string} cityCode - City IATA code
 * @property {string} countryCode - Country ISO code
 * @property {string} name - Airport full name
 * @property {string} [timezone] - IANA timezone (optional)
 */

/**
 * @typedef {Object} AircraftInfo
 * @property {string} name - Aircraft model name
 */

/**
 * Standard Response Builder
 */
class FlightResponseBuilder {
  constructor() {
    this.meta = null;
    this.search = null;
    this.data = [];
    this.dictionaries = {
      airlines: {},
      airports: {},
      aircraft: {}
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

  addAirline(code, info) {
    this.dictionaries.airlines[code] = info;
    return this;
  }

  addAirport(code, info) {
    this.dictionaries.airports[code] = info;
    return this;
  }

  addAircraft(code, info) {
    this.dictionaries.aircraft[code] = info;
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

module.exports = {
  FlightResponseBuilder
};
