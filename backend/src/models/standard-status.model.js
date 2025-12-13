/**
 * Standard Status Codes Model
 * Stores our unified payment status codes
 * Inspired by VEpay status_codes structure, adapted for SQL
 */

const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createStandardStatusTable = async () => {
  const pool = getPool();
  const query = `
    -- Drop existing table
    DROP TABLE IF EXISTS standard_status_codes CASCADE;

    -- Create standard status codes table (VEpay-inspired)
    CREATE TABLE IF NOT EXISTS standard_status_codes (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      abbreviation VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_standard_status_code ON standard_status_codes(code);
    CREATE INDEX IF NOT EXISTS idx_standard_status_abbreviation ON standard_status_codes(abbreviation);
    CREATE INDEX IF NOT EXISTS idx_standard_status_active ON standard_status_codes(is_active);

    -- Insert VEpay-style standard status codes
    INSERT INTO standard_status_codes (code, description, abbreviation, message, is_active) VALUES
    -- Success/Captured States
    ('200', 'Success', 'CAPTURED', 'Payment successfully captured', true),
    ('330', 'Payment Approved', 'CAPTURED', 'Payment approved and captured', true),
    ('approved', 'Approved', 'CAPTURED', 'Payment approved by acquirer', true),
    
    -- Pending/In-Process States
    ('100', 'In Process', 'INPROGRESS', 'Transaction in progress', true),
    ('processing', 'Processing', 'INPROGRESS', 'Payment processing', true),
    ('501', 'Status Pending', 'PENDING', 'Status is yet to be received from Bank/Customer has left the transaction in middle', true),
    ('406', 'Transaction Under Process', 'PENDING', 'Transaction under process', true),
    ('PENDING', 'Transaction Pending', 'PENDING', 'Transaction is pending', true),
    ('CREATED', 'Order Created', 'CREATED', 'Order is initiated into the portal', true),
    
    -- Authorization States
    ('AUTHORIZED', 'Authorized Success', 'AUTHORIZED', 'Payment authorized but not captured', true),
    
    -- Failed States
    ('400', 'Failed', 'FAIL', 'Transaction failed', true),
    ('500', 'Transaction Failed', 'FAIL', 'Transaction failed at gateway', true),
    ('332', 'Payment Failed', 'FAIL', 'Payment failed', true),
    ('402', 'Acquirer Error', 'FAIL', 'Bank issue', true),
    ('405', 'Authentication Failed', 'FAIL', 'Authentication failed', true),
    ('409', 'Signature Mismatched', 'FAIL', 'Signature mismatched', true),
    ('411', 'Authorization Success But Error Processing', 'FAIL', 'Authorization success but error processing recurring payment', true),
    ('505', 'Payment Option Not Supported', 'FAIL', 'Payment option not supported', true),
    
    -- Declined States
    ('401', 'Transaction Declined', 'DECLINED', 'Transaction declined by bank', true),
    ('403', 'Denied', 'DECLINED', 'Bank denied transaction', true),
    ('412', 'Denied Due to Fraud', 'DECLINED', 'Denied due to fraud detection', true),
    
    -- Cancelled States
    ('410', 'Transaction Cancelled', 'CANCEL', 'Transaction cancelled by user', true),
    
    -- Rejected States
    ('407', 'Transaction Rejected', 'REJECT', 'Transaction rejected', true),
    
    -- Timeout States
    ('404', 'Timeout', 'TIMEOUT', 'Transaction timeout', true),
    
    -- Duplicate States
    ('408', 'Duplicate Transaction', 'DUPLICATE', 'Duplicate transaction detected', true),
    
    -- Invalid States
    ('300', 'Invalid Request', 'INVALID', 'Invalid request parameters', true),
    ('502', 'Invalid Request', 'INVALID', 'Invalid request', true),
    
    -- Refund States
    ('REFUNDED', 'Complete Refund', 'REFUNDED', 'Payment completely refunded', true),
    ('PARTIAL_REFUNDED', 'Partial Refund', 'PARTIAL_REFUNDED', 'If a customer returns only part of the items they purchased, the refund issued will be for the value of the returned items only', true),
    ('REFUND_PENDING', 'Refund Pending', 'REFUND_PENDING', 'Refund initiated and pending', true),
    ('REFUND_FAILED', 'Refund Failed', 'REFUND_FAILED', 'Refund process failed', true),
    ('413', 'Refund Amount Greater', 'MRRF', 'Refund amount you requested is greater than transaction amount', true),
    
    -- Acquirer Service States
    ('510', 'Acquirer Service Not Mapped', 'Acquirer service', 'Acquirer service should be mapped to merchant', true),
    
    -- Payout States
    ('SUCCESS', 'Payout Success', 'SUCCESS', 'Payout completed successfully', true)
    ON CONFLICT (code) DO NOTHING;
  `;
  
  try {
    await pool.query(query);
    logger.info('✅ Standard status codes table created with VEpay-style statuses');
  } catch (error) {
    logger.error('❌ Error creating standard status codes table:', error.message);
    throw error;
  }
};

/**
 * Get status by code
 */
const getStatusByCode = async (code) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM standard_status_codes WHERE code = $1 AND is_active = TRUE',
      [code]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error(`Error fetching status ${code}:`, error.message);
    return null;
  }
};

/**
 * Get status by abbreviation
 */
const getStatusByAbbreviation = async (abbreviation) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM standard_status_codes WHERE abbreviation = $1 AND is_active = TRUE',
      [abbreviation]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error(`Error fetching status by abbreviation ${abbreviation}:`, error.message);
    return null;
  }
};

/**
 * Get all active statuses
 */
const getAllActiveStatuses = async () => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM standard_status_codes WHERE is_active = TRUE ORDER BY code'
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Error fetching active statuses:', error.message);
    return [];
  }
};

module.exports = { 
  createStandardStatusTable,
  getStatusByCode,
  getStatusByAbbreviation,
  getAllActiveStatuses
};
