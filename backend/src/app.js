// Main Express App Configuration
const express = require('express');
const app = express();

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
