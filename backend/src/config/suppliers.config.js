/**
 * Supplier Configuration Management
 * Manages active suppliers and their configurations
 */

const logger = require('../config/winstonLogger');

/**
 * Supplier configurations
 * In production, this should be stored in MySQL database
 * with a table: suppliers (id, name, code, is_active, api_key, base_url, config)
 */
const SUPPLIERS_CONFIG = {
  amadeus: {
    name: 'Amadeus',
    code: 'amadeus',
    isActive: true,
    distributionChannel: 'GDS',
    timeout: 7000, // 7 seconds timeout
    priority: 1, // Lower number = higher priority
    config: {
      apiKey: process.env.AMADEUS_API_KEY,
      apiSecret: process.env.AMADEUS_API_SECRET,
      baseUrl: process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com/v1'
    }
  },
  // Future suppliers can be added here
  // sabre: {
  //   name: 'Sabre',
  //   code: 'sabre',
  //   isActive: false,
  //   distributionChannel: 'GDS',
  //   timeout: 7000,
  //   priority: 2,
  //   config: {
  //     apiKey: process.env.SABRE_API_KEY,
  //     apiSecret: process.env.SABRE_API_SECRET,
  //     baseUrl: process.env.SABRE_BASE_URL
  //   }
  // },
  // travelport: {
  //   name: 'Travelport',
  //   code: 'travelport',
  //   isActive: false,
  //   distributionChannel: 'GDS',
  //   timeout: 7000,
  //   priority: 3,
  //   config: {}
  // }
};

class SupplierConfigManager {
  /**
   * Get all active suppliers
   * @returns {Array<Object>} List of active suppliers
   */
  static getActiveSuppliers() {
    const activeSuppliers = Object.values(SUPPLIERS_CONFIG)
      .filter(supplier => supplier.isActive)
      .sort((a, b) => a.priority - b.priority);

    logger.info(`Active suppliers: ${activeSuppliers.map(s => s.code).join(', ')}`);
    return activeSuppliers;
  }

  /**
   * Get supplier by code
   * @param {string} supplierCode - Supplier code
   * @returns {Object|null} Supplier configuration
   */
  static getSupplier(supplierCode) {
    const supplier = SUPPLIERS_CONFIG[supplierCode];
    if (!supplier) {
      logger.warn(`Supplier '${supplierCode}' not found in configuration`);
      return null;
    }
    return supplier;
  }

  /**
   * Check if supplier is active
   * @param {string} supplierCode - Supplier code
   * @returns {boolean}
   */
  static isSupplierActive(supplierCode) {
    const supplier = this.getSupplier(supplierCode);
    return supplier ? supplier.isActive : false;
  }

  /**
   * Get supplier codes
   * @returns {string[]} List of supplier codes
   */
  static getSupplierCodes() {
    return Object.keys(SUPPLIERS_CONFIG);
  }

  /**
   * Get active supplier codes
   * @returns {string[]} List of active supplier codes
   */
  static getActiveSupplierCodes() {
    return this.getActiveSuppliers().map(s => s.code);
  }

  /**
   * Add new supplier (runtime addition)
   * In production, this would update the database
   * @param {string} code - Supplier code
   * @param {Object} config - Supplier configuration
   */
  static addSupplier(code, config) {
    if (SUPPLIERS_CONFIG[code]) {
      logger.warn(`Supplier '${code}' already exists`);
      return false;
    }

    SUPPLIERS_CONFIG[code] = {
      ...config,
      code,
      isActive: config.isActive !== undefined ? config.isActive : true
    };

    logger.info(`✅ Supplier '${code}' added successfully`);
    return true;
  }

  /**
   * Update supplier active status
   * @param {string} code - Supplier code
   * @param {boolean} isActive - Active status
   */
  static setSupplierActive(code, isActive) {
    const supplier = SUPPLIERS_CONFIG[code];
    if (!supplier) {
      logger.warn(`Cannot update - supplier '${code}' not found`);
      return false;
    }

    supplier.isActive = isActive;
    logger.info(`Supplier '${code}' ${isActive ? 'activated' : 'deactivated'}`);
    return true;
  }
}

module.exports = SupplierConfigManager;
