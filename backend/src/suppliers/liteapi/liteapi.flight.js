/**
 * LiteAPI Flights
 * Flow: rates (search) → verify → prebooks (holds seats, needs passengers) → bookings (after payment)
 * Docs: https://docs.liteapi.travel/docs/build-a-flight-booking-experience
 */
const liteApiClient = require('./liteapi.client');
const { LiteApiError, unwrap } = require('./liteapi.client');
const logger = require('../../config/winstonLogger');

// Standard traveler type → LiteAPI prebook passengerType
const PASSENGER_TYPE_CODES = { ADULT: 0, CHILD: 1, INFANT: 2 };

class LiteApiFlightAPI {
  /**
   * Search flights
   * API: POST /flights/rates
   * @param {Object} searchParams - Standard search params (+ currency)
   * @returns {Promise<Object>} Raw response { data: [{ journeys: [...] }] }
   */
  async searchFlights(searchParams) {
    const legs = [{
      origin: searchParams.origin,
      destination: searchParams.destination,
      date: searchParams.departureDate,
      direction: 'OUTBOUND'
    }];

    if (searchParams.returnDate) {
      legs.push({
        origin: searchParams.destination,
        destination: searchParams.origin,
        date: searchParams.returnDate,
        direction: 'INBOUND'
      });
    }

    const body = {
      legs,
      adults: Math.max(1, parseInt(searchParams.adults) || 1),
      children: parseInt(searchParams.children) || 0,
      infants: parseInt(searchParams.infants) || 0,
      cabinClass: String(searchParams.cabin || 'ECONOMY').toUpperCase(),
      currency: searchParams.currency || 'INR',
      country: searchParams.country || 'IN'
    };

    if (searchParams.nonStopOnly) {
      body.filters = { maxStops: 0 };
    }

    logger.info(`🔍 LiteAPI flight search: ${searchParams.origin}→${searchParams.destination} ${searchParams.departureDate}`);
    const response = await liteApiClient.api('post', '/flights/rates', { data: body, timeout: 60000 });
    logger.info(`✅ LiteAPI returned ${response.data?.[0]?.journeys?.length || 0} journeys`);
    return response;
  }

  /**
   * Re-confirm an offer's availability and price
   * API: POST /flights/verify
   * The verify response does not echo the offerId, so it is attached for the mapper.
   */
  async verifyOffer(offerId) {
    if (!offerId) {
      throw new LiteApiError('Missing LiteAPI offer ID', { status: 400 });
    }
    const response = await liteApiClient.api('post', '/flights/verify', { data: { offerId } });
    return { ...response, requestedOfferId: offerId };
  }

  /**
   * Split an E.164 number into country code + national number for LiteAPI contact
   */
  splitPhone(e164) {
    const digits = String(e164 || '').replace(/[^\d]/g, '');
    // Common 1-3 digit country codes; India (+91) is the default market
    const codes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '39', '41', '44', '45', '46', '47', '48', '49',
      '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '94', '95',
      '234', '254', '880', '960', '961', '962', '965', '966', '968', '971', '973', '974', '977'];
    const code = codes
      .filter(c => digits.startsWith(c))
      .sort((a, b) => b.length - a.length)[0] || digits.slice(0, 2);
    return { phoneCountryCode: code, phoneNumber: digits.slice(code.length) };
  }

  /**
   * Hold the fare with the airline (creates the provider reservation)
   * API: POST /flights/prebooks with usePaymentSdk=false (we collect payment ourselves)
   *
   * @param {Object} params
   * @param {string} params.offerId - Verified LiteAPI offer ID
   * @param {Array} params.travelers - Validated standard travelers
   * @param {Object} params.contact - { email, phone (E.164), firstName, lastName }
   * @returns {Promise<Object>} { prebookId, price, currency, raw }
   */
  async prebook({ offerId, travelers, contact }) {
    const passengers = travelers.map(t => ({
      firstName: t.firstName,
      lastName: t.lastName,
      birthday: t.dateOfBirth,
      gender: String(t.gender).toUpperCase() === 'FEMALE' ? 'F' : 'M',
      nationality: t.nationality || 'IN',
      passengerType: PASSENGER_TYPE_CODES[t.type] ?? 0,
      ...(t.documentNumber ? {
        documentType: 'passport',
        documentNumber: t.documentNumber,
        documentExpiry: t.documentExpiry,
        documentIssueCountry: t.nationality || 'IN'
      } : {})
    }));

    const body = {
      offerId,
      usePaymentSdk: false,
      contact: {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        ...this.splitPhone(contact.phone)
      },
      passengers
    };

    logger.info(`🎫 LiteAPI prebook (${passengers.length} passengers)`);
    const response = await liteApiClient.api('post', '/flights/prebooks', { data: body, timeout: 90000 });
    const data = unwrap(response);

    return {
      prebookId: data.prebookId,
      price: parseFloat(data.price),
      currency: data.currency,
      // Prebook responses carry no hold deadline; the booking's expiry falls back to the
      // verified offer's expiration (see booking.service), which is the conservative choice
      ticketLimitTime: null,
      raw: data
    };
  }

  /**
   * Confirm the held booking after our customer has paid
   * API: POST /flights/bookings (idempotent per prebookId)
   * @param {Object} params - { prebookId, paymentMethod }
   */
  async book({ prebookId, paymentMethod }) {
    const response = await liteApiClient.api('post', '/flights/bookings', {
      data: { prebookId, payment: { method: paymentMethod } },
      timeout: 120000
    });
    return unwrap(response)?.booking || unwrap(response);
  }

  /**
   * Get a booking (status, airline PNR, ticket numbers)
   * API: GET /flights/bookings/:bookingId
   */
  async getBooking(bookingId) {
    const response = await liteApiClient.api('get', `/flights/bookings/${encodeURIComponent(bookingId)}`);
    const data = unwrap(response);
    return data?.booking || data;
  }
}

module.exports = new LiteApiFlightAPI();
