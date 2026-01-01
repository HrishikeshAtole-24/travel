// Main Express App Configuration
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Set view engine for EJS templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// PRODUCTION: Enable CORS for frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize Payment Acquirers
const { registerAcquirers } = require('./payments/acquirers/RegisterAcquirers');
registerAcquirers();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const routes = require('./routes');
app.use('/api', routes);

// Error Handling Middleware
const errorMiddleware = require('./middleware/error.middleware');
app.use(errorMiddleware);

module.exports = app;
