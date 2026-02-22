/**
 * Booking Service
 * Handles flight booking logic
 */

const { getPool } = require('../config/database');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');
const paymentService = require('../payments/payment.service');

// Industry standard: Flight bookings expire in 30 minutes if unpaid
const BOOKING_EXPIRY_MINUTES = 30;

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
 * Calculate booking expiration time
 */
function getBookingExpirationTime() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + BOOKING_EXPIRY_MINUTES);
  return expiresAt;
}

/**
 * Check if a booking has expired
 */
function isBookingExpired(booking) {
  if (!booking.expires_at) return false;
  return new Date() > new Date(booking.expires_at);
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
    
    // Calculate expiration time (industry standard: 30 minutes for flight bookings)
    const expiresAt = getBookingExpirationTime();

    // Check if expires_at column exists
    const columnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'expires_at'
    `);
    const hasExpiresAt = columnCheck.rows.length > 0;

    // Create booking record (with or without expires_at)
    let bookingResult;
    if (hasExpiresAt) {
      bookingResult = await client.query(
        `INSERT INTO bookings (
          booking_reference, user_id, flight_id, flight_data,
          total_price, currency, status,
          contact_email, contact_phone, special_requests,
          expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
          specialRequests || null,
          expiresAt
        ]
      );
    } else {
      bookingResult = await client.query(
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
    }

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
          traveler.title || null,
          traveler.firstName,
          traveler.lastName,
          traveler.dateOfBirth,
          traveler.gender ? traveler.gender.toLowerCase() : null,
          traveler.documentNumber || traveler.passportNumber || null,
          traveler.documentExpiry || traveler.passportExpiry || null,
          traveler.nationality,
          traveler.email || contactEmail,
          traveler.phone || contactPhone
        ]
      );
    }

    await client.query('COMMIT');

    logger.info(`[Booking] Created: ${bookingReference}, User: ${userId || 'guest'}, Expires: ${expiresAt.toISOString()}`);

    return {
      success: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      status: booking.status,
      totalPrice: parseFloat(booking.total_price),
      currency: booking.currency,
      contactEmail: booking.contact_email,
      contactPhone: booking.contact_phone,
      createdAt: booking.created_at,
      expiresAt: booking.expires_at,
      expiryMinutes: BOOKING_EXPIRY_MINUTES
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
    
    // Check if booking has expired (and update status if needed)
    const expired = isBookingExpired(booking);
    if (expired && ['pending', 'payment_initiated'].includes(booking.status)) {
      // Auto-expire the booking
      await pool.query(
        'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['expired', booking.id]
      );
      booking.status = 'expired';
      logger.info(`[Booking] Auto-expired: ${booking.booking_reference}`);
    }

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
        expiresAt: booking.expires_at,
        isExpired: expired,
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
 * Works with or without expires_at column
 */
const getUserBookings = async (userId) => {
  try {
    const pool = getPool();
    
    // Check if expires_at column exists (for backwards compatibility)
    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'expires_at'
    `);
    const hasExpiresAt = columnCheck.rows.length > 0;
    
    // Only run expiration query if column exists
    if (hasExpiresAt) {
      await pool.query(
        `UPDATE bookings 
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 
         AND status IN ('pending', 'payment_initiated')
         AND expires_at IS NOT NULL
         AND expires_at < NOW()`,
        [userId]
      );
    }
    
    // Select query without expires_at for compatibility
    const result = await pool.query(
      `SELECT id, booking_reference, status, total_price, currency, 
              contact_email, pnr, ticket_number, flight_data, created_at
       FROM bookings 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return {
      bookings: result.rows.map(booking => {
        return {
          id: booking.id,
          bookingReference: booking.booking_reference,
          status: booking.status,
          totalPrice: parseFloat(booking.total_price),
          currency: booking.currency,
          contactEmail: booking.contact_email,
          pnr: booking.pnr,
          ticketNumber: booking.ticket_number,
          flightData: booking.flight_data,
          createdAt: booking.created_at,
          expiresAt: null,
          isExpired: false
        };
      })
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
    const params = [status];
    let paramIndex = 1;

    if (additionalData.pnr) {
      paramIndex++;
      updates.push(`pnr = $${paramIndex}`);
      params.push(additionalData.pnr);
    }

    if (additionalData.ticketNumber) {
      paramIndex++;
      updates.push(`ticket_number = $${paramIndex}`);
      params.push(additionalData.ticketNumber);
    }

    if (additionalData.cancellationReason) {
      paramIndex++;
      updates.push(`special_requests = COALESCE(special_requests, '') || $${paramIndex}`);
      params.push(`\n[CANCELLED: ${new Date().toISOString()}] Reason: ${additionalData.cancellationReason}`);
    }

    // Add booking ID as the last parameter
    paramIndex++;
    params.push(bookingId);

    const query = `
      UPDATE bookings 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
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
  updateBookingStatus,
  isBookingExpired,
  BOOKING_EXPIRY_MINUTES
};
