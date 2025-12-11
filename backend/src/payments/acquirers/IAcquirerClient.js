/**
 * IAcquirerClient - Abstract base class for payment gateway integrations
 * All payment acquirers must extend this class and implement the required methods
 */

class IAcquirerClient {
  constructor() {
    if (this.constructor === IAcquirerClient) {
      throw new Error("Abstract class IAcquirerClient can't be instantiated directly.");
    }
  }

  /**
   * Get acquirer name
   * @returns {string} Name of the acquirer
   */
  getName() {
    throw new Error('Method "getName()" must be implemented.');
  }

  /**
   * Create a payment order with the acquirer
   * @param {object} paymentData - Payment details
   * @param {object} credentials - Acquirer credentials
   * @returns {Promise<object>} Result containing order details
   */
  async createOrder(paymentData, credentials) {
    throw new Error('Method "createOrder()" must be implemented.');
  }

  /**
   * Verify payment signature/callback from acquirer
   * @param {object} callbackData - Data received from acquirer callback
   * @param {object} credentials - Acquirer credentials
   * @returns {Promise<object>} Verification result
   */
  async verifyPayment(callbackData, credentials) {
    throw new Error('Method "verifyPayment()" must be implemented.');
  }

  /**
   * Check payment status with acquirer
   * @param {string} acquirerOrderId - Order ID from acquirer
   * @param {object} credentials - Acquirer credentials
   * @returns {Promise<object>} Payment status
   */
  async checkStatus(acquirerOrderId, credentials) {
    throw new Error('Method "checkStatus()" must be implemented.');
  }

  /**
   * Process refund through acquirer
   * @param {object} refundData - Refund details
   * @param {object} credentials - Acquirer credentials
   * @returns {Promise<object>} Refund result
   */
  async processRefund(refundData, credentials) {
    throw new Error('Method "processRefund()" must be implemented.');
  }

  /**
   * Handle webhook from acquirer
   * @param {object} webhookData - Webhook payload
   * @param {object} credentials - Acquirer credentials
   * @returns {Promise<object>} Webhook processing result
   */
  async handleWebhook(webhookData, credentials) {
    throw new Error('Method "handleWebhook()" must be implemented.');
  }

  /**
   * Capture authorized payment (for two-step payments)
   * @param {string} acquirerPaymentId - Payment ID from acquirer
   * @param {number} amount - Amount to capture
   * @param {object} credentials - Acquirer credentials
   * @returns {Promise<object>} Capture result
   */
  async capturePayment(acquirerPaymentId, amount, credentials) {
    // Optional - not all acquirers support this
    throw new Error('Method "capturePayment()" not supported by this acquirer.');
  }
}

module.exports = IAcquirerClient;
