/**
 * Duffel Flight API Implementation
 * Docs: https://duffel.com/docs/api/v2/offer-requests
 *       https://duffel.com/docs/api/v2/offers
 *       https://duffel.com/docs/api/v2/orders
 */
const duffelClient = require('./duffel.client');
const { DuffelError } = require('./duffel.client');
const logger = require('../../config/winstonLogger');

// Our cabin codes → Duffel cabin_class
const CABIN_MAP = {
  ECONOMY: 'economy',
  PREMIUM_ECONOMY: 'premium_economy',
  BUSINESS: 'business',
  FIRST: 'first'
};

// How long Duffel may wait on airlines before returning offers (ms)
const SUPPLIER_TIMEOUT_MS = 15000;

class DuffelFlightAPI {
  /**
   * Build the Duffel passengers list from our search params
   * Children and infants are sent by type; Duffel prices them accordingly.
   */
  buildPassengers(searchParams) {
    const adults = Math.max(1, parseInt(searchParams.adults) || 1);
    const children = Math.max(0, parseInt(searchParams.children) || 0);
    const infants = Math.max(0, parseInt(searchParams.infants) || 0);

    return [
      ...Array.from({ length: adults }, () => ({ type: 'adult' })),
      ...Array.from({ length: children }, () => ({ type: 'child' })),
      ...Array.from({ length: infants }, () => ({ type: 'infant_without_seat' }))
    ];
  }

  /**
   * Search flights
   * API: POST /air/offer_requests?return_offers=true
   *
   * @param {Object} searchParams - { origin, destination, departureDate, returnDate, adults, children, infants, cabin, nonStopOnly }
   * @returns {Promise<Object>} Raw Duffel offer request ({ data: { offers: [...] } })
   */
  async searchFlights(searchParams) {
    const slices = [{
      origin: searchParams.origin,
      destination: searchParams.destination,
      departure_date: searchParams.departureDate
    }];

    if (searchParams.returnDate) {
      slices.push({
        origin: searchParams.destination,
        destination: searchParams.origin,
        departure_date: searchParams.returnDate
      });
    }

    const body = {
      data: {
        slices,
        passengers: this.buildPassengers(searchParams),
        cabin_class: CABIN_MAP[String(searchParams.cabin || 'ECONOMY').toUpperCase()] || 'economy'
      }
    };

    if (searchParams.nonStopOnly) {
      body.data.max_connections = 0;
    }

    logger.info(`🔍 Duffel search: ${searchParams.origin}→${searchParams.destination} ${searchParams.departureDate}${searchParams.returnDate ? ` ↩ ${searchParams.returnDate}` : ''}`);

    const response = await duffelClient.post('/air/offer_requests', body, {
      return_offers: true,
      supplier_timeout: SUPPLIER_TIMEOUT_MS
    });

    logger.info(`✅ Duffel returned ${response.data?.offers?.length || 0} offers`);
    return response;
  }

  /**
   * Get a single offer with its latest price (price confirmation)
   * API: GET /air/offers/:id
   *
   * @param {string} offerId - Duffel offer ID (off_...)
   * @returns {Promise<Object>} Raw Duffel offer ({ data: offer })
   */
  async getOffer(offerId) {
    if (!offerId || !String(offerId).startsWith('off_')) {
      throw new DuffelError('Invalid Duffel offer ID', { status: 400 });
    }
    return duffelClient.get(`/air/offers/${encodeURIComponent(offerId)}`);
  }

  /**
   * Create an instant order, paid from the Duffel balance
   * API: POST /air/orders
   *
   * @param {Object} params
   * @param {string} params.offerId - Duffel offer ID
   * @param {Array} params.passengers - Duffel passenger objects (with offer passenger IDs)
   * @param {string} params.amount - Exact offer total_amount
   * @param {string} params.currency - Offer total_currency
   * @param {Object} [params.metadata] - Up to 50 string key/values stored on the order
   * @returns {Promise<Object>} Raw Duffel order ({ data: order })
   */
  async createOrder({ offerId, passengers, amount, currency, metadata }) {
    const body = {
      data: {
        type: 'instant',
        selected_offers: [offerId],
        passengers,
        payments: [{ type: 'balance', amount: String(amount), currency }],
        ...(metadata ? { metadata } : {})
      }
    };

    logger.info(`🎫 Duffel creating order for offer ${offerId} (${passengers.length} passengers)`);
    const response = await duffelClient.post('/air/orders', body);
    logger.info(`✅ Duffel order created: ${response.data?.id} PNR ${response.data?.booking_reference}`);
    return response;
  }

  /**
   * Get an order
   * API: GET /air/orders/:id
   */
  async getOrder(orderId) {
    return duffelClient.get(`/air/orders/${encodeURIComponent(orderId)}`);
  }

  /**
   * Health check - cheapest authenticated call
   */
  async healthCheck() {
    try {
      await duffelClient.get('/air/airlines', { limit: 1 });
      return { status: 'OK', supplier: 'duffel', testMode: duffelClient.isTestMode() };
    } catch (error) {
      return { status: 'ERROR', supplier: 'duffel', error: error.message };
    }
  }
}

module.exports = new DuffelFlightAPI();
