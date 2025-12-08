// Request Logger Middleware
const logger = require('../config/winstonLogger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info(`Incoming Request: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`Response: ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

module.exports = requestLogger;
