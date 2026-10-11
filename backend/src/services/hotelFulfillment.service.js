/**
 * Hotel Fulfillment Service
 * Books the room with the supplier AFTER the customer's payment succeeds and
 * stores the hotel confirmation code on the hotel booking.
 *
 * fulfillment_status lifecycle:
 *   PENDING → IN_PROGRESS → CONFIRMED
 *                         ↘ FAILED   (customer was charged - needs refund or manual rebooking)
 */
const { getPool } = require('../config/database');
const supplierFactory = require('../suppliers/supplierFactory');
const { normalizePhone } = require('../utils/passengerValidation');
const logger = require('../config/winstonLogger');

async function markFailed(pool, bookingId, reason) {
  await pool.query(
    `UPDATE hotel_bookings SET fulfillment_status = 'FAILED', fulfillment_error = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [reason, bookingId]
  );
  logger.error(`[HotelFulfillment] ❌ Hotel booking ${bookingId} FAILED: ${reason} - customer was charged, refund or rebook manually`);
  return { success: false, status: 'FAILED', error: reason };
}

/**
 * LiteAPI: book the prebooked rate with one lead guest per room
 */
async function fulfillWithLiteApi(pool, booking, supplier) {
  if (!booking.supplier_hold_id) {
    return markFailed(pool, booking.id, 'No prebook recorded for this booking');
  }

  const guests = (await pool.query(
    'SELECT * FROM hotel_guests WHERE hotel_booking_id = $1 ORDER BY id',
    [booking.id]
  )).rows;

  if (guests.length === 0) {
    return markFailed(pool, booking.id, 'No guests recorded for this booking');
  }

  const offer = typeof booking.offer_data === 'string' ? JSON.parse(booking.offer_data) : (booking.offer_data || {});
  const occupancyNumbers = (offer.rooms || []).map(r => r.occupancyNumber).filter(Boolean);
  const rooms = occupancyNumbers.length > 0 ? occupancyNumbers : [1];

  const lead = guests[0];
  const phone = normalizePhone(booking.contact_phone) || normalizePhone(lead.phone);

  let result;
  try {
    result = await supplier.bookHotel({
      prebookId: booking.supplier_hold_id,
      clientReference: booking.booking_reference,
      holder: {
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: booking.contact_email,
        phone
      },
      // Lead guest per room: guest N goes to room N, extra rooms reuse the lead guest
      guests: rooms.map((occupancyNumber, i) => {
        const guest = guests[i] || lead;
        return {
          occupancyNumber,
          firstName: guest.first_name,
          lastName: guest.last_name,
          email: guest.email || booking.contact_email
        };
      })
    });
  } catch (error) {
    return markFailed(pool, booking.id, `Hotel booking failed: ${error.message}`);
  }

  const status = String(result?.status || '').toUpperCase();
  if (status && !['CONFIRMED', 'PENDING'].includes(status)) {
    return markFailed(pool, booking.id, `Hotel booking ${status.toLowerCase()} (LiteAPI ${result.bookingId})`);
  }

  await pool.query(
    `UPDATE hotel_bookings
     SET fulfillment_status = 'CONFIRMED', fulfillment_error = NULL,
         supplier_booking_id = $1, provider_confirmation_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [result.bookingId, result.hotelConfirmationCode || null, booking.id]
  );

  logger.info(`[HotelFulfillment] ✅ ${booking.booking_reference} booked: LiteAPI ${result.bookingId}, hotel confirmation ${result.hotelConfirmationCode || 'pending'}`);
  return {
    success: true,
    status: 'CONFIRMED',
    supplierBookingId: result.bookingId,
    hotelConfirmationCode: result.hotelConfirmationCode || null
  };
}

// Suppliers we can book hotels with automatically
const FULFILLERS = {
  liteapi: fulfillWithLiteApi
};

/**
 * Book a paid hotel booking with its supplier.
 * Safe to call more than once: only a booking in PENDING (or FAILED with retry) is processed.
 *
 * @param {number} hotelBookingId
 * @param {Object} [options] - { retry: boolean }
 */
async function fulfillHotelBooking(hotelBookingId, { retry = false } = {}) {
  const pool = getPool();

  // Atomically claim the booking so concurrent payment callbacks can't double-book
  const claimable = retry ? ['PENDING', 'FAILED'] : ['PENDING'];
  const claim = await pool.query(
    `UPDATE hotel_bookings
     SET fulfillment_status = 'IN_PROGRESS', fulfillment_error = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'confirmed' AND fulfillment_status = ANY($2::text[])
     RETURNING *`,
    [hotelBookingId, claimable]
  );

  if (claim.rows.length === 0) {
    logger.info(`[HotelFulfillment] Hotel booking ${hotelBookingId} not eligible (already processed, unpaid or no supplier)`);
    return { success: false, status: 'SKIPPED' };
  }

  const booking = claim.rows[0];
  const fulfill = FULFILLERS[booking.supplier];

  if (!fulfill) {
    await pool.query(
      `UPDATE hotel_bookings SET fulfillment_status = 'MANUAL', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [hotelBookingId]
    );
    logger.warn(`[HotelFulfillment] Supplier '${booking.supplier}' has no automated booking - ${booking.booking_reference} needs manual handling`);
    return { success: false, status: 'MANUAL' };
  }

  try {
    return await fulfill(pool, booking, supplierFactory(booking.supplier));
  } catch (error) {
    // Unexpected error (DB etc.) - don't leave the booking stuck IN_PROGRESS
    return markFailed(pool, hotelBookingId, `Unexpected fulfillment error: ${error.message}`);
  }
}

module.exports = {
  fulfillHotelBooking
};
