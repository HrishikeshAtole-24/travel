const crypto = require('crypto');
const {
  safeEqual,
  generateReference,
  generateOTP,
  verifyRazorpaySignature,
  isAllowedRedirectUrl
} = require('../src/utils/security');

describe('safeEqual', () => {
  it('matches equal strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
  });

  it('rejects different strings, different lengths and non-strings', () => {
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual(undefined, 'abc')).toBe(false);
    expect(safeEqual('abc', null)).toBe(false);
  });
});

describe('generateReference', () => {
  it('produces PREFIX-YYYYMMDD-10 random chars', () => {
    expect(generateReference('BK')).toMatch(/^BK-\d{8}-[2-9A-HJKMNP-Z]{10}$/);
  });

  it('does not collide across many generations', () => {
    const refs = new Set(Array.from({ length: 5000 }, () => generateReference('BK')));
    expect(refs.size).toBe(5000);
  });
});

describe('generateOTP', () => {
  it('is always a 6-digit string', () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateOTP()).toMatch(/^\d{6}$/);
    }
  });
});

describe('verifyRazorpaySignature', () => {
  const secret = 'test_secret';
  const sign = (orderId, paymentId) =>
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  it('accepts a valid signature', () => {
    expect(verifyRazorpaySignature('order_1', 'pay_1', sign('order_1', 'pay_1'), secret)).toBe(true);
  });

  it('rejects a forged or mismatched signature', () => {
    expect(verifyRazorpaySignature('order_1', 'pay_1', 'deadbeef', secret)).toBe(false);
    expect(verifyRazorpaySignature('order_2', 'pay_1', sign('order_1', 'pay_1'), secret)).toBe(false);
  });

  it('rejects when any input is missing', () => {
    expect(verifyRazorpaySignature('order_1', undefined, 'x', secret)).toBe(false);
    expect(verifyRazorpaySignature('order_1', 'pay_1', sign('order_1', 'pay_1'), undefined)).toBe(false);
  });
});

describe('isAllowedRedirectUrl', () => {
  const original = process.env.FRONTEND_URL;
  beforeAll(() => { process.env.FRONTEND_URL = 'https://skywings.example.com'; });
  afterAll(() => { process.env.FRONTEND_URL = original; });

  it('allows our own frontend', () => {
    expect(isAllowedRedirectUrl('https://skywings.example.com/payment-success')).toBe(true);
    expect(isAllowedRedirectUrl('http://localhost:3000/confirmation')).toBe(true);
  });

  it('blocks other origins and non-http schemes', () => {
    expect(isAllowedRedirectUrl('https://evil.example.com/phish')).toBe(false);
    expect(isAllowedRedirectUrl('https://skywings.example.com.evil.com/')).toBe(false);
    expect(isAllowedRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedRedirectUrl('not a url')).toBe(false);
  });
});
