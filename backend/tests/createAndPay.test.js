/**
 * Regression: create-and-pay must be allowed to pay for the booking it just created.
 * (initiatePayment fails closed when no caller identity is passed.)
 */
const mockCreateBooking = jest.fn();
const mockCreateHotelBooking = jest.fn();
const mockInitiatePayment = jest.fn();

jest.mock('../src/services/booking.service', () => ({
  ...jest.requireActual('../src/services/booking.service'),
  createBooking: (...args) => mockCreateBooking(...args)
}));
jest.mock('../src/services/hotel-booking.service', () => ({
  createHotelBooking: (...args) => mockCreateHotelBooking(...args)
}));
jest.mock('../src/payments/payment.service', () => ({
  initiatePayment: (...args) => mockInitiatePayment(...args)
}));

const bookingController = require('../src/controllers/booking.controller');
const hotelBookingController = require('../src/controllers/hotel-booking.controller');

function run(handler, body) {
  return new Promise((resolve, reject) => {
    const res = {
      status(code) { this.code = code; return this; },
      json(payload) { resolve({ code: this.code, payload }); }
    };
    const req = { body, user: null, ip: '127.0.0.1', get: () => 'jest' };
    handler(req, res, (err) => (err ? reject(err) : resolve(null)));
  });
}

beforeEach(() => {
  mockCreateBooking.mockReset().mockResolvedValue({ bookingId: 7, bookingReference: 'BK-1' });
  mockCreateHotelBooking.mockReset().mockResolvedValue({ bookingId: 8, bookingReference: 'HB-1' });
  mockInitiatePayment.mockReset().mockResolvedValue({ paymentReference: 'PAY-1' });
});

it('flight create-and-pay starts payment as a trusted same-request call', async () => {
  const result = await run(bookingController.createBookingAndInitiatePayment, {
    travelers: [{ firstName: 'Asha' }], contactEmail: 'a@example.com', contactPhone: '9876543210'
  });

  expect(result.code).toBe(201);
  expect(mockInitiatePayment).toHaveBeenCalledWith(7, expect.objectContaining({ access: null }));
});

it('hotel create-and-pay starts payment as a trusted same-request call', async () => {
  const result = await run(hotelBookingController.createHotelBookingAndPay, {
    offerId: 'x', guests: [{ firstName: 'Asha' }], contactEmail: 'a@example.com', contactPhone: '9876543210'
  });

  expect(result.code).toBe(201);
  expect(mockInitiatePayment).toHaveBeenCalledWith(8, expect.objectContaining({ access: null, bookingType: 'hotel' }));
});
