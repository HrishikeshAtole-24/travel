/**
 * Duffel supplier: mapping, currency conversion and passenger validation
 */
const { mapFlightData, parseDuration } = require('../src/assembly_line/mappers/flight.mapper');
const { validateFlightData } = require('../src/assembly_line/validators/flight.validator');
const { transformFlightData } = require('../src/assembly_line/transformers/flight.transform');
const { convertOffersCurrency } = require('../src/assembly_line/transformers/currency.transform');
const { normalizePhone, validateTravelersForOffer } = require('../src/utils/passengerValidation');

// Minimal Duffel offer in the shape returned by POST /air/offer_requests
const duffelSegment = (id, from, to, dep, arr, flightNumber, passengerIds) => ({
  id,
  departing_at: dep,
  arriving_at: arr,
  duration: 'PT2H10M',
  marketing_carrier_flight_number: flightNumber,
  marketing_carrier: { iata_code: 'ZZ', name: 'Duffel Airways', logo_symbol_url: 'https://assets.duffel.com/ZZ.svg' },
  operating_carrier: { iata_code: 'ZZ' },
  origin: { iata_code: from, name: `${from} Airport`, city_name: from, iata_country_code: 'IN', time_zone: 'Asia/Kolkata' },
  destination: { iata_code: to, name: `${to} Airport`, city_name: to, iata_country_code: 'IN', time_zone: 'Asia/Kolkata' },
  origin_terminal: '3',
  destination_terminal: null,
  aircraft: { iata_code: '320', name: 'Airbus A320' },
  stops: [],
  passengers: passengerIds.map(pid => ({
    passenger_id: pid,
    cabin_class: 'economy',
    fare_basis_code: 'Y20',
    baggages: [{ type: 'checked', quantity: 1 }, { type: 'carry_on', quantity: 1 }]
  }))
});

const duffelOffer = {
  id: 'off_test123',
  live_mode: false,
  expires_at: '2030-01-01T00:30:00Z',
  total_amount: '100.00',
  base_amount: '80.00',
  tax_amount: '20.00',
  total_currency: 'USD',
  owner: { iata_code: 'ZZ', name: 'Duffel Airways' },
  passenger_identity_documents_required: false,
  payment_requirements: { requires_instant_payment: true },
  conditions: {
    refund_before_departure: { allowed: false },
    change_before_departure: { allowed: true, penalty_amount: '0' }
  },
  passengers: [
    { id: 'pas_adult', type: 'adult' },
    { id: 'pas_infant', type: 'infant_without_seat' }
  ],
  slices: [{
    id: 'sli_1',
    duration: 'P1DT50M',
    fare_brand_name: 'Basic',
    segments: [
      duffelSegment('seg_1', 'DEL', 'BOM', '2027-03-10T06:00:00', '2027-03-10T08:10:00', '1001', ['pas_adult', 'pas_infant'])
    ]
  }]
};

describe('parseDuration', () => {
  it('handles hours/minutes and Duffel day durations', () => {
    expect(parseDuration('PT2H30M')).toBe(150);
    expect(parseDuration('PT45M')).toBe(45);
    expect(parseDuration('P1DT50M')).toBe(24 * 60 + 50);
    expect(parseDuration('P1DT8H10M')).toBe(32 * 60 + 10);
    expect(parseDuration('garbage')).toBe(0);
  });
});

describe('Duffel mapper', () => {
  const [offer] = transformFlightData(validateFlightData(mapFlightData({ data: { offers: [duffelOffer] } }, 'duffel')));

  it('maps to the standard offer format and passes validation', () => {
    expect(offer.id).toBe('OFFER_off_test123');
    expect(offer.source).toMatchObject({ supplier: 'duffel', supplierOfferId: 'off_test123', distributionChannel: 'NDC' });
    expect(offer.pricing).toMatchObject({ totalAmount: 100, baseAmount: 80, taxesAmount: 20, totalCurrency: 'USD', isRefundable: false, isChangeable: true });
    expect(offer.itinerary.slices[0].durationMinutes).toBe(1490);
  });

  it('maps segments, baggage and airline names', () => {
    const seg = offer.itinerary.slices[0].segments[0];
    expect(seg).toMatchObject({
      marketingAirlineCode: 'ZZ',
      marketingAirlineName: 'Duffel Airways',
      flightNumber: '1001',
      cabinClass: 'ECONOMY',
      aircraftCode: '320'
    });
    expect(seg.departure).toMatchObject({ airportCode: 'DEL', terminal: '3', time: '2027-03-10T06:00:00' });
    expect(seg.baggage.checkIn.pieces).toBe(1);
  });

  it('exposes passenger slots and requirements for the booking form', () => {
    expect(offer.passengers).toEqual([
      { supplierPassengerId: 'pas_adult', type: 'ADULT' },
      { supplierPassengerId: 'pas_infant', type: 'INFANT' }
    ]);
    expect(offer.requirements.identityDocumentsRequired).toBe(false);
  });

  it('maps a single-offer response (GET /air/offers/:id)', () => {
    expect(mapFlightData({ data: duffelOffer }, 'duffel')).toHaveLength(1);
  });

  it('skips a malformed offer without failing the rest', () => {
    const offers = mapFlightData({ data: { offers: [{ id: 'off_broken' }, duffelOffer] } }, 'duffel');
    expect(offers).toHaveLength(1);
  });
});

describe('convertOffersCurrency', () => {
  it('converts to INR, rounds up and keeps the supplier price', () => {
    const [offer] = mapFlightData({ data: { offers: [duffelOffer] } }, 'duffel');
    const [converted] = convertOffersCurrency([offer], { USD: 83.333 }, 'INR');

    expect(converted.pricing.totalCurrency).toBe('INR');
    expect(converted.pricing.totalAmount).toBe(8333.3);
    expect(converted.pricing.baseAmount + converted.pricing.taxesAmount).toBeCloseTo(converted.pricing.totalAmount, 2);
    expect(converted.pricing.supplierPrice).toMatchObject({ totalAmount: 100, currency: 'USD', exchangeRate: 83.333 });
  });

  it('leaves offers already in the target currency untouched', () => {
    const offer = { pricing: { totalAmount: 500, baseAmount: 400, taxesAmount: 100, totalCurrency: 'INR' } };
    expect(convertOffersCurrency([offer], {}, 'INR')[0].pricing.totalAmount).toBe(500);
  });

  it('fails loudly when a rate is missing', () => {
    const offer = { pricing: { totalAmount: 1, baseAmount: 1, taxesAmount: 0, totalCurrency: 'EUR' } };
    expect(() => convertOffersCurrency([offer], {}, 'INR')).toThrow('Missing exchange rate');
  });
});

describe('normalizePhone', () => {
  it('normalizes common formats to E.164', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhone('0044 20 8016 0509')).toBe('+442080160509');
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('validateTravelersForOffer', () => {
  const [offer] = mapFlightData({ data: { offers: [duffelOffer] } }, 'duffel');
  const adult = { type: 'ADULT', firstName: 'Asha', lastName: 'Rao', dateOfBirth: '1990-05-01', gender: 'FEMALE', phone: '9876543210', email: 'asha@example.com' };
  const infant = { type: 'INFANT', firstName: 'Ira', lastName: 'Rao', dateOfBirth: '2026-06-01', gender: 'FEMALE' };
  const contact = { email: 'asha@example.com', phone: '9876543210' };

  it('accepts valid travelers and attaches supplier passenger IDs', () => {
    const result = validateTravelersForOffer([adult, infant], offer, contact);
    expect(result.map(t => t.supplierPassengerId)).toEqual(['pas_adult', 'pas_infant']);
    expect(result[1].phone).toBe('+919876543210'); // falls back to contact phone
  });

  it('rejects a passenger count that does not match the fare', () => {
    expect(() => validateTravelersForOffer([adult], offer, contact)).toThrow('2 passenger(s)');
  });

  it('rejects infants who are 2 or older on the travel date', () => {
    const olderInfant = { ...infant, dateOfBirth: '2025-01-01' };
    expect(() => validateTravelersForOffer([adult, olderInfant], offer, contact)).toThrow('infants must be under 2');
  });

  it('rejects genders airlines cannot ticket and invalid names', () => {
    expect(() => validateTravelersForOffer([{ ...adult, gender: 'OTHER' }, infant], offer, contact)).toThrow('gender');
    expect(() => validateTravelersForOffer([{ ...adult, firstName: 'A$ha' }, infant], offer, contact)).toThrow('first name');
  });

  it('requires passport details when the airline does', () => {
    const docsOffer = { ...offer, requirements: { identityDocumentsRequired: true } };
    expect(() => validateTravelersForOffer([adult, infant], docsOffer, contact)).toThrow('passport number');
  });

  it('skips supplier checks for offers without passenger slots (legacy)', () => {
    const travelers = [{ firstName: 'x' }];
    expect(validateTravelersForOffer(travelers, { price: {} }, contact)).toBe(travelers);
  });
});
