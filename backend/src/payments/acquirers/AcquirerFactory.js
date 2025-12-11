/**
 * AcquirerFactory - Factory pattern for payment gateway selection
 * Manages registration and retrieval of payment acquirer clients
 */

const logger = require('../../config/winstonLogger');

class AcquirerFactory {
  constructor() {
    this.acquirers = new Map();
  }

  /**
   * Register an acquirer client
   * @param {string} acquirerName - Name of the acquirer (STRIPE, RAZORPAY)
   * @param {IAcquirerClient} acquirerClient - Instance of acquirer client
   */
  register(acquirerName, acquirerClient) {
    if (!acquirerName || !acquirerClient) {
      throw new Error('Acquirer name and client are required');
    }

    const normalizedName = acquirerName.toUpperCase();
    this.acquirers.set(normalizedName, acquirerClient);
    logger.info(`✅ Registered payment acquirer: ${normalizedName}`);
  }

  /**
   * Get acquirer client by name
   * @param {string} acquirerName - Name of the acquirer
   * @returns {IAcquirerClient} Acquirer client instance
   */
  getAcquirer(acquirerName) {
    const normalizedName = acquirerName?.toUpperCase();

    if (!normalizedName) {
      throw new Error('Acquirer name is required');
    }

    const acquirer = this.acquirers.get(normalizedName);

    if (!acquirer) {
      throw new Error(`Acquirer not found: ${normalizedName}`);
    }

    return acquirer;
  }

  /**
   * Check if acquirer is registered
   * @param {string} acquirerName - Name of the acquirer
   * @returns {boolean}
   */
  hasAcquirer(acquirerName) {
    const normalizedName = acquirerName?.toUpperCase();
    return this.acquirers.has(normalizedName);
  }

  /**
   * Get all registered acquirer names
   * @returns {Array<string>}
   */
  getAvailableAcquirers() {
    return Array.from(this.acquirers.keys());
  }

  /**
   * Clear all registered acquirers (useful for testing)
   */
  clearAll() {
    this.acquirers.clear();
    logger.info('All acquirers cleared from factory');
  }
}

// Create singleton instance
const acquirerFactory = new AcquirerFactory();

module.exports = acquirerFactory;
