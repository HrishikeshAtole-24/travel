// Supplier Factory - Dynamic Supplier Selection
const Amadeus = require('./amadeus');
const logger = require('../config/winstonLogger');

/**
 * Supplier Factory
 * Dynamically selects and returns the appropriate supplier
 * @param {string} supplierName - Name of the supplier (amadeus, sabre, travelport, etc.)
 * @returns {Object} Supplier instance
 */
const supplierFactory = (supplierName = 'amadeus') => {
  const suppliers = {
    amadeus: Amadeus,
    // sabre: Sabre,        // Future suppliers
    // travelport: Travelport,
  };

  const supplier = suppliers[supplierName.toLowerCase()];

  if (!supplier) {
    logger.warn(`Supplier '${supplierName}' not found. Defaulting to Amadeus.`);
    return suppliers.amadeus;
  }

  logger.info(`Using supplier: ${supplierName}`);
  return supplier;
};

module.exports = supplierFactory;
