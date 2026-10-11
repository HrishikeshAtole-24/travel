/**
 * Ticketing Service
 * Places the airline order with the supplier AFTER the customer's payment succeeds,
 * and stores the airline PNR + e-ticket number on the booking.
 *
 * Suppliers differ in when seats are secured:
 *  - Duffel: nothing is held; the order is created after payment (fare re-checked first)
 *  - LiteAPI: seats are held at booking time (prebook, see holdFlight) and confirmed after payment
 *
 * ticketing_status lifecycle:
 *   PENDING → IN_PROGRESS → ISSUED
 *                         ↘ AWAITING_PNR (booked, airline PNR not returned yet - retry to refresh)
 *                         ↘ FAILED   (customer was charged - needs refund or manual rebooking)
 */
const { getPool } = require('../config/database');
const supplierFactory = require('../suppliers/supplierFactory');
const ApiError = require('../core/ApiError');
const { normalizePhone } = require('../utils/passengerValidation');
const logger = require('../config/winstonLogger');

// How long to wait between polls for an asynchronously issued airline PNR
const PNR_POLL_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 2000;
const PNR_POLL_ATTEMPTS = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

// ═══════════════════════════════════════════════════════════════
// 🔒 HOLD (before payment)
// ═══════════════════════════════════════════════════════════════

/**
 * Hold seats with the supplier before the customer pays (suppliers that support it).
 * Called while creating the booking, so failures surface to the customer before payment.
 *
 * @param {Object} params
 * @param {Object} params.pricedOffer - Standard priced offer
 * @param {Array} params.travelers - Validated travelers (offer passenger order)
 * @param {string} params.contactEmail
 * @param {string} params.contactPhone
 * @returns {Promise<Object|null>} { holdId, price, currency, expiresAt } or null if the supplier doesn't hold
 */
async function holdFlight({ pricedOffer, travelers, contactEmail, contactPhone }) {
  if (!pricedOffer?.requirements?.holdBeforePayment) return null;

  const supplier = supplierFactory(pricedOffer.source.supplier);
  const lead = travelers[0];

  try {
    const hold = await supplier.holdFlight({
      offerId: pricedOffer.source.supplierOfferId,
      travelers,
      contact: {
        email: contactEmail,
        phone: normalizePhone(contactPhone) || lead.phone,
        firstName: lead.firstName,
        lastName: lead.lastName
      }
    });

    return {
      holdId: hold.prebookId,
      price: hold.price,
      currency: hold.currency,
      expiresAt: hold.ticketLimitTime || null
    };
  } catch (error) {
    logger.warn(`[Ticketing] Hold failed with ${pricedOffer.source.supplier}: ${error.message}`);
    // The supplier's reason is user-readable (e.g. invalid phone, fare sold out)
    throw ApiError.badRequest(`The airline could not hold this fare: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎫 ISSUE (after payment)
// ═══════════════════════════════════════════════════════════════

async function markFailed(pool, bookingId, reason) {
  await pool.query(
    `UPDATE bookings SET ticketing_status = 'FAILED', ticketing_error = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [reason, bookingId]
  );
  logger.error(`[Ticketing] ❌ Booking ${bookingId} ticketing FAILED: ${reason} - customer was charged, refund or rebook manually`);
  return { success: false, status: 'FAILED', error: reason };
}

async function markIssued(pool, booking, { pnr, supplierOrderId, ticketNumber }) {
  await pool.query(
    `UPDATE bookings
     SET ticketing_status = 'ISSUED', ticketing_error = NULL,
         pnr = $1, supplier_order_id = $2, ticket_number = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [pnr, supplierOrderId, ticketNumber, booking.id]
  );
  logger.info(`[Ticketing] ✅ Booking ${booking.booking_reference} ticketed: PNR ${pnr}, order ${supplierOrderId}`);
  return { success: true, status: 'ISSUED', pnr, supplierOrderId };
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

/**
 * Duffel: re-check the offer, then create an instant order paid from the Duffel balance
 */
async function issueDuffelTickets(pool, booking, supplier) {
  // 1. Re-fetch the offer: it must still exist and cost no more than the customer paid for
  let offer;
  try {
    offer = (await supplier.getOffer(booking.supplier_offer_id)).data;
  } catch (error) {
    return markFailed(pool, booking.id, `Offer no longer available: ${error.message}`);
  }

  const quotedAmount = parseFloat(booking.supplier_amount);
  const currentAmount = parseFloat(offer.total_amount);

  if (offer.total_currency !== booking.supplier_currency) {
    return markFailed(pool, booking.id, `Offer currency changed from ${booking.supplier_currency} to ${offer.total_currency}`);
  }
  if (!(currentAmount <= quotedAmount + 0.001)) {
    return markFailed(pool, booking.id, `Fare increased from ${quotedAmount} to ${currentAmount} ${offer.total_currency}`);
  }

  // 2. Build passengers from the stored travelers
  const travelers = (await pool.query(
    'SELECT * FROM travelers WHERE booking_id = $1 ORDER BY id',
    [booking.id]
  )).rows;

  let passengers;
  try {
    passengers = buildDuffelPassengers(travelers, offer);
  } catch (error) {
    return markFailed(pool, booking.id, error.message);
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
    return markFailed(pool, booking.id, `Airline order failed: ${error.message}`);
  }

  return markIssued(pool, booking, {
    pnr: order.booking_reference,
    supplierOrderId: order.id,
    ticketNumber: (order.documents || []).find(d => d.type === 'electronic_ticket')?.unique_identifier || null
  });
}

/**
 * Airline PNR from a LiteAPI flight booking (set once the airline confirms)
 */
function extractLiteApiPnr(booking) {
  return booking?.airlineLocators?.find(l => l.airlinePnr)?.airlinePnr
    || booking?.order?.reference?.airlineBookings?.find(b => b.airlinePnr)?.airlinePnr
    || null;
}

/**
 * LiteAPI: confirm the held prebook (idempotent per prebookId), then collect the airline PNR
 */
async function issueLiteApiTickets(pool, booking, supplier) {
  if (!booking.supplier_hold_id) {
    return markFailed(pool, booking.id, 'No seat hold (prebook) recorded for this booking');
  }

  let result;
  try {
    result = await supplier.confirmFlight(booking.supplier_hold_id);
  } catch (error) {
    return markFailed(pool, booking.id, `Airline booking failed: ${error.message}`);
  }

  // Some airlines return the PNR asynchronously - poll briefly
  let current = result;
  for (let attempt = 0; attempt < PNR_POLL_ATTEMPTS && !extractLiteApiPnr(current); attempt++) {
    await sleep(PNR_POLL_DELAY_MS);
    try {
      current = await supplier.getFlightBooking(result.bookingId);
    } catch (error) {
      logger.warn(`[Ticketing] Could not refresh LiteAPI booking ${result.bookingId}: ${error.message}`);
    }
  }

  const status = String(current?.status || '').toUpperCase();
  if (['CANCELLED', 'FAILED', 'REJECTED'].includes(status)) {
    return markFailed(pool, booking.id, `Airline booking ${status.toLowerCase()} (LiteAPI ${result.bookingId})`);
  }

  const pnr = extractLiteApiPnr(current);
  const ticketNumber = current?.ticketData?.tickets?.find(t => t.ticketNumber)?.ticketNumber || null;

  if (!pnr) {
    await pool.query(
      `UPDATE bookings SET ticketing_status = 'AWAITING_PNR', supplier_order_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [result.bookingId, booking.id]
    );
    logger.warn(`[Ticketing] Booking ${booking.booking_reference} booked with LiteAPI (${result.bookingId}) but no airline PNR yet - retry ticketing to refresh`);
    return { success: true, status: 'AWAITING_PNR', supplierOrderId: result.bookingId };
  }

  return markIssued(pool, booking, { pnr, supplierOrderId: result.bookingId, ticketNumber });
}

// Suppliers we can ticket automatically
const ISSUERS = {
  duffel: issueDuffelTickets,
  liteapi: issueLiteApiTickets
};

/**
 * Place the supplier order for a paid flight booking.
 * Safe to call more than once: only a booking in PENDING (or FAILED/AWAITING_PNR with retry) is processed.
 *
 * @param {number} bookingId
 * @param {Object} [options]
 * @param {boolean} [options.retry=false] - Allow re-trying FAILED / AWAITING_PNR bookings (admin)
 * @returns {Promise<Object>} { success, status, pnr?, error? }
 */
async function issueFlightTickets(bookingId, { retry = false } = {}) {
  const pool = getPool();

  // Atomically claim the booking so concurrent payment callbacks can't double-book
  const claimable = retry ? ['PENDING', 'FAILED', 'AWAITING_PNR'] : ['PENDING'];
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
  const issue = ISSUERS[booking.supplier];

  if (!issue) {
    await pool.query(
      `UPDATE bookings SET ticketing_status = 'MANUAL', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [bookingId]
    );
    logger.warn(`[Ticketing] Supplier '${booking.supplier}' has no automated ordering - booking ${booking.booking_reference} needs manual ticketing`);
    return { success: false, status: 'MANUAL' };
  }

  try {
    return await issue(pool, booking, supplierFactory(booking.supplier));
  } catch (error) {
    // Unexpected error (DB etc.) - don't leave the booking stuck IN_PROGRESS
    return markFailed(pool, bookingId, `Unexpected ticketing error: ${error.message}`);
  }
}

module.exports = {
  holdFlight,
  issueFlightTickets,
  buildDuffelPassengers,
  extractLiteApiPnr,
  formatDate
};
