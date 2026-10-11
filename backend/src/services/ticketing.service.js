/**
 * Ticketing Service
 * Places the airline order with the supplier AFTER the customer's payment succeeds,
 * and stores the airline PNR + e-ticket number on the booking.
 *
 * ticketing_status lifecycle:
 *   PENDING → IN_PROGRESS → ISSUED
 *                         ↘ FAILED   (customer was charged - needs refund or manual rebooking)
 */
const { getPool } = require('../config/database');
const supplierFactory = require('../suppliers/supplierFactory');
const logger = require('../config/winstonLogger');

// Suppliers we can place orders with automatically
const ORDERING_SUPPLIERS = ['duffel'];

/**
 * Format a DATE column as YYYY-MM-DD.
 * node-pg returns DATE as a local-midnight Date, so toISOString() would shift
 * the day backwards in timezones ahead of UTC (e.g. IST).
 */
function formatDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Build Duffel order passengers from our stored travelers
 * @param {Array} travelers - travelers rows
 * @param {Object} offer - Fresh raw Duffel offer
 * @returns {Array} Duffel passenger objects
 */
function buildDuffelPassengers(travelers, offer) {
  const offerPassengerIds = new Set(offer.passengers.map(p => p.id));
  const documentsRequired = Boolean(offer.passenger_identity_documents_required);

  const passengers = travelers.map(t => {
    if (!t.supplier_passenger_id || !offerPassengerIds.has(t.supplier_passenger_id)) {
      throw new Error(`Traveler ${t.first_name} ${t.last_name} does not match a passenger on the offer`);
    }

    const passenger = {
      id: t.supplier_passenger_id,
      title: t.gender === 'female' ? 'ms' : 'mr',
      gender: t.gender === 'female' ? 'f' : 'm',
      given_name: t.first_name,
      family_name: t.last_name,
      born_on: formatDate(t.date_of_birth),
      email: t.email,
      phone_number: t.phone
    };

    if (documentsRequired) {
      passenger.identity_documents = [{
        type: 'passport',
        unique_identifier: t.passport_number,
        issuing_country_code: t.nationality,
        expires_on: formatDate(t.passport_expiry)
      }];
    }

    return { passenger, type: t.traveler_type };
  });

  // Every infant travels on an adult's lap: link each infant to its own adult
  const adults = passengers.filter(p => p.type === 'ADULT');
  const infants = passengers.filter(p => p.type === 'INFANT');
  if (infants.length > adults.length) {
    throw new Error('Each infant must travel with a separate adult');
  }
  infants.forEach((infant, i) => {
    adults[i].passenger.infant_passenger_id = infant.passenger.id;
  });

  return passengers.map(p => p.passenger);
}

async function markFailed(pool, bookingId, reason) {
  await pool.query(
    `UPDATE bookings SET ticketing_status = 'FAILED', ticketing_error = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [reason, bookingId]
  );
  logger.error(`[Ticketing] ❌ Booking ${bookingId} ticketing FAILED: ${reason} - customer was charged, refund or rebook manually`);
  return { success: false, status: 'FAILED', error: reason };
}

/**
 * Place the supplier order for a paid flight booking.
 * Safe to call more than once: only a booking in PENDING (or FAILED with retry) is processed.
 *
 * @param {number} bookingId
 * @param {Object} [options]
 * @param {boolean} [options.retry=false] - Allow re-trying a FAILED booking (admin)
 * @returns {Promise<Object>} { success, status, pnr?, error? }
 */
async function issueFlightTickets(bookingId, { retry = false } = {}) {
  const pool = getPool();

  // Atomically claim the booking so concurrent payment callbacks can't double-book
  const claimable = retry ? ['PENDING', 'FAILED'] : ['PENDING'];
  const claim = await pool.query(
    `UPDATE bookings
     SET ticketing_status = 'IN_PROGRESS', ticketing_error = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'confirmed' AND ticketing_status = ANY($2::text[])
     RETURNING *`,
    [bookingId, claimable]
  );

  if (claim.rows.length === 0) {
    logger.info(`[Ticketing] Booking ${bookingId} not eligible for ticketing (already processed, unpaid or no supplier)`);
    return { success: false, status: 'SKIPPED' };
  }

  const booking = claim.rows[0];

  if (!ORDERING_SUPPLIERS.includes(booking.supplier)) {
    await pool.query(
      `UPDATE bookings SET ticketing_status = 'MANUAL', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [bookingId]
    );
    logger.warn(`[Ticketing] Supplier '${booking.supplier}' has no automated ordering - booking ${booking.booking_reference} needs manual ticketing`);
    return { success: false, status: 'MANUAL' };
  }

  const supplier = supplierFactory(booking.supplier);

  try {
    // 1. Re-fetch the offer: it must still exist and cost no more than the customer paid for
    let offer;
    try {
      offer = (await supplier.getOffer(booking.supplier_offer_id)).data;
    } catch (error) {
      return markFailed(pool, bookingId, `Offer no longer available: ${error.message}`);
    }

    const quotedAmount = parseFloat(booking.supplier_amount);
    const currentAmount = parseFloat(offer.total_amount);

    if (offer.total_currency !== booking.supplier_currency) {
      return markFailed(pool, bookingId, `Offer currency changed from ${booking.supplier_currency} to ${offer.total_currency}`);
    }
    if (!(currentAmount <= quotedAmount + 0.001)) {
      return markFailed(pool, bookingId, `Fare increased from ${quotedAmount} to ${currentAmount} ${offer.total_currency}`);
    }

    // 2. Build passengers from the stored travelers
    const travelers = (await pool.query(
      'SELECT * FROM travelers WHERE booking_id = $1 ORDER BY id',
      [bookingId]
    )).rows;

    let passengers;
    try {
      passengers = buildDuffelPassengers(travelers, offer);
    } catch (error) {
      return markFailed(pool, bookingId, error.message);
    }

    // 3. Place the order (instant ticketing, paid from the supplier balance)
    let order;
    try {
      order = (await supplier.createFlightOrder({
        offerId: offer.id,
        passengers,
        amount: offer.total_amount,
        currency: offer.total_currency,
        metadata: { booking_reference: booking.booking_reference }
      })).data;
    } catch (error) {
      return markFailed(pool, bookingId, `Airline order failed: ${error.message}`);
    }

    const ticketNumber = (order.documents || []).find(d => d.type === 'electronic_ticket')?.unique_identifier || null;

    await pool.query(
      `UPDATE bookings
       SET ticketing_status = 'ISSUED', ticketing_error = NULL,
           pnr = $1, supplier_order_id = $2, ticket_number = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [order.booking_reference, order.id, ticketNumber, bookingId]
    );

    logger.info(`[Ticketing] ✅ Booking ${booking.booking_reference} ticketed: PNR ${order.booking_reference}, order ${order.id}`);
    return { success: true, status: 'ISSUED', pnr: order.booking_reference, supplierOrderId: order.id };

  } catch (error) {
    // Unexpected error (DB etc.) - don't leave the booking stuck IN_PROGRESS
    return markFailed(pool, bookingId, `Unexpected ticketing error: ${error.message}`);
  }
}

module.exports = {
  issueFlightTickets,
  buildDuffelPassengers,
  formatDate
};
