/**
 * Payment flow tests with the database mocked.
 * Covers the vulnerabilities fixed in the security pass:
 *  - unsigned GET callback must not confirm a booking
 *  - payments for a booking require access to that booking
 *  - hotel payments target hotel_bookings, not bookings
 *  - markPaymentSuccessful is idempotent
 */
const crypto = require('crypto');

const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();

jest.mock('../src/config/database', () => ({
  getPool: () => ({
    query: mockQuery,
    connect: async () => ({ query: mockClientQuery, release: mockRelease })
  })
}));

const paymentService = require('../src/payments/payment.service');
const paymentController = require('../src/payments/payment.controller');

const KEY_SECRET = 'rzp_secret_for_tests';

function runHandler(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ type: 'json', status: this.statusCode, body }); return this; },
      redirect(url) { resolve({ type: 'redirect', url }); }
    };
    handler(req, res, (err) => (err ? reject(err) : resolve({ type: 'next' })));
  });
}

beforeEach(() => {
  mockQuery.mockReset();
  mockClientQuery.mockReset();
  mockRelease.mockReset();
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.FRONTEND_URL = 'https://skywings.example.com';
});

describe('GET /api/payments/callback', () => {
  const payment = {
    id: 1,
    payment_reference: 'PAY-1',
    booking_id: 10,
    hotel_booking_id: null,
    booking_reference: 'BK-1',
    acquirer_order_id: 'order_1',
    metadata: {}
  };

  it('does NOT confirm anything when the signature is missing or forged', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [payment] }); // findPaymentByOrderId

    const result = await runHandler(paymentController.handlePaymentCallback, {
      query: { order_id: 'order_1', payment_id: 'pay_fake', signature: 'forged' }
    });

    expect(result.type).toBe('redirect');
    expect(result.url).toContain('status=failed');
    // Only the lookup query ran - no UPDATE and no transaction
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).not.toHaveBeenCalled();
  });

  it('confirms the booking when the Razorpay signature is valid', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [payment] });
    mockClientQuery.mockImplementation(async (sql) => {
      if (sql.includes('UPDATE payments')) return { rows: [{ id: 1 }] };
      return { rows: [] };
    });
    // Confirmation email lookup (best effort) - booking not found is fine
    mockQuery.mockResolvedValue({ rows: [] });

    const signature = crypto.createHmac('sha256', KEY_SECRET).update('order_1|pay_1').digest('hex');
    const result = await runHandler(paymentController.handlePaymentCallback, {
      query: { order_id: 'order_1', payment_id: 'pay_1', signature }
    });

    expect(result.url).toContain('status=success');
    expect(result.url.startsWith('https://skywings.example.com/payment-success')).toBe(true);
    const sqls = mockClientQuery.mock.calls.map(([sql]) => sql);
    expect(sqls.some(sql => sql.includes("UPDATE bookings SET status = 'confirmed'"))).toBe(true);
  });
});

describe('markPaymentSuccessful', () => {
  it('confirms hotel bookings in hotel_bookings', async () => {
    mockClientQuery.mockImplementation(async (sql) => {
      if (sql.includes('UPDATE payments')) return { rows: [{ id: 2 }] };
      return { rows: [] };
    });

    const result = await paymentService.markPaymentSuccessful(
      { id: 2, payment_reference: 'PAY-2', booking_id: null, hotel_booking_id: 55 },
      { acquirerPaymentId: 'pay_2', paymentMethod: 'upi' }
    );

    expect(result).toEqual({ alreadyProcessed: false, bookingType: 'hotel', bookingId: 55 });
    const sqls = mockClientQuery.mock.calls.map(([sql]) => sql);
    expect(sqls.some(sql => sql.includes("UPDATE hotel_bookings SET status = 'confirmed'"))).toBe(true);
    expect(sqls.some(sql => sql.includes('UPDATE bookings '))).toBe(false);
  });

  it('is idempotent when the payment is already SUCCESS', async () => {
    mockClientQuery.mockImplementation(async (sql) => {
      if (sql.includes('UPDATE payments')) return { rows: [] }; // nothing updated
      return { rows: [] };
    });

    const result = await paymentService.markPaymentSuccessful(
      { id: 3, payment_reference: 'PAY-3', booking_id: 9, hotel_booking_id: null }
    );

    expect(result.alreadyProcessed).toBe(true);
    const sqls = mockClientQuery.mock.calls.map(([sql]) => sql);
    expect(sqls).toContain('ROLLBACK');
    expect(sqls.some(sql => sql.includes('UPDATE bookings'))).toBe(false);
  });
});

describe('initiatePayment access control', () => {
  it("refuses to start a payment for someone else's booking", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 10, user_id: 1, contact_email: 'owner@example.com', status: 'pending', total_price: '100.00' }]
    });

    await expect(
      paymentService.initiatePayment(10, { access: { userId: 2 } })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses when no caller identity is provided (fail closed)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 10, user_id: 1, contact_email: 'owner@example.com', status: 'pending', total_price: '100.00' }]
    });

    await expect(paymentService.initiatePayment(10, {})).rejects.toMatchObject({ statusCode: 404 });
  });

  it('looks up hotel bookings in hotel_bookings', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(
      paymentService.initiatePayment(5, { bookingType: 'hotel', access: { userId: 1 } })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockQuery.mock.calls[0][0]).toBe('SELECT * FROM hotel_bookings WHERE id = $1');
  });
});
