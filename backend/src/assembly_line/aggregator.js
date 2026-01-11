/**
 * Flight Aggregator
 * Merges, deduplicates, and sorts flight offers from multiple suppliers
 */

const logger = require('../config/winstonLogger');

class FlightAggregator {
  /**
   * Merge flight offers from multiple suppliers
   * @param {Array<Array>} supplierResults - Array of results from each supplier
   * @returns {Array} Merged and deduplicated offers
   */
  static mergeOffers(supplierResults) {
    // Flatten all results into one array
    const allOffers = supplierResults.flat();

    logger.info(`Total offers before deduplication: ${allOffers.length}`);

    // Deduplicate based on flight details
    const uniqueOffers = this.deduplicateOffers(allOffers);

    logger.info(`Total offers after deduplication: ${uniqueOffers.length}`);

    return uniqueOffers;
  }

  /**
   * Deduplicate offers
   * Same flight from multiple suppliers should appear once (pick cheapest)
   * @param {Array} offers - All flight offers
   * @returns {Array} Deduplicated offers
   */
  static deduplicateOffers(offers) {
    const offerMap = new Map();

    offers.forEach(offer => {
      // Create unique key based on flight details
      const key = this.generateOfferKey(offer);

      const existing = offerMap.get(key);
      
      if (!existing) {
        // First time seeing this flight
        offerMap.set(key, offer);
      } else {
        // Duplicate found - keep the cheaper one
        if (offer.pricing.totalAmount < existing.pricing.totalAmount) {
          offerMap.set(key, offer);
          logger.debug(`Replaced offer with cheaper one from ${offer.source.supplier}`);
        }
      }
    });

    return Array.from(offerMap.values());
  }

  /**
   * Generate unique key for an offer based on flight details
   * @param {Object} offer - Flight offer
   * @returns {string} Unique key
   */
  static generateOfferKey(offer) {
    const { itinerary } = offer;
    
    // Build key from all segments
    const segments = [];
    itinerary.slices.forEach(slice => {
      slice.segments.forEach(segment => {
        segments.push([
          segment.marketingAirlineCode,
          segment.flightNumber,
          segment.departure.airportCode,
          segment.arrival.airportCode,
          segment.departure.time,
          segment.cabinClass
        ].join('|'));
      });
    });

    return segments.join('::');
  }

  /**
   * Sort offers by specified criteria
   * @param {Array} offers - Flight offers
   * @param {string} sortBy - Sorting criteria (PRICE_ASC, DURATION_ASC, DEPARTURE_TIME_ASC)
   * @returns {Array} Sorted offers
   */
  static sortOffers(offers, sortBy = 'PRICE_ASC') {
    const sortFunctions = {
      PRICE_ASC: (a, b) => a.pricing.totalAmount - b.pricing.totalAmount,
      PRICE_DESC: (a, b) => b.pricing.totalAmount - a.pricing.totalAmount,
      
      DURATION_ASC: (a, b) => {
        const aDuration = this.getTotalDuration(a.itinerary);
        const bDuration = this.getTotalDuration(b.itinerary);
        return aDuration - bDuration;
      },
      
      DURATION_DESC: (a, b) => {
        const aDuration = this.getTotalDuration(a.itinerary);
        const bDuration = this.getTotalDuration(b.itinerary);
        return bDuration - aDuration;
      },
      
      DEPARTURE_TIME_ASC: (a, b) => {
        const aTime = new Date(a.itinerary.slices[0].segments[0].departure.time);
        const bTime = new Date(b.itinerary.slices[0].segments[0].departure.time);
        return aTime - bTime;
      },
      
      DEPARTURE_TIME_DESC: (a, b) => {
        const aTime = new Date(a.itinerary.slices[0].segments[0].departure.time);
        const bTime = new Date(b.itinerary.slices[0].segments[0].departure.time);
        return bTime - aTime;
      },

      BEST: (a, b) => {
        // "Best" = balance of price and duration
        // Normalize both to 0-1 scale and calculate score
        const prices = offers.map(o => o.pricing.totalAmount);
        const durations = offers.map(o => this.getTotalDuration(o.itinerary));
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        const normalizePrice = (price) => (price - minPrice) / (maxPrice - minPrice || 1);
        const normalizeDuration = (duration) => (duration - minDuration) / (maxDuration - minDuration || 1);
        
        const aScore = normalizePrice(a.pricing.totalAmount) * 0.6 + normalizeDuration(this.getTotalDuration(a.itinerary)) * 0.4;
        const bScore = normalizePrice(b.pricing.totalAmount) * 0.6 + normalizeDuration(this.getTotalDuration(b.itinerary)) * 0.4;
        
        return aScore - bScore;
      }
    };

    const sortFn = sortFunctions[sortBy] || sortFunctions.PRICE_ASC;
    return [...offers].sort(sortFn);
  }

  /**
   * Get total duration of itinerary
   * @param {Object} itinerary - Flight itinerary
   * @returns {number} Total duration in minutes
   */
  static getTotalDuration(itinerary) {
    return itinerary.slices.reduce((total, slice) => total + slice.durationMinutes, 0);
  }

  /**
   * Filter offers by criteria
   * @param {Array} offers - Flight offers
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered offers
   */
  static filterOffers(offers, filters = {}) {
    let filtered = [...offers];

    // Filter by non-stop only
    if (filters.nonStopOnly) {
      filtered = filtered.filter(offer => {
        return offer.itinerary.slices.every(slice => slice.segments.length === 1);
      });
    }

    // Filter by max stops
    if (filters.maxStops !== undefined) {
      filtered = filtered.filter(offer => {
        const maxStops = Math.max(...offer.itinerary.slices.map(slice => slice.segments.length - 1));
        return maxStops <= filters.maxStops;
      });
    }

    // Filter by airlines (whitelist)
    if (filters.airlines && filters.airlines.length > 0) {
      filtered = filtered.filter(offer => {
        const airlineCodes = new Set();
        offer.itinerary.slices.forEach(slice => {
          slice.segments.forEach(segment => {
            airlineCodes.add(segment.marketingAirlineCode);
          });
        });
        return filters.airlines.some(code => airlineCodes.has(code));
      });
    }

    // Filter by max price
    if (filters.maxPrice) {
      filtered = filtered.filter(offer => offer.pricing.totalAmount <= filters.maxPrice);
    }

    // Filter by min price
    if (filters.minPrice) {
      filtered = filtered.filter(offer => offer.pricing.totalAmount >= filters.minPrice);
    }

    // Filter by departure time range
    if (filters.departureTimeStart || filters.departureTimeEnd) {
      filtered = filtered.filter(offer => {
        const departureTime = new Date(offer.itinerary.slices[0].segments[0].departure.time);
        const hours = departureTime.getHours();
        
        const start = filters.departureTimeStart || 0;
        const end = filters.departureTimeEnd || 24;
        
        return hours >= start && hours <= end;
      });
    }

    // Filter by refundable
    if (filters.refundableOnly) {
      filtered = filtered.filter(offer => offer.pricing.isRefundable);
    }

    logger.info(`Filtered offers: ${offers.length} → ${filtered.length}`);

    return filtered;
  }

  /**
   * Paginate offers
   * @param {Array} offers - Flight offers
   * @param {number} page - Page number (1-indexed)
   * @param {number} pageSize - Results per page
   * @returns {Object} Paginated result
   */
  static paginate(offers, page = 1, pageSize = 50) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: offers.slice(startIndex, endIndex),
      pagination: {
        page,
        pageSize,
        totalResults: offers.length,
        totalPages: Math.ceil(offers.length / pageSize),
        hasNext: endIndex < offers.length,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Complete aggregation pipeline
   * @param {Array<Array>} supplierResults - Results from all suppliers
   * @param {Object} options - Aggregation options
   * @returns {Object} Aggregated result
   */
  static aggregate(supplierResults, options = {}) {
    const {
      sortBy = 'PRICE_ASC',
      filters = {},
      page = 1,
      pageSize = 50
    } = options;

    // Step 1: Merge and deduplicate
    let offers = this.mergeOffers(supplierResults);

    // Step 2: Apply filters
    offers = this.filterOffers(offers, filters);

    // Step 3: Sort
    offers = this.sortOffers(offers, sortBy);

    // Step 4: Paginate
    const result = this.paginate(offers, page, pageSize);

    logger.info(`Aggregation complete: ${result.data.length} offers returned (page ${page})`);

    return result;
  }
}

module.exports = FlightAggregator;
