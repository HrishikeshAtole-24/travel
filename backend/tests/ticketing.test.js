/**
 * Ticketing: placing the airline order after payment (DB and Duffel mocked)
 */
const mockQuery = jest.fn();
const mockGetOffer = jest.fn();
const mockCreateOrder = jest.fn();

jest.mock('../src/config/database', () => ({
  getPool: () => ({ query: mockQuery })
}));

jest.mock('../src/suppliers/supplierFactory', () => () => ({
  getOffer: mockGetOffer,
  createFlightOrder: mockCreateOrder
}));

const { issueFlightTickets, buildDuffelPassengers, formatDate } = require('../src/services/ticketing.service');

const booking = {
  id: 42,
  booking_reference: 'BK-20300101-ABCDEFGHJK',
  status: 'confirmed',
  supplier: 'duffel',
  supplier_offer_id: 'off_1',
  supplier_amount: '100.00',
  supplier_currency: 'USD',
  ticketing_status: 'IN_PROGRESS'
};

const travelers = [
  { traveler_type: 'ADULT', supplier_passenger_id: 'pas_a', first_name: 'Asha', last_name: 'Rao', gender: 'female', date_of_birth: new Date(1990, 4, 1), email: 'a@example.com', phone: '+919876543210' },
  { traveler_type: 'INFANT', supplier_passenger_id: 'pas_i', first_name: 'Ira', last_name: 'Rao', gender: 'female', date_of_birth: '2029-06-01', email: 'a@example.com', phone: '+919876543210' }
];

const freshOffer = (amount = '100.00') => ({
  data: {
    id: 'off_1',
    total_amount: amount,
    total_currency: 'USD',
    passenger_identity_documents_required: false,
    passengers: [{ id: 'pas_a', type: 'adult' }, { id: 'pas_i', type: 'infant_without_seat' }]
  }
});

/** Route DB queries by SQL text */
function mockDb({ claimed = true } = {}) {
  mockQuery.mockImplementation(async (sql) => {
    if (sql.includes("SET ticketing_status = 'IN_PROGRESS'")) return { rows: claimed ? [booking] : [] };
    if (sql.includes('FROM travelers')) return { rows: travelers };
    return { rows: [] };
  });
}

const updatesTo = (status) =>
  mockQuery.mock.calls.filter(([sql]) => sql.includes(`ticketing_status = '${status}'`));

beforeEach(() => {
  mockQuery.mockReset();
  mockGetOffer.mockReset();
  mockCreateOrder.mockReset();
});

describe('formatDate', () => {
  it('formats node-pg local-midnight dates without shifting the day', () => {
    expect(formatDate(new Date(1990, 4, 1))).toBe('1990-05-01');
    expect(formatDate('2029-06-01T00:00:00Z')).toBe('2029-06-01');
    expect(formatDate(null)).toBeNull();
  });
});

describe('buildDuffelPassengers', () => {
  it('maps travelers and links each infant to an adult', () => {
    const passengers = buildDuffelPassengers(travelers, freshOffer().data);
    expect(passengers[0]).toMatchObject({
      id: 'pas_a', title: 'ms', gender: 'f', given_name: 'Asha', family_name: 'Rao',
      born_on: '1990-05-01', phone_number: '+919876543210', infant_passenger_id: 'pas_i'
    });
    expect(passengers[1]).toMatchObject({ id: 'pas_i', born_on: '2029-06-01' });
    expect(passengers[0].identity_documents).toBeUndefined();
  });

  it('rejects travelers that do not match the offer', () => {
    const offer = { ...freshOffer().data, passengers: [{ id: 'pas_other', type: 'adult' }] };
    expect(() => buildDuffelPassengers(travelers, offer)).toThrow('does not match');
  });
});

describe('issueFlightTickets', () => {
  it('places the order and stores the PNR', async () => {
    mockDb();
    mockGetOffer.mockResolvedValue(freshOffer());
    mockCreateOrder.mockResolvedValue({
      data: { id: 'ord_1', booking_reference: 'ABC123', documents: [{ type: 'electronic_ticket', unique_identifier: '1251234567890' }] }
    });

    const result = await issueFlightTickets(42);

    expect(result).toMatchObject({ success: true, status: 'ISSUED', pnr: 'ABC123' });
    expect(mockCreateOrder).toHaveBeenCalledWith(expect.objectContaining({ offerId: 'off_1', amount: '100.00', currency: 'USD' }));
    const issued = updatesTo('ISSUED');
    expect(issued).toHaveLength(1);
    expect(issued[0][1]).toEqual(['ABC123', 'ord_1', '1251234567890', 42]);
  });

  it('never pays the airline more than the customer was charged for', async () => {
    mockDb();
    mockGetOffer.mockResolvedValue(freshOffer('120.00'));

    const result = await issueFlightTickets(42);

    expect(result.status).toBe('FAILED');
    expect(result.error).toMatch(/Fare increased/);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('records a failure when the airline rejects the order', async () => {
    mockDb();
    mockGetOffer.mockResolvedValue(freshOffer());
    mockCreateOrder.mockRejectedValue(new Error('Offer sold out'));

    const result = await issueFlightTickets(42);

    expect(result.status).toBe('FAILED');
    expect(updatesTo('FAILED')).toHaveLength(1);
  });

  it('is a no-op when the booking was already claimed (idempotent)', async () => {
    mockDb({ claimed: false });

    const result = await issueFlightTickets(42);

    expect(result.status).toBe('SKIPPED');
    expect(mockGetOffer).not.toHaveBeenCalled();
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });
});
