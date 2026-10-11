/**
 * LiteAPI (Nuitée Connect) Supplier Interface
 * Same method names as the Duffel/Amadeus suppliers so services stay supplier-agnostic.
 */
const liteApiFlightAPI = require('./liteapi.flight');
const liteApiHotelAPI = require('./liteapi.hotel');

// How we pay LiteAPI after collecting from the customer:
// ACC_CREDIT_CARD = card saved on the Nuitée account (simulated in sandbox), CREDIT = credit line
const PAYMENT_METHOD = process.env.LITEAPI_PAYMENT_METHOD || 'ACC_CREDIT_CARD';

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // ✈️ FLIGHTS
  // ═══════════════════════════════════════════════════════════════

  searchFlights: (params) => liteApiFlightAPI.searchFlights(params),

  /**
   * Re-price an offer before booking (verify). Only the supplier offer ID is used.
   * @param {Object} standardOffer - { source: { supplierOfferId } }
   */
  priceFlights: (standardOffer) => liteApiFlightAPI.verifyOffer(standardOffer?.source?.supplierOfferId),

  /**
   * Hold seats with the airline before payment (requires passenger details)
   * @param {Object} params - { offerId, travelers, contact }
   */
  holdFlight: (params) => liteApiFlightAPI.prebook(params),

  /**
   * Confirm a held flight after payment
   * @param {string} prebookId
   */
  confirmFlight: (prebookId) => liteApiFlightAPI.book({ prebookId, paymentMethod: PAYMENT_METHOD }),

  getFlightBooking: (bookingId) => liteApiFlightAPI.getBooking(bookingId),

  // ═══════════════════════════════════════════════════════════════
  // 🏨 HOTELS
  // ═══════════════════════════════════════════════════════════════

  searchHotelOffers: (params) => liteApiHotelAPI.searchHotelOffers(params),

  /**
   * Confirm a hotel offer's price (prebook). The prebook ID is reused to book after payment.
   * @param {string} offerId - Raw LiteAPI offer ID
   */
  prebookHotelOffer: (offerId) => liteApiHotelAPI.prebook(offerId),

  /**
   * Book a prebooked hotel rate after payment
   * @param {Object} params - { prebookId, holder, guests, clientReference }
   */
  bookHotel: (params) => liteApiHotelAPI.book({ ...params, paymentMethod: PAYMENT_METHOD }),

  getHotelBooking: (bookingId) => liteApiHotelAPI.getBooking(bookingId),

  /**
   * Hotel content for the details page
   * @param {string} hotelId
   */
  getHotelDetails: (hotelId) => liteApiHotelAPI.getHotelDetails(hotelId),

  /**
   * Cities with hotels in a country (destination autocomplete)
   * @param {string} countryCode - ISO-2, e.g. IN
   */
  getHotelCities: (countryCode) => liteApiHotelAPI.getCities(countryCode)
};
