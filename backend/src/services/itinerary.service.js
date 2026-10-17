/**
 * Itinerary Service
 * One normalized itinerary shape for e-tickets, emails and the success page.
 *
 * Sources (most authoritative first):
 *   1. Supplier order   - after ticketing (LiteAPI / Duffel): PNRs, ticket numbers, exact times
 *   2. Priced offer     - saved at booking time from the supplier re-price
 *   3. Legacy summary   - the thin flight_data older bookings stored
 *
 * Times are kept as the airport's LOCAL wall-clock ("2026-11-13T17:20") and never
 * shifted through the server's timezone.
 */

const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const SUPPLIER_NAMES = { liteapi: 'Nuitée', duffel: 'Duffel', amadeus: 'Amadeus' };

/** "2026-11-13T17:20:00+05:30" -> "2026-11-13T17:20" (local wall clock) */
const localStamp = (value) => {
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!m) return null;
  return m[2] ? `${m[1]}T${m[2]}` : m[1];
};

/** "PT1H55M" -> 115 */
const isoMinutes = (iso) => {
  if (typeof iso === 'number') return iso;
  const m = typeof iso === 'string' && iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  return (parseInt(m[1] || 0, 10) * 1440) + (parseInt(m[2] || 0, 10) * 60) + parseInt(m[3] || 0, 10);
};

const cabinLabel = (c) => {
  const v = String(c || '').toUpperCase().replace(/\s+/g, '_');
  return { ECONOMY: 'Economy', PREMIUM_ECONOMY: 'Premium Economy', BUSINESS: 'Business', FIRST: 'First' }[v] || (c ? String(c) : 'Economy');
};

const minutesBetween = (a, b) => {
  if (!a || !b) return null;
  const d = (new Date(`${b}:00Z`) - new Date(`${a}:00Z`)) / 60000;
  return Number.isFinite(d) && d >= 0 ? d : null;
};

const withLayovers = (slice) => {
  const segs = slice.segments;
  slice.layovers = segs.slice(0, -1).map((s, i) => ({
    airport: s.arrival.code,
    airportName: s.arrival.name || null,
    minutes: minutesBetween(s.arrival.time, segs[i + 1].departure.time)
  }));
  // Airport-local clocks can't be subtracted across timezones: prefer flown time + layovers
  if (!slice.durationMinutes) {
    const flown = segs.every(s => s.durationMinutes) ? segs.reduce((sum, s) => sum + s.durationMinutes, 0) : null;
    const waits = slice.layovers.every(l => l.minutes !== null) ? slice.layovers.reduce((sum, l) => sum + l.minutes, 0) : null;
    slice.durationMinutes = flown !== null && waits !== null
      ? flown + waits
      : minutesBetween(segs[0]?.departure.time, segs[segs.length - 1]?.arrival.time);
  }
  return slice;
};

/* ---------------- Standard offer (core/FlightResponseFormat) ---------------- */
function fromStandardOffer(offer, dictionaries = {}) {
  if (!offer?.itinerary?.slices?.length) return null;
  const airlines = dictionaries.airlines || {};
  const airports = dictionaries.airports || {};
  const airportInfo = (code) => {
    const a = airports[code] || {};
    return { name: a.name || null, city: a.cityName || a.city || null };
  };
  const fareBySeg = {};
  for (const tp of offer.travelerPricing || []) {
    for (const f of tp.fareDetailsBySegment || []) fareBySeg[f.segmentId] = fareBySeg[f.segmentId] || f;
  }

  const slices = offer.itinerary.slices.map((slice, si) => withLayovers({
    direction: slice.sliceId || (si === 0 ? 'OUTBOUND' : 'INBOUND'),
    durationMinutes: slice.durationMinutes || null,
    segments: (slice.segments || []).map(seg => {
      const fare = fareBySeg[seg.segmentId] || {};
      const code = seg.marketingAirlineCode;
      const num = String(seg.flightNumber || '').replace(new RegExp(`^${code}`), '');
      return {
        airline: { code, name: airlines[code]?.name || seg.marketingAirlineName || code, logo: seg.marketingAirlineLogo || airlines[code]?.logo || null },
        operatingAirline: seg.operatingAirlineCode && seg.operatingAirlineCode !== code
          ? { code: seg.operatingAirlineCode, name: airlines[seg.operatingAirlineCode]?.name || seg.operatingAirlineCode }
          : null,
        flightNumber: `${code}${num}`,
        departure: { code: seg.departure?.airportCode, ...airportInfo(seg.departure?.airportCode), terminal: seg.departure?.terminal || null, time: localStamp(seg.departure?.time) },
        arrival: { code: seg.arrival?.airportCode, ...airportInfo(seg.arrival?.airportCode), terminal: seg.arrival?.terminal || null, time: localStamp(seg.arrival?.time) },
        durationMinutes: seg.durationMinutes || null,
        cabin: cabinLabel(fare.cabinClass || seg.cabinClass),
        bookingClass: fare.bookingClass || seg.bookingClass || null,
        fareBasis: fare.fareBasisCode || null,
        aircraft: seg.aircraftCode || null
      };
    })
  }));

  const firstBag = slices[0]?.segments?.[0] && (offer.itinerary.slices[0].segments[0].baggage || {});
  const baggage = [];
  if (firstBag?.cabin?.pieces || firstBag?.cabin?.weightKg) baggage.push({ type: 'cabin', description: 'Cabin bag', pieces: firstBag.cabin.pieces || 1, weightKg: firstBag.cabin.weightKg || null });
  if (firstBag?.checkIn?.pieces || firstBag?.checkIn?.weightKg) baggage.push({ type: 'checked', description: 'Checked bag', pieces: firstBag.checkIn.pieces || 1, weightKg: firstBag.checkIn.weightKg || null });

  const p = offer.pricing || {};
  return {
    source: 'offer',
    slices,
    cabin: slices[0]?.segments?.[0]?.cabin || 'Economy',
    fareFamily: p.fareFamily || null,
    refundable: p.isRefundable ?? null,
    changeable: p.isChangeable ?? null,
    baggage,
    price: { base: p.baseAmount ?? null, taxes: p.taxesAmount ?? null, total: p.totalAmount ?? null, currency: p.totalCurrency || 'INR' },
    airlineLocators: [],
    tickets: [],
    supplierName: SUPPLIER_NAMES[offer.source?.supplier] || null,
    supplierRef: null
  };
}

/* ---------------- LiteAPI order (GET /flights/bookings/:id) ---------------- */
function fromLiteApiOrder(order) {
  const j = order?.journey;
  if (!j?.segments?.length) return null;
  const fareBySeg = Object.fromEntries((j.segmentFares || []).map(f => [f.segmentKey, f]));
  const groups = {};
  for (const s of j.segments) (groups[s.direction || 'OUTBOUND'] = groups[s.direction || 'OUTBOUND'] || []).push(s);

  const slices = Object.entries(groups).map(([direction, segs]) => withLayovers({
    direction,
    durationMinutes: null,
    segments: segs.map(s => {
      const fare = fareBySeg[s.segmentKey] || {};
      const c = s.carrier || {};
      return {
        airline: { code: c.marketingCode, name: c.marketingName || c.marketingCode, logo: c.marketingLogo || null },
        operatingAirline: c.operatingCode && c.operatingCode !== c.marketingCode ? { code: c.operatingCode, name: c.operatingName || c.operatingCode } : null,
        flightNumber: `${c.marketingCode || ''}${s.flight?.marketingNumber || ''}`,
        departure: { code: s.originCode, name: s.originName || null, city: null, terminal: s.originTerminal || null, time: localStamp(s.departureTime) },
        arrival: { code: s.destinationCode, name: s.destinationName || null, city: null, terminal: s.destinationTerminal || null, time: localStamp(s.arrivalTime) },
        durationMinutes: s.duration?.minutes ?? isoMinutes(s.duration?.iso8601),
        cabin: cabinLabel(fare.cabin || j.cabinClass),
        bookingClass: fare.bookingCode || null,
        fareBasis: fare.fareBasisCode || null,
        aircraft: null
      };
    })
  }));

  const included = (j.baggage?.included || []).map(b => ({ type: b.bagType, description: b.description, pieces: b.pieces || 1, weightKg: b.weightKg || null }));
  const price = order.order?.price || j.pricing?.display || {};

  return {
    source: 'order',
    slices,
    cabin: cabinLabel(j.cabinClass),
    fareFamily: j.fare?.family || null,
    refundable: j.terms?.refundable ?? null,
    changeable: j.terms?.changeable ?? null,
    baggage: included,
    price: { base: price.base ?? null, taxes: price.taxes ?? null, total: price.total ?? null, currency: price.currency || 'INR' },
    airlineLocators: (order.order?.reference?.airlineBookings || order.airlineLocators || []).map(a => ({ airlineCode: a.airlineCode, airlineName: a.airlineName || null, pnr: a.airlinePnr })),
    tickets: (order.ticketData?.tickets || []).map(t => ({ name: t.fullName || `${t.lastName}/${t.firstName}`, ticketNumber: t.ticketNumber, status: t.status })),
    supplierName: 'Nuitée',
    supplierRef: order.order?.reference?.orderId || order.bookingRef || null
  };
}

/* ---------------- Duffel order (GET /air/orders/:id) ---------------- */
function fromDuffelOrder(raw) {
  const o = raw?.data || raw;
  if (!o?.slices?.length) return null;
  const pax = Object.fromEntries((o.passengers || []).map(p => [p.id, `${(p.family_name || '').toUpperCase()}/${(p.given_name || '').toUpperCase()}`]));

  const slices = o.slices.map((sl, si) => withLayovers({
    direction: si === 0 ? 'OUTBOUND' : 'INBOUND',
    durationMinutes: isoMinutes(sl.duration),
    segments: (sl.segments || []).map(s => {
      const p0 = s.passengers?.[0] || {};
      const mk = s.marketing_carrier || {};
      const op = s.operating_carrier || {};
      return {
        airline: { code: mk.iata_code, name: mk.name || mk.iata_code, logo: mk.logo_symbol_url || null },
        operatingAirline: op.iata_code && op.iata_code !== mk.iata_code ? { code: op.iata_code, name: op.name || op.iata_code } : null,
        flightNumber: `${mk.iata_code || ''}${s.marketing_carrier_flight_number || ''}`,
        departure: { code: s.origin?.iata_code, name: s.origin?.name || null, city: s.origin?.city_name || null, terminal: s.origin_terminal || null, time: localStamp(s.departing_at) },
        arrival: { code: s.destination?.iata_code, name: s.destination?.name || null, city: s.destination?.city_name || null, terminal: s.destination_terminal || null, time: localStamp(s.arriving_at) },
        durationMinutes: isoMinutes(s.duration),
        cabin: p0.cabin_class_marketing_name || cabinLabel(p0.cabin_class),
        bookingClass: null,
        fareBasis: p0.fare_basis_code || null,
        aircraft: s.aircraft?.name || null
      };
    })
  }));

  const bags = o.slices[0]?.segments?.[0]?.passengers?.[0]?.baggages || [];
  return {
    source: 'order',
    slices,
    cabin: slices[0]?.segments?.[0]?.cabin || 'Economy',
    fareFamily: o.slices[0]?.fare_brand_name || null,
    refundable: o.conditions?.refund_before_departure?.allowed ?? null,
    changeable: o.conditions?.change_before_departure?.allowed ?? null,
    baggage: bags.filter(b => b.quantity > 0).map(b => ({ type: b.type === 'carry_on' ? 'cabin' : b.type, description: b.type === 'carry_on' ? 'Cabin bag' : 'Checked bag', pieces: b.quantity, weightKg: null })),
    price: { base: parseFloat(o.base_amount) || null, taxes: parseFloat(o.tax_amount) || null, total: parseFloat(o.total_amount) || null, currency: o.total_currency || 'INR' },
    airlineLocators: o.booking_reference ? [{ airlineCode: o.owner?.iata_code || null, airlineName: o.owner?.name || null, pnr: o.booking_reference }] : [],
    tickets: (o.documents || []).filter(d => d.type === 'electronic_ticket').map(d => ({ name: (d.passenger_ids || []).map(id => pax[id]).filter(Boolean).join(', '), ticketNumber: d.unique_identifier })),
    supplierName: 'Duffel',
    supplierRef: o.id || null
  };
}

/* ---------------- Legacy thin summary ---------------- */
function fromSummary(fd = {}) {
  if (!fd || (!fd.origin && !fd.destination)) return null;
  const date = fd.departureDate ? localStamp(fd.departureDate) : null;
  const stamp = (t, d) => (t ? (d ? `${d.slice(0, 10)}T${t}` : t) : d);
  return {
    source: 'summary',
    slices: [withLayovers({
      direction: 'OUTBOUND',
      durationMinutes: null,
      segments: [{
        airline: { code: fd.airline, name: fd.airlineName || fd.airline, logo: null },
        operatingAirline: null,
        flightNumber: fd.flightNumber || '',
        departure: { code: fd.origin, name: null, city: null, terminal: null, time: stamp(fd.departureTime, date) },
        arrival: { code: fd.destination, name: null, city: null, terminal: null, time: stamp(fd.arrivalTime, fd.arrivalDate || date) },
        durationMinutes: null,
        cabin: cabinLabel(fd.cabin),
        bookingClass: null,
        fareBasis: null,
        aircraft: null
      }]
    })],
    cabin: cabinLabel(fd.cabin),
    fareFamily: null,
    refundable: null,
    changeable: null,
    baggage: [],
    price: {},
    airlineLocators: [],
    tickets: [],
    supplierName: null,
    supplierRef: null
  };
}

/** Fill missing city / airport names from our airports table ("Sydney (Mascot)" -> "Sydney") */
async function enrichPlaces(itinerary) {
  if (!itinerary?.slices) return itinerary;
  const points = itinerary.slices.flatMap(s => s.segments.flatMap(g => [g.departure, g.arrival])).filter(p => p?.code && (!p.city || !p.name));
  if (!points.length) return itinerary;
  try {
    const airportModel = require('../models/airport.model');
    const codes = [...new Set(points.map(p => p.code))];
    const found = Object.fromEntries(await Promise.all(codes.map(async c => [c, await airportModel.getAirportByCode(c).catch(() => null)])));
    for (const p of points) {
      const a = found[p.code];
      if (!a) continue;
      if (!p.city && a.city_name) p.city = String(a.city_name).replace(/\s*\(.*\)\s*$/, '');
      if (!p.name && a.airport_name) p.name = a.airport_name;
    }
  } catch (error) {
    logger.warn(`[Itinerary] Airport lookup failed: ${error.message}`);
  }
  return itinerary;
}

async function fetchSupplierOrder(supplier, orderId) {
  if (!orderId) return null;
  if (supplier === 'liteapi') {
    const api = require('../suppliers/liteapi/liteapi.flight');
    return fromLiteApiOrder(await api.getBooking(orderId));
  }
  if (supplier === 'duffel') {
    const duffel = require('../suppliers/duffel');
    return fromDuffelOrder(await duffel.getFlightOrder(orderId));
  }
  return null;
}

/**
 * Best itinerary for a flight booking. Fetches the supplier order once after
 * ticketing and caches it on bookings.flight_data.itinerary.
 * @param {Object} booking - { id, supplier, supplierOrderId, ticketingStatus, flightData } (camel or snake)
 */
async function getTicketItinerary(booking) {
  const flightData = booking.flightData || booking.flight_data || {};
  const cached = flightData.itinerary;
  const supplier = booking.supplier;
  const orderId = booking.supplierOrderId || booking.supplier_order_id;
  const issued = (booking.ticketingStatus || booking.ticketing_status) === 'ISSUED';

  if (cached?.source === 'order' && cached.slices?.[0]?.segments?.[0]?.arrival?.city) return cached;

  if (issued && orderId) {
    try {
      const fromOrder = await enrichPlaces(await fetchSupplierOrder(supplier, orderId));
      if (fromOrder) {
        if (booking.id) {
          await getPool().query(
            `UPDATE bookings SET flight_data = jsonb_set(COALESCE(flight_data, '{}'::jsonb), '{itinerary}', $1::jsonb), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(fromOrder), booking.id]
          );
        }
        return fromOrder;
      }
    } catch (error) {
      logger.warn(`[Itinerary] Supplier order lookup failed for ${supplier} ${orderId}: ${error.message}`);
    }
  }

  return enrichPlaces(cached || fromSummary(flightData));
}

module.exports = {
  fromStandardOffer,
  fromLiteApiOrder,
  fromDuffelOrder,
  fromSummary,
  getTicketItinerary,
  localStamp
};
