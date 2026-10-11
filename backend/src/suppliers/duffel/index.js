/**
 * Duffel Supplier Interface
 * Same method names as the Amadeus supplier so flight.service can stay supplier-agnostic.
 */
const duffelFlightAPI = require('./duffel.flight');

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // 🔥 CORE FLIGHT SEARCH & BOOKING APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search for flight offers
   * @param {Object} params - Standard search parameters
   */
  searchFlights: (params) => duffelFlightAPI.searchFlights(params),

  /**
   * Re-price an offer before booking.
   * Duffel offers are priced by ID, so only the supplier offer ID is used -
   * anything else the client sent is ignored.
   * @param {Object} standardOffer - Standard offer ({ source: { supplierOfferId } })
   */
  priceFlights: (standardOffer) =>
    duffelFlightAPI.getOffer(standardOffer?.source?.supplierOfferId),

  /**
   * Get raw offer by Duffel ID
   * @param {string} offerId - off_...
   */
  getOffer: (offerId) => duffelFlightAPI.getOffer(offerId),

  /**
   * Create an instant order (tickets issued, paid from Duffel balance)
   * @param {Object} params - { offerId, passengers, amount, currency, metadata }
   */
  createFlightOrder: (params) => duffelFlightAPI.createOrder(params),

  /**
   * Get order by ID
   * @param {string} orderId - ord_...
   */
  getFlightOrder: (orderId) => duffelFlightAPI.getOrder(orderId),

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILITY
  // ═══════════════════════════════════════════════════════════════

  healthCheck: () => duffelFlightAPI.healthCheck()
};
