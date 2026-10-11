/**
 * Security Helpers
 * Shared primitives for signatures, references, OTPs and redirect validation
 */
const crypto = require('crypto');

// Crockford-style alphabet: no 0/O/1/I/L to avoid ambiguity when read aloud
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Constant-time string comparison (prevents timing attacks on signatures)
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate an unguessable reference, e.g. BK-20260311-7KQ4M9XA2C
 * 10 chars from a 31-char alphabet ≈ 49 bits of entropy per day
 */
function generateReference(prefix, length = 10) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let random = '';
  for (let i = 0; i < length; i++) {
    random += REFERENCE_ALPHABET[crypto.randomInt(REFERENCE_ALPHABET.length)];
  }
  return `${prefix}-${dateStr}-${random}`;
}

/**
 * Generate a 6-digit OTP using a CSPRNG
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Verify Razorpay checkout signature: HMAC_SHA256(order_id|payment_id, key_secret)
 */
function verifyRazorpaySignature(orderId, paymentId, signature, keySecret) {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}

/**
 * Origins the app is allowed to talk to / redirect to
 */
function getAllowedOrigins() {
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://travel-chi-rust.vercel.app',
    process.env.FRONTEND_URL,
    process.env.APP_URL
  ]
    .filter(Boolean)
    .map(url => {
      try {
        return new URL(url).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Only allow redirects to our own frontend/backend origins (prevents open redirects)
 */
function isAllowedRedirectUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return getAllowedOrigins().includes(parsed.origin);
  } catch {
    return false;
  }
}

/**
 * Default frontend base URL used for redirect fallbacks
 */
function getFrontendBaseUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

module.exports = {
  safeEqual,
  generateReference,
  generateOTP,
  verifyRazorpaySignature,
  getAllowedOrigins,
  isAllowedRedirectUrl,
  getFrontendBaseUrl
};
