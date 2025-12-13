/**
 * Acquirer Status Mapping (VEpay-inspired)
 * Maps acquirer-specific status codes to our standard status codes
 * Note: For production, use database-driven mapping (acquirer_status_mapping table)
 * This file provides fallback in-memory mapping
 */

const { StandardPaymentStatus } = require('./StandardPaymentStatus');

/**
 * Razorpay Status Mapping (VEpay-style codes)
 * Docs: https://razorpay.com/docs/payments/payments/payment-status/
 */
const RazorpayStatusMapping = {
  // Order statuses
  'created': StandardPaymentStatus.CREATED,
  'attempted': StandardPaymentStatus.PENDING,
  'paid': StandardPaymentStatus.CAPTURED,  // Maps to '200'
  
  // Payment statuses
  'authorized': StandardPaymentStatus.AUTHORIZED,
  'captured': StandardPaymentStatus.CAPTURED,  // Maps to '200'
  'refunded': StandardPaymentStatus.REFUNDED,
  'failed': StandardPaymentStatus.FAILED,  // Maps to '400'
  'cancelled': StandardPaymentStatus.CANCELLED,  // Maps to '410'
  
  // Refund statuses
  'pending': StandardPaymentStatus.REFUND_PENDING,
  'processed': StandardPaymentStatus.REFUNDED,
  'partial_refund': StandardPaymentStatus.PARTIAL_REFUNDED,
  'refund_pending': StandardPaymentStatus.REFUND_PENDING,
  'refund_failed': StandardPaymentStatus.REFUND_FAILED,
  
  // Error codes
  'error': StandardPaymentStatus.ACQUIRER_ERROR,  // Maps to '402'
  'timeout': StandardPaymentStatus.TIMEOUT,  // Maps to '404'
  'BAD_REQUEST_ERROR': StandardPaymentStatus.INVALID,  // Maps to '502'
  'GATEWAY_ERROR': StandardPaymentStatus.ACQUIRER_ERROR,
  'SERVER_ERROR': StandardPaymentStatus.TRANSACTION_FAILED,  // Maps to '500'
  
  // Default
  'unknown': StandardPaymentStatus.INVALID  // Maps to '502'
};

/**
 * Stripe Status Mapping (VEpay-style codes)
 * Docs: https://stripe.com/docs/payments/payment-intents/verifying-status
 */
const StripeStatusMapping = {
  // Payment Intent statuses
  'requires_payment_method': StandardPaymentStatus.PENDING,
  'requires_confirmation': StandardPaymentStatus.PENDING,
  'requires_action': StandardPaymentStatus.PENDING,
  'processing': StandardPaymentStatus.PROCESSING,
  'requires_capture': StandardPaymentStatus.AUTHORIZED,
  'canceled': StandardPaymentStatus.CANCELLED,  // Maps to '410'
  'cancelled': StandardPaymentStatus.CANCELLED,  // Maps to '410'
  'succeeded': StandardPaymentStatus.CAPTURED,  // Maps to '200'
  
  // Charge statuses
  'pending': StandardPaymentStatus.PENDING,
  'failed': StandardPaymentStatus.FAILED,  // Maps to '400'
  
  // Refund statuses
  'refunded': StandardPaymentStatus.REFUNDED,
  'partial_refunded': StandardPaymentStatus.PARTIAL_REFUNDED,
  
  // Default
  'unknown': StandardPaymentStatus.INVALID  // Maps to '502'
};

/**
 * PayPal Status Mapping (VEpay-style codes)
 */
const PayPalStatusMapping = {
  'CREATED': StandardPaymentStatus.CREATED,
  'SAVED': StandardPaymentStatus.PENDING,
  'APPROVED': StandardPaymentStatus.AUTHORIZED,
  'VOIDED': StandardPaymentStatus.CANCELLED,  // Maps to '410'
  'COMPLETED': StandardPaymentStatus.CAPTURED,  // Maps to '200'
  'PAYER_ACTION_REQUIRED': StandardPaymentStatus.PENDING,
  'FAILED': StandardPaymentStatus.FAILED,  // Maps to '400'
  'DECLINED': StandardPaymentStatus.DECLINED,  // Maps to '401'
  'PENDING': StandardPaymentStatus.PENDING,
  'PARTIALLY_REFUNDED': StandardPaymentStatus.PARTIAL_REFUNDED,
  'REFUNDED': StandardPaymentStatus.REFUNDED,
  'unknown': StandardPaymentStatus.INVALID  // Maps to '502'
};

/**
 * Test Gateway Status Mapping
 */
const TestSeamlessStatusMapping = {
  'success': StandardPaymentStatus.CAPTURED,  // Maps to '200'
  'failure': StandardPaymentStatus.FAILED,  // Maps to '400'
  'pending': StandardPaymentStatus.PENDING,
  'unknown': StandardPaymentStatus.INVALID  // Maps to '502'
};

/**
 * Acquirer Registry
 * Maps acquirer names to their status mapping
 */
const AcquirerStatusRegistry = {
  'RAZORPAY': RazorpayStatusMapping,
  'STRIPE': StripeStatusMapping,
  'PAYPAL': PayPalStatusMapping,
  'TESTSEAMLESS': TestSeamlessStatusMapping
};

/**
 * Map acquirer status to standard status (in-memory fallback)
 * @param {string} acquirer - Acquirer name (RAZORPAY, STRIPE, etc.)
 * @param {string} acquirerStatus - Status from acquirer
 * @returns {string} Standard status code (VEpay-style)
 */
function mapAcquirerStatus(acquirer, acquirerStatus) {
  const mapping = AcquirerStatusRegistry[acquirer.toUpperCase()];
  
  if (!mapping) {
    console.warn(`No status mapping found for acquirer: ${acquirer}`);
    return StandardPaymentStatus.INVALID;  // '502'
  }
  
  const standardStatus = mapping[acquirerStatus] || mapping['unknown'];
  
  if (!standardStatus || standardStatus === StandardPaymentStatus.INVALID) {
    console.warn(`Unknown status from ${acquirer}: ${acquirerStatus}, defaulting to 502 (INVALID)`);
  }
  
  return standardStatus || StandardPaymentStatus.INVALID;
}

/**
 * Register new acquirer status mapping
 * @param {string} acquirerName - Acquirer name
 * @param {object} statusMapping - Status mapping object
 */
function registerAcquirerMapping(acquirerName, statusMapping) {
  AcquirerStatusRegistry[acquirerName.toUpperCase()] = statusMapping;
  console.log(`✅ Registered status mapping for: ${acquirerName}`);
}

module.exports = {
  RazorpayStatusMapping,
  StripeStatusMapping,
  PayPalStatusMapping,
  AcquirerStatusRegistry,
  mapAcquirerStatus,
  registerAcquirerMapping
};
