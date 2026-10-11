/**
 * LiteAPI Hotels
 * Flow: hotels/rates (search) → rates/prebook (confirms price, holds rate) → rates/book (after payment)
 * Docs: https://docs.liteapi.travel/reference/post_hotels-rates
 */
const liteApiClient = require('./liteapi.client');
const { LiteApiError, unwrap } = require('./liteapi.client');
const logger = require('../../config/winstonLogger');

class LiteApiHotelAPI {
  /**
   * Build LiteAPI occupancies: one entry per room, adults spread across rooms
   * @param {Object} params - { adults, roomQuantity, childrenAges: [5, 8] }
   */
  buildOccupancies({ adults = 1, roomQuantity = 1, childrenAges = [] }) {
    const rooms = Math.max(1, parseInt(roomQuantity) || 1);
    const totalAdults = Math.max(rooms, parseInt(adults) || 1);
    return Array.from({ length: rooms }, (_, i) => ({
      adults: Math.floor(totalAdults / rooms) + (i < totalAdults % rooms ? 1 : 0),
      // Children travel in the first room
      children: i === 0 ? childrenAges.map(a => parseInt(a)).filter(a => a >= 0 && a < 18) : []
    }));
  }

  /**
   * Search hotel rates
   * API: POST /hotels/rates (with includeHotelData for names, photos, ratings)
   *
   * @param {Object} params - { hotelIds | cityName+countryCode | latitude+longitude, checkInDate, checkOutDate, adults, roomQuantity, childrenAges, currency, guestNationality, limit }
   * @returns {Promise<Object>} Raw response plus the request (dates/occupancies are not echoed per hotel)
   */
  async searchHotelOffers(params) {
    const occupancies = this.buildOccupancies(params);

    const body = {
      checkin: params.checkInDate,
      checkout: params.checkOutDate,
      occupancies,
      currency: params.currency || 'INR',
      guestNationality: params.guestNationality || 'IN',
      includeHotelData: true,
      maxRatesPerHotel: parseInt(params.maxRatesPerHotel) || 5,
      limit: Math.min(parseInt(params.limit) || 30, 100),
      timeout: 8
    };

    if (params.hotelIds) {
      body.hotelIds = String(params.hotelIds).split(',').map(id => id.trim()).filter(Boolean);
      // Links each rate to a room in the hotel content (photos, size, beds) via mappedRoomId
      body.roomMapping = true;
    } else if (params.latitude && params.longitude) {
      body.latitude = parseFloat(params.latitude);
      body.longitude = parseFloat(params.longitude);
      body.radius = parseInt(params.radius) || 5000;
    } else {
      body.cityName = params.cityName;
      body.countryCode = params.countryCode;
    }

    if (params.refundableOnly) body.refundableRatesOnly = true;
    if (params.sort === 'popularity') body.sort = [{ field: 'top_picks', direction: 'descending' }];
    if (params.minRating) body.minRating = parseFloat(params.minRating);
    if (params.starRating) body.starRating = String(params.starRating).split(',').map(Number);

    logger.info(`🔍 LiteAPI hotel search: ${body.cityName || body.hotelIds?.join(',') || `${body.latitude},${body.longitude}`} ${body.checkin}→${body.checkout}`);
    const response = await liteApiClient.api('post', '/hotels/rates', { data: body, timeout: 45000 });
    logger.info(`✅ LiteAPI returned rates for ${response.data?.length || 0} hotels`);

    return { ...response, request: { checkin: body.checkin, checkout: body.checkout, occupancies } };
  }

  /**
   * Confirm an offer's price and availability; returns a reusable prebookId
   * API: POST /rates/prebook (usePaymentSdk=false - we collect payment ourselves)
   */
  async prebook(offerId) {
    if (!offerId) {
      throw new LiteApiError('Missing LiteAPI hotel offer ID', { status: 400 });
    }
    const response = await liteApiClient.book('post', '/rates/prebook', {
      data: { offerId, usePaymentSdk: false },
      timeout: 60000
    });
    return unwrap(response);
  }

  /**
   * Book a prebooked rate after our customer has paid
   * API: POST /rates/book
   * @param {Object} params - { prebookId, holder: {firstName,lastName,email,phone}, guests: [{occupancyNumber,firstName,lastName,email}], paymentMethod, clientReference }
   */
  async book({ prebookId, holder, guests, paymentMethod, clientReference }) {
    const response = await liteApiClient.book('post', '/rates/book', {
      data: {
        prebookId,
        clientReference,
        holder,
        guests,
        payment: { method: paymentMethod }
      },
      timeout: 120000
    });
    return unwrap(response);
  }

  /**
   * Hotel content: description, photos, facilities, rooms, policies
   * API: GET /data/hotel
   */
  async getHotelDetails(hotelId) {
    const response = await liteApiClient.api('get', '/data/hotel', { params: { hotelId, timeout: 8 }, timeout: 30000 });
    return response?.data;
  }

  /**
   * All cities LiteAPI has hotels in for a country
   * API: GET /data/cities
   */
  async getCities(countryCode) {
    const response = await liteApiClient.api('get', '/data/cities', { params: { countryCode }, timeout: 30000 });
    return response?.data || [];
  }

  /**
   * Retrieve a hotel booking
   * API: GET /bookings/:bookingId
   */
  async getBooking(bookingId) {
    const response = await liteApiClient.book('get', `/bookings/${encodeURIComponent(bookingId)}`);
    return unwrap(response);
  }
}

module.exports = new LiteApiHotelAPI();
