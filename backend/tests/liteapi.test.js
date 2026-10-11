/**
 * LiteAPI (Nuitée) supplier: flight + hotel mapping, flight ticketing, hotel fulfillment
 */
const mockQuery = jest.fn();
const mockConfirmFlight = jest.fn();
const mockGetFlightBooking = jest.fn();
const mockBookHotel = jest.fn();

jest.mock('../src/config/database', () => ({
  getPool: () => ({ query: mockQuery })
}));

jest.mock('../src/suppliers/supplierFactory', () => () => ({
  confirmFlight: mockConfirmFlight,
  getFlightBooking: mockGetFlightBooking,
  bookHotel: mockBookHotel
}));

const { mapFlightData } = require('../src/assembly_line/mappers/flight.mapper');
const { validateFlightData } = require('../src/assembly_line/validators/flight.validator');
const { transformFlightData } = require('../src/assembly_line/transformers/flight.transform');
const { mapHotelOffersData } = require('../src/assembly_line/mappers/hotel.mapper');
const { validateHotelOfferData } = require('../src/assembly_line/validators/hotel.validator');
const { transformHotelOfferData } = require('../src/assembly_line/transformers/hotel.transform');
const { issueFlightTickets } = require('../src/services/ticketing.service');
const { fulfillHotelBooking } = require('../src/services/hotelFulfillment.service');
const liteApiFlight = require('../src/suppliers/liteapi/liteapi.flight');

// ── Fixtures in the shape LiteAPI returns ──
const segment = (from, to, dep, arr, number) => ({
  arrivalTime: arr,
  departureTime: dep,
  carrier: { marketingCode: '6E', marketingName: 'IndiGo', marketingLogo: 'https://assets.nuitee.flights/6E.png', operatingCode: '6E' },
  originCode: from,
  destinationCode: to,
  originName: `${from} Airport`,
  destinationName: `${to} Airport`,
  direction: 'OUTBOUND',
  duration: { iso8601: 'PT1H', minutes: 60 },
  flight: { marketingNumber: number },
  segmentKey: `k${number}`,
  stopCount: 0
});

const fare = {
  offerId: 'AwJ2MQAAAABq-long-offer-token',
  expiration: '2027-03-10T10:00:00Z',
  pricing: {
    display: {
      total: 5000, currency: 'INR', base: 4000, fees: 100, taxes: 900,
      perPassenger: {
        adult: { base: 4000, fees: 100, taxes: 900, total: 5000, currency: 'INR' },
        infant: { base: 500, fees: 0, taxes: 0, total: 500, currency: 'INR' }
      }
    }
  },
  baggage: {
    included: [
      { bagType: 'checked', passengerType: 'ADT', pieces: 1, weightKg: 15 },
      { bagType: 'cabin', passengerType: 'ADT', pieces: 1, weightKg: 7 }
    ]
  },
  fare: { family: 'Saver', seatsRemaining: 4 },
  terms: { refundable: false, changeable: true, hasChangeFee: true },
  segmentFares: [{ cabin: 'Economy', bookingCode: 'R', fareBasisCode: 'RSAVER' }, { cabin: 'Economy', bookingCode: 'R' }]
};

const journey = {
  journeyKey: 'abc123',
  segments: [
    segment('DEL', 'JAI', '2027-03-10T07:00:00', '2027-03-10T08:00:00', '2164'),
    segment('JAI', 'BOM', '2027-03-10T09:00:00', '2027-03-10T10:00:00', '2719')
  ],
  legDurations: [{ direction: 'OUTBOUND', duration: { minutes: 180 } }],
  cheapestOffer: fare,
  offers: [fare]
};

describe('LiteAPI flight mapper', () => {
  it('maps a search journey to the standard offer format', () => {
    const [offer] = transformFlightData(validateFlightData(mapFlightData({ data: [{ journeys: [journey] }] }, 'liteapi')));

    expect(offer.id).toBe('OFFER_LITEAPI_abc123');
    expect(offer.source).toMatchObject({ supplier: 'liteapi', supplierOfferId: fare.offerId, distributionChannel: 'AGGREGATOR' });
    expect(offer.pricing).toMatchObject({ totalAmount: 5000, baseAmount: 4000, taxesAmount: 1000, totalCurrency: 'INR', fareFamily: 'Saver', isRefundable: false });
    expect(offer.itinerary.slices).toHaveLength(1);
    expect(offer.itinerary.slices[0].durationMinutes).toBe(180);
    expect(offer.itinerary.slices[0].segments[0]).toMatchObject({
      marketingAirlineCode: '6E', flightNumber: '2164', cabinClass: 'ECONOMY', bookingClass: 'R',
      marketingAirlineLogo: 'https://assets.nuitee.flights/6E.png'
    });
    expect(offer.itinerary.slices[0].segments[0].baggage.checkIn).toEqual({ pieces: 1, weightKg: 15 });
    expect(offer.requirements.holdBeforePayment).toBe(true);
  });

  it('maps a verify response with passenger slots for the booking form', () => {
    const verify = {
      data: [{ journey: { ...journey, ...fare, passengers: { adults: 1, children: 0, infants: 1 } }, changes: { priceChanged: false } }],
      requestedOfferId: 'verified-offer-id'
    };
    const [offer] = mapFlightData(verify, 'liteapi');

    expect(offer.source.supplierOfferId).toBe('verified-offer-id');
    expect(offer.passengers).toEqual([
      { supplierPassengerId: 'ADULT_1', type: 'ADULT' },
      { supplierPassengerId: 'INFANT_1', type: 'INFANT' }
    ]);
    expect(offer.travelerPricing.map(t => [t.travelerType, t.price.totalAmount])).toEqual([['ADULT', 5000], ['INFANT', 500]]);
  });
});

describe('LiteAPI phone splitting', () => {
  it('splits E.164 numbers into country code and national number', () => {
    expect(liteApiFlight.splitPhone('+917021345689')).toEqual({ phoneCountryCode: '91', phoneNumber: '7021345689' });
    expect(liteApiFlight.splitPhone('+14155550123')).toEqual({ phoneCountryCode: '1', phoneNumber: '4155550123' });
    expect(liteApiFlight.splitPhone('+971501234567')).toEqual({ phoneCountryCode: '971', phoneNumber: '501234567' });
  });
});

describe('LiteAPI hotel mapper', () => {
  const ratesResponse = {
    data: [{
      hotelId: 'lp1',
      roomTypes: [{
        offerId: 'hotel-offer-1',
        offerRetailRate: { amount: 12000, currency: 'INR' },
        suggestedSellingPrice: { amount: 14000, currency: 'INR' },
        rates: [{
          occupancyNumber: 1, name: 'Deluxe King', maxOccupancy: 2, adultCount: 2, childCount: 0,
          boardType: 'BB', boardName: 'Bed & Breakfast',
          retailRate: {
            total: [{ amount: 12000, currency: 'INR' }],
            taxesAndFees: [
              { included: true, description: 'GST', amount: 1000, currency: 'INR' },
              { included: false, description: 'City tax', amount: 200, currency: 'INR' }
            ]
          },
          cancellationPolicies: {
            refundableTag: 'RFN',
            cancelPolicyInfos: [{ cancelTime: '2027-03-08 12:00:00', amount: 6000, currency: 'INR' }]
          }
        }]
      }]
    }],
    hotels: [{ id: 'lp1', name: 'Sea View Hotel', stars: 4, rating: 8.7, main_photo: 'https://img/1.jpg', city_name: 'Mumbai', country_code: 'IN' }],
    request: { checkin: '2027-03-10', checkout: '2027-03-12' }
  };

  it('maps rates to standard offers with hotel details, taxes and cancellation', () => {
    const [offer] = transformHotelOfferData(validateHotelOfferData(mapHotelOffersData(ratesResponse, 'liteapi')));

    expect(offer.id).toBe('HOTEL_OFFER_LITEAPI_hotel-offer-1');
    expect(offer.hotel).toMatchObject({ hotelId: 'lp1', name: 'Sea View Hotel', stars: 4, photo: 'https://img/1.jpg' });
    expect(offer.pricing).toMatchObject({ totalAmount: 12000, totalCurrency: 'INR', baseAmount: 11000, taxesAmount: 1000, suggestedSellingPrice: 14000 });
    expect(offer.pricing.payAtProperty).toEqual([{ description: 'City tax', amount: 200, currency: 'INR' }]);
    expect(offer.rooms).toEqual([{ occupancyNumber: 1, mappedRoomId: null, name: 'Deluxe King', adults: 2, childrenAges: [] }]);
    expect(offer.computed).toMatchObject({ nights: 2, pricePerNight: 6000, cancellationType: 'FREE_CANCELLATION_UNTIL_DEADLINE' });
  });

  it('marks NRFN rates as non-refundable', () => {
    const nrfn = JSON.parse(JSON.stringify(ratesResponse));
    nrfn.data[0].roomTypes[0].rates[0].cancellationPolicies = { refundableTag: 'NRFN', cancelPolicyInfos: [] };
    const [offer] = transformHotelOfferData(mapHotelOffersData(nrfn, 'liteapi'));
    expect(offer.computed.cancellationType).toBe('NON_REFUNDABLE');
  });

  it('maps a prebook response with the prebookId for booking after payment', () => {
    const prebook = {
      prebookId: 'pb_1', offerId: 'hotel-offer-1', hotelId: 'lp1', price: 12000, currency: 'INR',
      checkin: '2027-03-10', checkout: '2027-03-12', roomTypes: ratesResponse.data[0].roomTypes
    };
    const [offer] = mapHotelOffersData(prebook, 'liteapi');
    expect(offer.source).toMatchObject({ supplier: 'liteapi', supplierOfferId: 'hotel-offer-1', prebookId: 'pb_1' });
    expect(offer.pricing.totalAmount).toBe(12000);
  });
});

describe('LiteAPI flight ticketing', () => {
  const booking = { id: 9, booking_reference: 'BK-1', status: 'confirmed', supplier: 'liteapi', supplier_hold_id: 'prebook-1' };

  beforeEach(() => {
    mockQuery.mockReset().mockImplementation(async (sql) =>
      sql.includes("SET ticketing_status = 'IN_PROGRESS'") ? { rows: [booking] } : { rows: [] });
    mockConfirmFlight.mockReset();
    mockGetFlightBooking.mockReset();
  });

  it('confirms the held prebook and stores the airline PNR and ticket', async () => {
    mockConfirmFlight.mockResolvedValue({
      bookingId: 'lb_1', status: 'CONFIRMED',
      airlineLocators: [{ airlineCode: '6E', airlinePnr: 'X6HZR4' }],
      ticketData: { tickets: [{ ticketNumber: '9990871672290' }] }
    });

    const result = await issueFlightTickets(9);

    expect(mockConfirmFlight).toHaveBeenCalledWith('prebook-1');
    expect(result).toMatchObject({ success: true, status: 'ISSUED', pnr: 'X6HZR4', supplierOrderId: 'lb_1' });
  });

  it('polls for an asynchronous PNR, then records AWAITING_PNR if none arrives', async () => {
    mockConfirmFlight.mockResolvedValue({ bookingId: 'lb_2', status: 'PENDING_CONFIRMATION' });
    mockGetFlightBooking.mockResolvedValue({ bookingId: 'lb_2', status: 'PENDING_CONFIRMATION' });

    const result = await issueFlightTickets(9);

    expect(mockGetFlightBooking).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ status: 'AWAITING_PNR', supplierOrderId: 'lb_2' });
  });

  it('records a failure when the airline booking is rejected', async () => {
    mockConfirmFlight.mockRejectedValue(new Error('Prebook expired'));

    const result = await issueFlightTickets(9);

    expect(result.status).toBe('FAILED');
    expect(result.error).toMatch(/Prebook expired/);
  });
});

describe('LiteAPI hotel fulfillment', () => {
  const hotelBooking = {
    id: 5, booking_reference: 'HB-1', status: 'confirmed', supplier: 'liteapi', supplier_hold_id: 'pb_1',
    contact_email: 'asha@example.com', contact_phone: '7021345689',
    offer_data: { rooms: [{ occupancyNumber: 1 }, { occupancyNumber: 2 }] }
  };
  const guests = [
    { first_name: 'Asha', last_name: 'Rao', email: 'asha@example.com' },
    { first_name: 'Ravi', last_name: 'Rao', email: null }
  ];

  beforeEach(() => {
    mockBookHotel.mockReset();
    mockQuery.mockReset().mockImplementation(async (sql) => {
      if (sql.includes("SET fulfillment_status = 'IN_PROGRESS'")) return { rows: [hotelBooking] };
      if (sql.includes('FROM hotel_guests')) return { rows: guests };
      return { rows: [] };
    });
  });

  it('books each room with its lead guest and stores the confirmation', async () => {
    mockBookHotel.mockResolvedValue({ bookingId: 'lh_1', status: 'CONFIRMED', hotelConfirmationCode: 'HTL-777' });

    const result = await fulfillHotelBooking(5);

    expect(result).toMatchObject({ success: true, status: 'CONFIRMED', hotelConfirmationCode: 'HTL-777' });
    expect(mockBookHotel).toHaveBeenCalledWith(expect.objectContaining({
      prebookId: 'pb_1',
      clientReference: 'HB-1',
      holder: { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+917021345689' },
      guests: [
        { occupancyNumber: 1, firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com' },
        { occupancyNumber: 2, firstName: 'Ravi', lastName: 'Rao', email: 'asha@example.com' }
      ]
    }));
  });

  it('records a failure when the supplier rejects the booking', async () => {
    mockBookHotel.mockRejectedValue(new Error('Rate no longer available'));

    const result = await fulfillHotelBooking(5);

    expect(result).toMatchObject({ success: false, status: 'FAILED' });
  });
});
