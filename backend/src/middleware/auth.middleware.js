// Authentication Middleware
const jwt = require('jsonwebtoken');
const ApiError = require('../core/ApiError');
const logger = require('../config/winstonLogger');

const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw ApiError.unauthorized('Access token required');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Attach user info to request
    req.user = decoded;

    logger.info(`Authenticated user: ${decoded.userId}`);
    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    next(ApiError.unauthorized('Invalid or expired token'));
  }
};

module.exports = authMiddleware;
