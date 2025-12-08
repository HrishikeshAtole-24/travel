// Global Error Handling Middleware
const ApiError = require('../core/ApiError');
const ApiResponse = require('../core/ApiResponse');
const logger = require('../config/winstonLogger');

const errorMiddleware = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle known ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(
      ApiResponse.error(err.message, err.statusCode, err.errors)
    );
  }

  // Handle Mongoose/Sequelize validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      ApiResponse.error('Validation Error', 400, err.errors)
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      ApiResponse.error('Invalid token', 401)
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      ApiResponse.error('Token expired', 401)
    );
  }

  // Handle database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json(
      ApiResponse.error('Duplicate entry', 409)
    );
  }

  // Default server error
  res.status(500).json(
    ApiResponse.error(
      process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message,
      500
    )
  );
};

module.exports = errorMiddleware;
