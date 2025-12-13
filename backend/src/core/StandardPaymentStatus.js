/**
 * Standard Payment Status Codes (VEpay-inspired)
 * These are our unified status codes that all acquirers map to
 * Using VEpay status code structure
 */

const StandardPaymentStatus = {
  // Success States (VEpay: 200, 330, approved)
  CAPTURED: '200',               // Payment successfully captured (VEpay: 200)
  APPROVED: 'approved',          // Payment approved (VEpay: approved)
  AUTHORIZED: 'AUTHORIZED',      // Payment authorized but not captured
  SUCCESS: 'SUCCESS',            // Payout success
  
  // Pending States (VEpay: 100, 501, 406, PENDING, CREATED)
  CREATED: 'CREATED',            // Payment order created
  PENDING: 'PENDING',            // Payment pending user action
  PROCESSING: 'processing',      // Payment being processed (VEpay: processing)
  INPROGRESS: '100',             // In process (VEpay: 100)
  PENDING_STATUS: '501',         // Status pending from bank (VEpay: 501)
  UNDER_PROCESS: '406',          // Transaction under process (VEpay: 406)
  
  // Failure States (VEpay: 400, 500, 332, 402, 405, 409, 411, 505)
  FAILED: '400',                 // Transaction failed (VEpay: 400)
  TRANSACTION_FAILED: '500',     // Transaction failed at gateway (VEpay: 500)
  PAYMENT_FAILED: '332',         // Payment failed (VEpay: 332)
  ACQUIRER_ERROR: '402',         // Bank issue (VEpay: 402)
  AUTH_FAILED: '405',            // Authentication failed (VEpay: 405)
  SIGNATURE_MISMATCH: '409',     // Signature mismatched (VEpay: 409)
  RECURRING_ERROR: '411',        // Authorization success but recurring error (VEpay: 411)
  PAYMENT_OPTION_NOT_SUPPORTED: '505', // Payment option not supported (VEpay: 505)
  
  // Declined States (VEpay: 401, 403, 412)
  DECLINED: '401',               // Transaction declined (VEpay: 401)
  DENIED: '403',                 // Bank denied transaction (VEpay: 403)
  FRAUD_DENIED: '412',           // Denied due to fraud (VEpay: 412)
  
  // Cancelled/Rejected States (VEpay: 410, 407)
  CANCELLED: '410',              // Transaction cancelled (VEpay: 410)
  REJECTED: '407',               // Transaction rejected (VEpay: 407)
  
  // Timeout States (VEpay: 404)
  TIMEOUT: '404',                // Transaction timeout (VEpay: 404)
  
  // Duplicate States (VEpay: 408)
  DUPLICATE: '408',              // Duplicate transaction (VEpay: 408)
  
  // Invalid States (VEpay: 300, 502)
  INVALID: '502',                // Invalid request (VEpay: 502)
  INVALID_REQUEST: '300',        // Invalid request parameters (VEpay: 300)
  
  // Refund States (VEpay: REFUNDED, PARTIAL_REFUNDED, REFUND_PENDING, REFUND_FAILED, 413)
  REFUNDED: 'REFUNDED',          // Fully refunded
  PARTIAL_REFUNDED: 'PARTIAL_REFUNDED', // Partially refunded
  REFUND_PENDING: 'REFUND_PENDING', // Refund initiated
  REFUND_FAILED: 'REFUND_FAILED',   // Refund failed
  REFUND_AMOUNT_GREATER: '413',  // Refund amount greater than transaction (VEpay: 413)
  
  // Acquirer Service States (VEpay: 510)
  ACQUIRER_NOT_MAPPED: '510'     // Acquirer service not mapped (VEpay: 510)
};

/**
 * Status Categories for grouping
 */
const StatusCategory = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUND: 'refund',
  DISPUTE: 'dispute',
  VOID: 'void',
  ERROR: 'error'
};

/**
 * Get category for a status
 */
function getStatusCategory(status) {
  const categoryMap = {
    // Success
    [StandardPaymentStatus.CAPTURED]: StatusCategory.SUCCESS,
    [StandardPaymentStatus.APPROVED]: StatusCategory.SUCCESS,
    [StandardPaymentStatus.AUTHORIZED]: StatusCategory.SUCCESS,
    [StandardPaymentStatus.SUCCESS]: StatusCategory.SUCCESS,
    
    // Pending
    [StandardPaymentStatus.CREATED]: StatusCategory.PENDING,
    [StandardPaymentStatus.PENDING]: StatusCategory.PENDING,
    [StandardPaymentStatus.PROCESSING]: StatusCategory.PENDING,
    [StandardPaymentStatus.INPROGRESS]: StatusCategory.PENDING,
    [StandardPaymentStatus.PENDING_STATUS]: StatusCategory.PENDING,
    [StandardPaymentStatus.UNDER_PROCESS]: StatusCategory.PENDING,
    
    // Failed
    [StandardPaymentStatus.FAILED]: StatusCategory.FAILED,
    [StandardPaymentStatus.TRANSACTION_FAILED]: StatusCategory.FAILED,
    [StandardPaymentStatus.PAYMENT_FAILED]: StatusCategory.FAILED,
    [StandardPaymentStatus.ACQUIRER_ERROR]: StatusCategory.FAILED,
    [StandardPaymentStatus.AUTH_FAILED]: StatusCategory.FAILED,
    [StandardPaymentStatus.SIGNATURE_MISMATCH]: StatusCategory.FAILED,
    [StandardPaymentStatus.RECURRING_ERROR]: StatusCategory.FAILED,
    [StandardPaymentStatus.PAYMENT_OPTION_NOT_SUPPORTED]: StatusCategory.FAILED,
    [StandardPaymentStatus.DECLINED]: StatusCategory.FAILED,
    [StandardPaymentStatus.DENIED]: StatusCategory.FAILED,
    [StandardPaymentStatus.FRAUD_DENIED]: StatusCategory.FAILED,
    [StandardPaymentStatus.CANCELLED]: StatusCategory.FAILED,
    [StandardPaymentStatus.REJECTED]: StatusCategory.FAILED,
    [StandardPaymentStatus.TIMEOUT]: StatusCategory.FAILED,
    [StandardPaymentStatus.DUPLICATE]: StatusCategory.FAILED,
    [StandardPaymentStatus.INVALID]: StatusCategory.FAILED,
    [StandardPaymentStatus.INVALID_REQUEST]: StatusCategory.FAILED,
    
    // Refund
    [StandardPaymentStatus.REFUNDED]: StatusCategory.REFUND,
    [StandardPaymentStatus.PARTIAL_REFUNDED]: StatusCategory.REFUND,
    [StandardPaymentStatus.REFUND_PENDING]: StatusCategory.REFUND,
    [StandardPaymentStatus.REFUND_FAILED]: StatusCategory.REFUND,
    [StandardPaymentStatus.REFUND_AMOUNT_GREATER]: StatusCategory.REFUND,
    
    // Error
    [StandardPaymentStatus.ACQUIRER_NOT_MAPPED]: StatusCategory.ERROR
  };
  
  return categoryMap[status] || StatusCategory.ERROR;
}

/**
 * Check if status is final (no further updates expected)
 */
function isFinalStatus(status) {
  const finalStatuses = [
    StandardPaymentStatus.CAPTURED,
    StandardPaymentStatus.APPROVED,
    StandardPaymentStatus.SUCCESS,
    StandardPaymentStatus.FAILED,
    StandardPaymentStatus.TRANSACTION_FAILED,
    StandardPaymentStatus.PAYMENT_FAILED,
    StandardPaymentStatus.DECLINED,
    StandardPaymentStatus.DENIED,
    StandardPaymentStatus.FRAUD_DENIED,
    StandardPaymentStatus.CANCELLED,
    StandardPaymentStatus.REJECTED,
    StandardPaymentStatus.TIMEOUT,
    StandardPaymentStatus.REFUNDED
  ];
  return finalStatuses.includes(status);
}

module.exports = {
  StandardPaymentStatus,
  StatusCategory,
  getStatusCategory,
  isFinalStatus
};
