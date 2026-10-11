/**
 * Rate Limiting Middleware
 * Simple in-memory fixed-window limiter keyed by client IP.
 * Good enough for a single instance; swap for a Redis-backed store when scaling out.
 */
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');

const stores = [];

/**
 * Create a rate limiter
 * @param {Object} options
 * @param {number} options.windowMs - Window length in ms
 * @param {number} options.max - Max requests per window per key
 * @param {string} options.name - Limiter name (for logs and key isolation)
 * @param {Function} [options.keyGenerator] - (req) => key, defaults to req.ip
 */
function createRateLimiter({ windowMs, max, name, keyGenerator }) {
  const hits = new Map();
  stores.push({ hits, windowMs });

  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { count: 0, windowStart: now };
      hits.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, max - entry.count);
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(remaining));

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      logger.warn(`[RateLimit] ${name} limit exceeded for ${key}`);
      return next(new ApiError('Too many requests. Please try again later.', 429));
    }

    next();
  };
}

// Periodically drop expired windows so the maps don't grow forever
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const { hits, windowMs } of stores) {
    for (const [key, entry] of hits) {
      if (now - entry.windowStart >= windowMs) hits.delete(key);
    }
  }
}, 60 * 1000);
cleanupTimer.unref();

const MINUTE = 60 * 1000;

module.exports = {
  createRateLimiter,
  // Login / signup: 10 attempts per 15 minutes per IP
  authLimiter: createRateLimiter({ name: 'auth', windowMs: 15 * MINUTE, max: 10 }),
  // OTP verify / resend: 10 per 15 minutes per IP (plus per-account attempt cap in auth.service)
  otpLimiter: createRateLimiter({ name: 'otp', windowMs: 15 * MINUTE, max: 10 }),
  // Booking / payment creation: 20 per 15 minutes per IP
  bookingLimiter: createRateLimiter({ name: 'booking', windowMs: 15 * MINUTE, max: 20 }),
  // Booking lookups by reference (anti-enumeration): 30 per 15 minutes per IP
  lookupLimiter: createRateLimiter({ name: 'lookup', windowMs: 15 * MINUTE, max: 30 }),
  // AI chat: 20 messages per minute per IP
  chatLimiter: createRateLimiter({ name: 'chat', windowMs: MINUTE, max: 20 })
};
