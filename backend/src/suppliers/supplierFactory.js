// Supplier Factory - Dynamic Supplier Selection
const Amadeus = require('./amadeus');
const Duffel = require('./duffel');
const LiteApi = require('./liteapi');
const logger = require('../config/winstonLogger');

/**
 * Supplier Factory
 * Dynamically selects and returns the appropriate supplier
 * @param {string} supplierName - Name of the supplier (amadeus, sabre, travelport, etc.)
 * @returns {Object} Supplier instance
 */
const supplierFactory = (supplierName = 'duffel') => {
  const suppliers = {
    duffel: Duffel,
    liteapi: LiteApi,
    amadeus: Amadeus,
    // sabre: Sabre,        // Future suppliers
    // travelport: Travelport,
  };

  const supplier = suppliers[String(supplierName).toLowerCase()];

  if (!supplier) {
    // Never silently fall back to another supplier - offer IDs are supplier-specific
    throw new Error(`Unknown supplier: ${supplierName}`);
  }

  logger.info(`Using supplier: ${supplierName}`);
  return supplier;
};

module.exports = supplierFactory;
