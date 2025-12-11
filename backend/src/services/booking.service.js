/**
 * Booking Service
 * Handles flight booking logic
 */

const { getPool } = require('../config/database');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');
const paymentService = require('../payments/payment.service');

/**
 * Generate booking reference (e.g., BK-20241212-XXXXX)
 */
function generateBookingReference() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(10000 + Math.random() * 90000);
  return `BK-${dateStr}-${random}`;
}

/**
 * Create booking with travelers
 * Called after user confirms passenger details
 */
const createBooking = async (bookingData, userId = null) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      flightId,
      flightData, // Complete flight offer from search
      travelers,
      contactEmail,
      contactPhone,
      totalPrice,
      currency,
      specialRequests
    } = bookingData;

    // Validate required fields
    if (!flightData || !travelers || !contactEmail || !contactPhone) {
      throw ApiError.badRequest('Flight data, travelers, and contact info are required');
    }

    if (!travelers || travelers.length === 0) {
      throw ApiError.badRequest('At least one traveler is required');
    }

    // Generate booking reference
    const bookingReference = generateBookingReference();

    // Create booking record
    const bookingResult = await client.query(
      `INSERT INTO bookings (
        booking_reference, user_id, flight_id, flight_data,
        total_price, currency, status,
        contact_email, contact_phone, special_requests,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        bookingReference,
        userId,
        flightId || null,
        JSON.stringify(flightData),
        totalPrice,
        currency || 'INR',
        'pending',
        contactEmail,
        contactPhone,
        specialRequests || null
      ]
    );

    const booking = bookingResult.rows[0];

    // Create traveler records
    for (const traveler of travelers) {
      await client.query(
        `INSERT INTO travelers (
          booking_id, traveler_type, title, first_name, last_name,
          date_of_birth, gender, passport_number, passport_expiry,
          nationality, email, phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          booking.id,
          traveler.type || 'ADULT',
          traveler.title,
          traveler.firstName,
          traveler.lastName,
          traveler.dateOfBirth,
          traveler.gender,
          traveler.passportNumber || null,
          traveler.passportExpiry || null,
          traveler.nationality,
          traveler.email || contactEmail,
          traveler.phone || contactPhone
        ]
      );
    }

    await client.query('COMMIT');

    logger.info(`[Booking] Created: ${bookingReference}, User: ${userId || 'guest'}`);

    return {
      success: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      status: booking.status,
      totalPrice: parseFloat(booking.total_price),
      currency: booking.currency,
      contactEmail: booking.contact_email,
      contactPhone: booking.contact_phone,
      createdAt: booking.created_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('[Booking] Creation failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get booking by ID
 */
const getBookingById = async (bookingId, userId = null) => {
  try {
    const pool = getPool();

    let query = 'SELECT * FROM bookings WHERE id = $1';
    const params = [bookingId];

    // If user is logged in, verify ownership
    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw ApiError.notFound('Booking not found');
    }

    const booking = result.rows[0];

    // Get travelers
    const travelersResult = await pool.query(
      'SELECT * FROM travelers WHERE booking_id = $1',
      [bookingId]
    );

    // Get payments
    const paymentsResult = await pool.query(
      'SELECT payment_reference, amount, currency, status, created_at FROM payments WHERE booking_id = $1',
      [bookingId]
    );

    return {
      success: true,
      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        status: booking.status,
        flightData: booking.flight_data,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        contactEmail: booking.contact_email,
        contactPhone: booking.contact_phone,
        specialRequests: booking.special_requests,
        pnr: booking.pnr,
        ticketNumber: booking.ticket_number,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        travelers: travelersResult.rows,
        payments: paymentsResult.rows
      }
    };
  } catch (error) {
    logger.error('[Booking] Get booking failed:', error.message);
    throw error;
  }
};

/**
 * Get booking by reference
 */
const getBookingByReference = async (bookingReference, contactEmail = null) => {
  try {
    const pool = getPool();

    let query = 'SELECT * FROM bookings WHERE booking_reference = $1';
    const params = [bookingReference];

    // Optionally verify contact email for guest bookings
    if (contactEmail) {
      query += ' AND contact_email = $2';
      params.push(contactEmail);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw ApiError.notFound('Booking not found');
    }

    const booking = result.rows[0];

    // Get travelers
    const travelersResult = await pool.query(
      'SELECT * FROM travelers WHERE booking_id = $1',
      [booking.id]
    );

    // Get payments
    const paymentsResult = await pool.query(
      'SELECT payment_reference, amount, currency, status, created_at FROM payments WHERE booking_id = $1',
      [booking.id]
    );

    return {
      success: true,
      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        status: booking.status,
        flightData: booking.flight_data,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        contactEmail: booking.contact_email,
        contactPhone: booking.contact_phone,
        pnr: booking.pnr,
        ticketNumber: booking.ticket_number,
        createdAt: booking.created_at,
        travelers: travelersResult.rows,
        payments: paymentsResult.rows
      }
    };
  } catch (error) {
    logger.error('[Booking] Get booking by reference failed:', error.message);
    throw error;
  }
};

/**
 * Get user's bookings
 */
const getUserBookings = async (userId) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, booking_reference, status, total_price, currency, 
              contact_email, pnr, ticket_number, created_at
       FROM bookings 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return {
      success: true,
      bookings: result.rows.map(booking => ({
        id: booking.id,
        bookingReference: booking.booking_reference,
        status: booking.status,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        contactEmail: booking.contact_email,
        pnr: booking.pnr,
        ticketNumber: booking.ticket_number,
        createdAt: booking.created_at
      }))
    };
  } catch (error) {
    logger.error('[Booking] Get user bookings failed:', error.message);
    throw error;
  }
};

/**
 * Update booking status
 */
const updateBookingStatus = async (bookingId, status, additionalData = {}) => {
  try {
    const pool = getPool();

    const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status, bookingId];
    let paramIndex = 2;

    if (additionalData.pnr) {
      updates.push(`pnr = $${++paramIndex}`);
      params.splice(paramIndex - 1, 0, additionalData.pnr);
    }

    if (additionalData.ticketNumber) {
      updates.push(`ticket_number = $${++paramIndex}`);
      params.splice(paramIndex - 1, 0, additionalData.ticketNumber);
    }

    const query = `
      UPDATE bookings 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw ApiError.notFound('Booking not found');
    }

    logger.info(`[Booking] Status updated: ${bookingId} -> ${status}`);

    return {
      success: true,
      booking: result.rows[0]
    };
  } catch (error) {
    logger.error('[Booking] Update status failed:', error.message);
    throw error;
  }
};

module.exports = {
  createBooking,
  getBookingById,
  getBookingByReference,
  getUserBookings,
  updateBookingStatus
};
