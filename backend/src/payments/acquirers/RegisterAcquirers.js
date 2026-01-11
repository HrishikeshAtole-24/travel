/**
 * Register Payment Acquirers
 * This file registers all available payment acquirers with the factory
 */

const acquirerFactory = require('./AcquirerFactory');
const RazorpayNonSeamlessClient = require('./razorpay/nonseamless');
const StripeNonSeamlessClient = require('./stripe/nonseamless');
const logger = require('../../config/winstonLogger');

/**
 * Register all payment acquirers
 */
function registerAcquirers() {
  try {
    // Register Razorpay
    const razorpayClient = new RazorpayNonSeamlessClient();
    acquirerFactory.register('RAZORPAY', razorpayClient);

    // Register Stripe
    const stripeClient = new StripeNonSeamlessClient();
    acquirerFactory.register('STRIPE', stripeClient);

    logger.info('✅ All payment acquirers registered successfully');
    logger.info(`Available acquirers: ${acquirerFactory.getAvailableAcquirers().join(', ')}`);
  } catch (error) {
    logger.error('❌ Failed to register payment acquirers:', error.message);
    throw error;
  }
}

module.exports = {
  registerAcquirers
};
