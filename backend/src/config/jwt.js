/**
 * JWT Configuration
 * Fails fast in production when JWT_SECRET is missing instead of
 * silently falling back to a publicly known default.
 */
const crypto = require('crypto');
const logger = require('./winstonLogger');

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  // Development only: random per-process secret (tokens reset on restart)
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  logger.warn('⚠️  JWT_SECRET not set - using a random development secret. Tokens will be invalidated on restart.');
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};
