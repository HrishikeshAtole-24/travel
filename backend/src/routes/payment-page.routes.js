/**
 * Payment Page Routes
 * Hosted Razorpay checkout page (Horizon design) + payment error page
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');
const itineraryService = require('../services/itinerary.service');

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const parseJson = (v) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
};

/** Only allow redirects back to our own frontend */
const safeFrontendUrl = (url, fallbackPath) => {
  try {
    const u = new URL(url);
    const allowed = new URL(FRONTEND_URL());
    if (u.origin === allowed.origin) return u.toString();
  } catch { /* fall through */ }
  return `${FRONTEND_URL()}${fallbackPath}`;
};

/** What the traveller is paying for - shown in the order summary */
async function buildOrderSummary(pool, payment) {
  if (payment.hotel_booking_id) {
    const hotel = parseJson(payment.hotel_data);
    const nights = payment.check_in_date && payment.check_out_date
      ? Math.round((new Date(payment.check_out_date) - new Date(payment.check_in_date)) / 86400000)
      : null;
    return {
      type: 'hotel',
      title: payment.hotel_name || 'Hotel stay',
      photo: hotel.photo || null,
      address: hotel.address || null,
      room: [hotel.roomName, hotel.boardName].filter(Boolean).join(' · ') || null,
      checkIn: payment.check_in_date ? new Date(payment.check_in_date).toISOString().slice(0, 10) : null,
      checkOut: payment.check_out_date ? new Date(payment.check_out_date).toISOString().slice(0, 10) : null,
      nights,
      guests: `${payment.room_quantity || 1} room${payment.room_quantity > 1 ? 's' : ''} · ${payment.adults || 1} adult${payment.adults > 1 ? 's' : ''}`
    };
  }

  const flightData = parseJson(payment.flight_data);
  const itinerary = flightData.itinerary || itineraryService.fromSummary(flightData);
  const travellers = payment.booking_id
    ? (await pool.query('SELECT COUNT(*)::int AS n FROM travelers WHERE booking_id = $1', [payment.booking_id])).rows[0]?.n
    : null;
  const slices = (itinerary?.slices || []).map(s => {
    const first = s.segments[0];
    const last = s.segments[s.segments.length - 1];
    return {
      from: first?.departure?.code,
      to: last?.arrival?.code,
      depart: first?.departure?.time || null,
      arrive: last?.arrival?.time || null,
      airline: first?.airline?.name || first?.airline?.code,
      flightNumber: s.segments.map(g => g.flightNumber).join(' + '),
      stops: s.segments.length - 1,
      durationMinutes: s.durationMinutes || null
    };
  });
  return {
    type: 'flight',
    title: slices.length ? `${slices[0].from} → ${slices[0].to}${slices.length > 1 ? ' (round trip)' : ''}` : 'Flight booking',
    slices,
    cabin: itinerary?.cabin || null,
    travellers: travellers || null
  };
}

/**
 * GET /payment-page/:paymentReference
 * Render the hosted Razorpay payment page
 */
router.get('/payment-page/:paymentReference', async (req, res) => {
  try {
    const { paymentReference } = req.params;
    logger.info(`[PaymentPage] Loading payment page for: ${paymentReference}`);

    const pool = getPool();
    const result = await pool.query(
      `SELECT
        p.*,
        COALESCE(b.booking_reference, hb.booking_reference) AS booking_reference,
        COALESCE(b.expires_at, hb.expires_at) AS hold_expires_at,
        b.flight_data,
        hb.hotel_name, hb.hotel_data, hb.check_in_date, hb.check_out_date, hb.room_quantity, hb.adults,
        COALESCE(b.contact_email, hb.contact_email) AS contact_email,
        COALESCE(b.contact_phone, hb.contact_phone) AS contact_phone
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN hotel_bookings hb ON p.hotel_booking_id = hb.id
       WHERE p.payment_reference = $1`,
      [paymentReference]
    );

    if (result.rows.length === 0) {
      logger.warn(`[PaymentPage] Payment not found: ${paymentReference}`);
      return res.status(404).render('payment-error', {
        error: 'Payment link not found',
        message: 'This payment link is invalid or has expired.',
        frontendUrl: FRONTEND_URL()
      });
    }

    const payment = result.rows[0];
    logger.info(`[PaymentPage] Payment found - Status: ${payment.status}, Acquirer: ${payment.acquirer}`);

    // One confirmation page for flights and hotels (has e-ticket download + email)
    const successBase = `${FRONTEND_URL()}/payment-success`;
    const failureBase = safeFrontendUrl(payment.failure_url, '/payment-failed');

    // Already paid: send them to their confirmation instead of an error
    if (payment.status === 'completed' || payment.status === 'SUCCESS') {
      const u = new URL(successBase);
      u.searchParams.set('booking', payment.booking_reference);
      if (payment.acquirer_payment_id) u.searchParams.set('payment', payment.acquirer_payment_id);
      return res.redirect(u.toString());
    }

    const deadline = [payment.expires_at, payment.hold_expires_at]
      .filter(Boolean).map(d => new Date(d)).sort((a, b) => a - b)[0] || null;
    if (deadline && new Date() > deadline) {
      return res.status(400).render('payment-error', {
        error: 'This payment link has expired',
        message: 'Held fares and rooms are only reserved for a short time. Please search again to get a fresh price.',
        frontendUrl: FRONTEND_URL()
      });
    }

    const acquirerData = parseJson(payment.acquirer_response);
    const checkoutData = payment.payment_details ? parseJson(payment.payment_details) : (acquirerData.checkoutData || acquirerData || {});
    const orderId = checkoutData.order_id || checkoutData.orderId || acquirerData.acquirerOrderId || acquirerData.order_id || payment.acquirer_order_id || '';

    const summary = await buildOrderSummary(pool, payment);

    res.render('razorpay-payment', {
      summary,
      bookingReference: payment.booking_reference,
      paymentReference: payment.payment_reference,
      amount: parseFloat(payment.amount),
      currency: payment.currency || 'INR',
      customerName: payment.customer_name || checkoutData.prefill?.name || '',
      customerEmail: payment.customer_email || checkoutData.prefill?.email || payment.contact_email || '',
      deadline: deadline ? deadline.toISOString() : null,
      frontendUrl: FRONTEND_URL(),
      checkout: {
        key: checkoutData.key || process.env.RAZORPAY_KEY_ID,
        orderId,
        amount: Math.round(parseFloat(payment.amount) * 100),
        currency: payment.currency || 'INR',
        description: summary.type === 'hotel' ? `Hotel · ${summary.title}` : `Flight · ${summary.title}`,
        bookingReference: payment.booking_reference,
        bookingType: summary.type,
        prefill: {
          name: payment.customer_name || checkoutData.prefill?.name || '',
          email: payment.customer_email || checkoutData.prefill?.email || payment.contact_email || '',
          contact: payment.customer_phone || checkoutData.prefill?.contact || payment.contact_phone || ''
        },
        successUrl: successBase,
        failureUrl: failureBase
      }
    });
  } catch (error) {
    logger.error('[PaymentPage] Error:', error);
    res.status(500).render('payment-error', {
      error: 'We couldn’t load this payment',
      message: 'Please try again in a moment. You have not been charged.',
      frontendUrl: FRONTEND_URL()
    });
  }
});

/**
 * GET /payment-error
 * Render payment error page
 */
router.get('/payment-error', async (req, res) => {
  const { error, message, reason, payment_reference } = req.query;
  logger.info(`[PaymentError] Rendering error page: ${error || reason}`);
  res.render('payment-error', {
    error: error || 'Payment failed',
    message: message || reason || 'Something went wrong with your payment. Please try again or contact support.',
    paymentReference: payment_reference || null,
    frontendUrl: FRONTEND_URL()
  });
});

router.buildOrderSummary = buildOrderSummary; // exported for previews/tests
module.exports = router;
