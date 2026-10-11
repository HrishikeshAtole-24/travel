const { canAccessBooking } = require('../src/services/booking.service');
const { normalizePaymentMethod } = require('../src/models/payment.model');

describe('canAccessBooking', () => {
  const userBooking = { user_id: 7, contact_email: 'Owner@Example.com' };
  const guestBooking = { user_id: null, contact_email: 'guest@example.com' };

  it('allows the owning user', () => {
    expect(canAccessBooking(userBooking, { userId: 7 })).toBe(true);
  });

  it('denies other users', () => {
    expect(canAccessBooking(userBooking, { userId: 8 })).toBe(false);
  });

  it('allows the contact email, case-insensitively', () => {
    expect(canAccessBooking(guestBooking, { email: ' GUEST@example.com ' })).toBe(true);
    expect(canAccessBooking(userBooking, { email: 'owner@example.com' })).toBe(true);
  });

  it('denies anonymous callers and wrong emails', () => {
    expect(canAccessBooking(guestBooking, {})).toBe(false);
    expect(canAccessBooking(guestBooking, { email: 'someone@else.com' })).toBe(false);
    expect(canAccessBooking(guestBooking, { userId: 7 })).toBe(false);
  });
});

describe('normalizePaymentMethod', () => {
  it('maps acquirer method names onto the payment_method enum', () => {
    expect(normalizePaymentMethod('card')).toBe('CARD');
    expect(normalizePaymentMethod('netbanking')).toBe('NET_BANKING');
    expect(normalizePaymentMethod('UPI')).toBe('UPI');
  });

  it('returns null for unknown methods instead of breaking the enum', () => {
    expect(normalizePaymentMethod('paylater')).toBeNull();
    expect(normalizePaymentMethod(undefined)).toBeNull();
  });
});
