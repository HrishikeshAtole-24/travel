// Main Express App Configuration
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllowedOrigins } = require('./utils/security');
const app = express();

// Behind Render/Vercel proxies: trust the first hop so req.ip is the real client IP
// (required for per-IP rate limiting)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Set view engine for EJS templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Basic security headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

// PRODUCTION: Enable CORS for frontend
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize Payment Acquirers
const { registerAcquirers } = require('./payments/acquirers/RegisterAcquirers');
registerAcquirers();

// Middleware
// Keep the exact raw body for payment webhooks: Razorpay/Stripe sign the raw bytes
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/payments/webhook')) {
      req.rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
const routes = require('./routes');
app.use('/api', routes);

// Error Handling Middleware
const errorMiddleware = require('./middleware/error.middleware');
app.use(errorMiddleware);

module.exports = app;
