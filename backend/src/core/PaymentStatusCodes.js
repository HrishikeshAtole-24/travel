/**
 * Payment Status Codes
 * Standardized status codes for payment processing
 */

const PaymentStatus = {
  CREATED: 'CREATED',           // Payment record created
  PENDING: 'PENDING',           // Awaiting payment from customer
  PROCESSING: 'PROCESSING',     // Payment is being processed
  SUCCESS: 'SUCCESS',           // Payment successful
  FAILED: 'FAILED',             // Payment failed
  CANCELLED: 'CANCELLED',       // Payment cancelled by user
  REFUNDED: 'REFUNDED',         // Full refund processed
  PARTIAL_REFUND: 'PARTIAL_REFUND' // Partial refund processed
};

const PaymentMethod = {
  CARD: 'CARD',
  UPI: 'UPI',
  NET_BANKING: 'NET_BANKING',
  WALLET: 'WALLET',
  EMI: 'EMI'
};

const PaymentAcquirer = {
  STRIPE: 'STRIPE',
  RAZORPAY: 'RAZORPAY'
};

/**
 * Payment error codes and messages
 */
const PaymentError = {
  INVALID_AMOUNT: {
    code: 'PAYMENT_001',
    message: 'Invalid payment amount'
  },
  BOOKING_NOT_FOUND: {
    code: 'PAYMENT_002',
    message: 'Booking not found'
  },
  PAYMENT_NOT_FOUND: {
    code: 'PAYMENT_003',
    message: 'Payment not found'
  },
  PAYMENT_EXPIRED: {
    code: 'PAYMENT_004',
    message: 'Payment link expired'
  },
  PAYMENT_ALREADY_PROCESSED: {
    code: 'PAYMENT_005',
    message: 'Payment already processed'
  },
  INVALID_SIGNATURE: {
    code: 'PAYMENT_006',
    message: 'Invalid payment signature'
  },
  ACQUIRER_ERROR: {
    code: 'PAYMENT_007',
    message: 'Payment gateway error'
  },
  REFUND_FAILED: {
    code: 'PAYMENT_008',
    message: 'Refund processing failed'
  },
  INSUFFICIENT_BALANCE: {
    code: 'PAYMENT_009',
    message: 'Insufficient balance'
  },
  CARD_DECLINED: {
    code: 'PAYMENT_010',
    message: 'Card declined by issuer'
  },
  INVALID_CARD: {
    code: 'PAYMENT_011',
    message: 'Invalid card details'
  },
  NETWORK_ERROR: {
    code: 'PAYMENT_012',
    message: 'Network error occurred'
  },
  TIMEOUT: {
    code: 'PAYMENT_013',
    message: 'Payment timeout'
  }
};

/**
 * Status transition validation
 * Defines allowed status transitions
 */
const AllowedStatusTransitions = {
  CREATED: ['PENDING', 'PROCESSING', 'FAILED', 'CANCELLED'],
  PENDING: ['PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'],
  PROCESSING: ['SUCCESS', 'FAILED'],
  SUCCESS: ['REFUNDED', 'PARTIAL_REFUND'],
  FAILED: ['PENDING'], // Allow retry
  CANCELLED: [],
  REFUNDED: [],
  PARTIAL_REFUND: ['REFUNDED']
};

/**
 * Check if status transition is valid
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  if (!AllowedStatusTransitions[currentStatus]) {
    return false;
  }
  return AllowedStatusTransitions[currentStatus].includes(newStatus);
};

/**
 * Get user-friendly status message
 */
const getStatusMessage = (status) => {
  const messages = {
    CREATED: 'Payment initiated',
    PENDING: 'Awaiting payment',
    PROCESSING: 'Processing payment',
    SUCCESS: 'Payment successful',
    FAILED: 'Payment failed',
    CANCELLED: 'Payment cancelled',
    REFUNDED: 'Payment refunded',
    PARTIAL_REFUND: 'Partial refund processed'
  };
  return messages[status] || 'Unknown status';
};

/**
 * Razorpay specific status mappings
 */
const RazorpayStatusMap = {
  created: PaymentStatus.CREATED,
  authorized: PaymentStatus.PROCESSING,
  captured: PaymentStatus.SUCCESS,
  refunded: PaymentStatus.REFUNDED,
  failed: PaymentStatus.FAILED
};

/**
 * Stripe specific status mappings
 */
const StripeStatusMap = {
  requires_payment_method: PaymentStatus.PENDING,
  requires_confirmation: PaymentStatus.PENDING,
  requires_action: PaymentStatus.PROCESSING,
  processing: PaymentStatus.PROCESSING,
  succeeded: PaymentStatus.SUCCESS,
  canceled: PaymentStatus.CANCELLED,
  requires_capture: PaymentStatus.PROCESSING
};

/**
 * Map acquirer status to internal status
 */
const mapAcquirerStatus = (acquirer, acquirerStatus) => {
  if (acquirer === PaymentAcquirer.RAZORPAY) {
    return RazorpayStatusMap[acquirerStatus] || PaymentStatus.FAILED;
  } else if (acquirer === PaymentAcquirer.STRIPE) {
    return StripeStatusMap[acquirerStatus] || PaymentStatus.FAILED;
  }
  return PaymentStatus.FAILED;
};

module.exports = {
  PaymentStatus,
  PaymentMethod,
  PaymentAcquirer,
  PaymentError,
  AllowedStatusTransitions,
  isValidStatusTransition,
  getStatusMessage,
  mapAcquirerStatus,
  RazorpayStatusMap,
  StripeStatusMap
};
