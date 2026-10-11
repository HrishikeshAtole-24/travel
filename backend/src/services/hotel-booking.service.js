/**
 * Hotel Booking Service
 * Handles hotel booking creation, retrieval, and management
 * Follows same pattern as booking.service.js (flights)
 */
const { getPool } = require('../config/database');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');
const hotelService = require('./hotel.service');
const { canAccessBooking } = require('./booking.service');
const { generateReference } = require('../utils/security');

// Industry standard: Hotel bookings expire in 30 minutes if unpaid
const HOTEL_BOOKING_EXPIRY_MINUTES = 30;

// Hotel bookings in these states can still be cancelled
const CANCELLABLE_STATUSES = ['pending', 'payment_initiated', 'confirmed'];

/**
 * Generate unguessable hotel booking reference (e.g., HB-20241212-7KQ4M9XA2C)
 */
function generateHotelBookingReference() {
  return generateReference('HB');
}

/**
 * Look up the offer with the supplier and return the authoritative price.
 * Never trust a price sent by the client.
 * @param {string} offerId
 * @returns {{ totalPrice: number, currency: string, offer: Object }}
 */
async function resolveHotelOfferPrice(offerId) {
  const offer = await hotelService.getHotelOfferById(offerId);
  const totalPrice = parseFloat(offer?.pricing?.totalAmount);

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw ApiError.badRequest('Unable to confirm hotel price. Please search again.');
  }

  return {
    totalPrice,
    currency: offer.pricing.totalCurrency || offer.pricing.currency || 'INR',
    offer
  };
}

/**
 * Calculate booking expiration time
 */
function getBookingExpirationTime() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + HOTEL_BOOKING_EXPIRY_MINUTES);
  return expiresAt;
}

/**
 * Check if a hotel booking has expired
 */
function isBookingExpired(booking) {
  if (!booking.expires_at) return false;
  return new Date() > new Date(booking.expires_at);
}

// ═══════════════════════════════════════════════════════════════
// 📝 CREATE HOTEL BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * Create hotel booking with guest details
 * @param {Object} bookingData - Hotel booking data
 * @param {number|null} userId - User ID (null for guests)
 * @returns {Object} Created booking
 */
const createHotelBooking = async (bookingData, userId = null) => {
  const {
    hotelId,
    hotelName,
    hotelData,
    offerId,
    checkInDate,
    checkOutDate,
    roomQuantity,
    adults,
    guests,
    contactEmail,
    contactPhone,
    specialRequests
  } = bookingData;

  // Validate required fields
  if (!offerId || !guests || !contactEmail || !contactPhone) {
    throw ApiError.badRequest('Offer ID, guests, contact email and phone are required');
  }

  if (!Array.isArray(guests) || guests.length === 0) {
    throw ApiError.badRequest('At least one guest is required');
  }

  // Authoritative price + offer details from the supplier (client price is ignored).
  // Done before opening the transaction so no DB connection is held during the API call.
  const { totalPrice, currency, offer } = await resolveHotelOfferPrice(offerId);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate booking reference
    const bookingReference = generateHotelBookingReference();
    const expiresAt = getBookingExpirationTime();

    // Create hotel booking record
    const bookingResult = await client.query(
      `INSERT INTO hotel_bookings (
        booking_reference, user_id, hotel_id, offer_id,
        hotel_name, hotel_data, offer_data,
        check_in_date, check_out_date, room_quantity, adults,
        total_price, currency, status,
        contact_email, contact_phone, special_requests,
        expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        bookingReference,
        userId,
        offer.hotel?.hotelId || hotelId || null,
        offerId,
        offer.hotel?.name || hotelName || null,
        hotelData ? JSON.stringify(hotelData) : null,
        JSON.stringify(offer),
        offer.checkInDate || checkInDate || null,
        offer.checkOutDate || checkOutDate || null,
        roomQuantity || 1,
        adults || 1,
        totalPrice,
        currency,
        'pending',
        contactEmail,
        contactPhone,
        specialRequests || null,
        expiresAt
      ]
    );

    const booking = bookingResult.rows[0];

    // Insert guest records
    const guestRecords = [];
    for (const guest of guests) {
      const guestResult = await client.query(
        `INSERT INTO hotel_guests (
          hotel_booking_id, title, first_name, last_name, email, phone
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          booking.id,
          guest.title || null,
          guest.firstName,
          guest.lastName,
          guest.email || contactEmail,
          guest.phone || contactPhone
        ]
      );
      guestRecords.push(guestResult.rows[0]);
    }

    await client.query('COMMIT');

    logger.info(`✅ Hotel booking created: ${bookingReference} (expires: ${expiresAt.toISOString()})`);

    return {
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      hotelId: booking.hotel_id,
      offerId: booking.offer_id,
      hotelName: booking.hotel_name,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      roomQuantity: booking.room_quantity,
      adults: booking.adults,
      totalPrice: parseFloat(booking.total_price),
      currency: booking.currency,
      status: booking.status,
      contactEmail: booking.contact_email,
      contactPhone: booking.contact_phone,
      specialRequests: booking.special_requests,
      guests: guestRecords.map(g => ({
        id: g.id,
        title: g.title,
        firstName: g.first_name,
        lastName: g.last_name,
        email: g.email,
        phone: g.phone
      })),
      expiresAt: booking.expires_at,
      createdAt: booking.created_at
    };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Hotel booking creation error:', error);
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Failed to create hotel booking');
  } finally {
    client.release();
  }
};

// ═══════════════════════════════════════════════════════════════
// 📖 GET HOTEL BOOKINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get hotel booking by ID
 * @param {number} bookingId - Booking ID
 * @param {Object} access - { userId, email } of the caller (see canAccessBooking)
 * @returns {Object} Booking details
 */
const getHotelBookingById = async (bookingId, access = {}) => {
  const pool = getPool();

  try {
    const result = await pool.query('SELECT * FROM hotel_bookings WHERE id = $1', [bookingId]);

    // Same 404 for "missing" and "not yours" so IDs can't be probed
    if (result.rows.length === 0 || !canAccessBooking(result.rows[0], access)) {
      throw ApiError.notFound('Hotel booking not found');
    }

    const booking = result.rows[0];

    // Check if expired
    if (isBookingExpired(booking) && ['pending', 'payment_initiated'].includes(booking.status)) {
      await updateHotelBookingStatus(bookingId, 'expired');
      booking.status = 'expired';
    }

    // Get guests
    const guestsResult = await pool.query(
      'SELECT * FROM hotel_guests WHERE hotel_booking_id = $1',
      [bookingId]
    );

    return formatBookingResponse(booking, guestsResult.rows);

  } catch (error) {
    logger.error('❌ Get hotel booking error:', error);
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Failed to get hotel booking');
  }
};

/**
 * Get hotel booking by reference
 * @param {string} bookingReference - Booking reference (HB-XXXXXXXX-XXXXXXXXXX)
 * @param {Object} access - { userId, email } of the caller (see canAccessBooking)
 * @returns {Object} Booking details
 */
const getHotelBookingByReference = async (bookingReference, access = {}) => {
  const pool = getPool();

  try {
    const result = await pool.query(
      'SELECT * FROM hotel_bookings WHERE booking_reference = $1',
      [bookingReference]
    );

    if (result.rows.length === 0 || !canAccessBooking(result.rows[0], access)) {
      throw ApiError.notFound('Hotel booking not found');
    }

    const booking = result.rows[0];

    // Check expiry
    if (isBookingExpired(booking) && ['pending', 'payment_initiated'].includes(booking.status)) {
      await updateHotelBookingStatus(booking.id, 'expired');
      booking.status = 'expired';
    }

    // Get guests
    const guestsResult = await pool.query(
      'SELECT * FROM hotel_guests WHERE hotel_booking_id = $1',
      [booking.id]
    );

    return formatBookingResponse(booking, guestsResult.rows);

  } catch (error) {
    logger.error('❌ Get hotel booking by reference error:', error);
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Failed to get hotel booking');
  }
};

/**
 * Get user's hotel bookings
 * @param {number} userId - User ID
 * @returns {Array} List of bookings
 */
const getUserHotelBookings = async (userId) => {
  const pool = getPool();

  try {
    // Expire stale unpaid bookings in one statement
    await pool.query(
      `UPDATE hotel_bookings
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND status IN ('pending', 'payment_initiated')
         AND expires_at IS NOT NULL
         AND expires_at < NOW()`,
      [userId]
    );

    const result = await pool.query(
      `SELECT * FROM hotel_bookings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    // Load all guests in a single query instead of one query per booking
    const guestsResult = await pool.query(
      'SELECT * FROM hotel_guests WHERE hotel_booking_id = ANY($1::int[])',
      [result.rows.map(b => b.id)]
    );

    const guestsByBooking = new Map();
    for (const guest of guestsResult.rows) {
      if (!guestsByBooking.has(guest.hotel_booking_id)) {
        guestsByBooking.set(guest.hotel_booking_id, []);
      }
      guestsByBooking.get(guest.hotel_booking_id).push(guest);
    }

    return result.rows.map(booking =>
      formatBookingResponse(booking, guestsByBooking.get(booking.id) || [])
    );

  } catch (error) {
    logger.error('❌ Get user hotel bookings error:', error);
    throw ApiError.internal('Failed to get user hotel bookings');
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 UPDATE HOTEL BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * Update hotel booking status
 * @param {number} bookingId - Booking ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional fields to update
 * @returns {Object} Updated booking
 */
const updateHotelBookingStatus = async (bookingId, status, additionalData = {}) => {
  const pool = getPool();

  try {
    let query = `UPDATE hotel_bookings SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params = [status];
    let paramIndex = 2;

    if (additionalData.providerConfirmationId) {
      query += `, provider_confirmation_id = $${paramIndex}`;
      params.push(additionalData.providerConfirmationId);
      paramIndex++;
    }

    if (additionalData.amadeusOrderId) {
      query += `, amadeus_order_id = $${paramIndex}`;
      params.push(additionalData.amadeusOrderId);
      paramIndex++;
    }

    if (additionalData.cancellationReason) {
      query += `, special_requests = COALESCE(special_requests, '') || $${paramIndex}`;
      params.push(`\n[CANCELLED: ${new Date().toISOString()}] Reason: ${additionalData.cancellationReason}`);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(bookingId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw ApiError.notFound('Hotel booking not found');
    }

    logger.info(`✅ Hotel booking ${bookingId} status updated to: ${status}`);
    return result.rows[0];

  } catch (error) {
    logger.error('❌ Update hotel booking status error:', error);
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Failed to update hotel booking status');
  }
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Format booking for API response
 */
function formatBookingResponse(booking, guests = []) {
  return {
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    hotelId: booking.hotel_id,
    offerId: booking.offer_id,
    hotelName: booking.hotel_name,
    hotelData: booking.hotel_data,
    offerData: booking.offer_data,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    roomQuantity: booking.room_quantity,
    adults: booking.adults,
    totalPrice: parseFloat(booking.total_price),
    currency: booking.currency,
    status: booking.status,
    contactEmail: booking.contact_email,
    contactPhone: booking.contact_phone,
    specialRequests: booking.special_requests,
    providerConfirmationId: booking.provider_confirmation_id,
    amadeusOrderId: booking.amadeus_order_id,
    guests: guests.map(g => ({
      id: g.id,
      title: g.title,
      firstName: g.first_name,
      lastName: g.last_name,
      email: g.email,
      phone: g.phone
    })),
    expiresAt: booking.expires_at,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at
  };
}

/**
 * Cancel a hotel booking the caller has access to
 * @param {number} bookingId
 * @param {Object} access - { userId, email }
 * @param {string} reason
 */
const cancelHotelBooking = async (bookingId, access, reason) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM hotel_bookings WHERE id = $1', [bookingId]);

  if (result.rows.length === 0 || !canAccessBooking(result.rows[0], access)) {
    throw ApiError.notFound('Hotel booking not found');
  }

  const booking = result.rows[0];
  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    throw ApiError.badRequest(`Cannot cancel booking with status: ${booking.status}`);
  }

  const updated = await updateHotelBookingStatus(bookingId, 'cancelled', {
    cancellationReason: reason || 'Cancelled by customer'
  });
  return formatBookingResponse(updated);
};

/**
 * Record supplier confirmation details for a PAID hotel booking.
 * Requires a successful payment - this can never confirm an unpaid booking.
 * @param {number} bookingId
 * @param {Object} access - { userId, email }
 * @param {Object} details - { providerConfirmationId, amadeusOrderId }
 */
const confirmHotelBooking = async (bookingId, access, details = {}) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM hotel_bookings WHERE id = $1', [bookingId]);

  if (result.rows.length === 0 || !canAccessBooking(result.rows[0], access)) {
    throw ApiError.notFound('Hotel booking not found');
  }

  const booking = result.rows[0];
  if (!['pending', 'payment_initiated', 'confirmed'].includes(booking.status)) {
    throw ApiError.badRequest(`Cannot confirm booking with status: ${booking.status}`);
  }

  const paid = await pool.query(
    `SELECT 1 FROM payments WHERE hotel_booking_id = $1 AND status = 'SUCCESS' LIMIT 1`,
    [bookingId]
  );
  if (paid.rows.length === 0) {
    throw ApiError.badRequest('Hotel booking has not been paid');
  }

  const updated = await updateHotelBookingStatus(bookingId, 'confirmed', {
    providerConfirmationId: details.providerConfirmationId || null,
    amadeusOrderId: details.amadeusOrderId || null
  });
  return formatBookingResponse(updated);
};

module.exports = {
  createHotelBooking,
  getHotelBookingById,
  getHotelBookingByReference,
  getUserHotelBookings,
  updateHotelBookingStatus,
  cancelHotelBooking,
  confirmHotelBooking,
  generateHotelBookingReference,
  isBookingExpired
};
