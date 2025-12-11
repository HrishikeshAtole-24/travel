/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */

const jwt = require('jsonwebtoken');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authenticate JWT token (required)
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw ApiError.unauthorized('Access token required');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    logger.info(`[Auth] Authenticated user: ${decoded.email}`);
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.error('[Auth] Token expired');
      next(ApiError.unauthorized('Token expired. Please login again.'));
    } else if (error.name === 'JsonWebTokenError') {
      logger.error('[Auth] Invalid token');
      next(ApiError.unauthorized('Invalid token'));
    } else {
      logger.error('[Auth] Authentication error:', error);
      next(ApiError.unauthorized('Authentication failed'));
    }
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 * Useful for endpoints that work for both guests and logged-in users
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
      logger.info(`[Auth] Optional auth: ${decoded.email}`);
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    logger.warn('[Auth] Optional auth failed, continuing as guest');
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};

// For backward compatibility
module.exports.default = authenticateToken;
