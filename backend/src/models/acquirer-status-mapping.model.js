/**
 * Acquirer Status Mapping Model
 * Maps acquirer-specific status codes to our standard status codes
 * Inspired by VEpay status mapping, adapted for SQL
 */

const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createAcquirerStatusMappingTable = async () => {
  const pool = getPool();
  const query = `
    -- Drop existing table
    DROP TABLE IF EXISTS acquirer_status_mapping CASCADE;

    -- Create acquirer status mapping table
    CREATE TABLE IF NOT EXISTS acquirer_status_mapping (
      id SERIAL PRIMARY KEY,
      acquirer_code VARCHAR(50) NOT NULL,
      acquirer_status VARCHAR(100) NOT NULL,
      standard_status_code VARCHAR(50) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(acquirer_code, acquirer_status)
    );

    -- Create indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_acquirer_mapping ON acquirer_status_mapping(acquirer_code, acquirer_status);
    CREATE INDEX IF NOT EXISTS idx_standard_status_ref ON acquirer_status_mapping(standard_status_code);
    CREATE INDEX IF NOT EXISTS idx_acquirer_active ON acquirer_status_mapping(is_active);

    -- Insert Razorpay status mappings (nonseamless)
    INSERT INTO acquirer_status_mapping (acquirer_code, acquirer_status, standard_status_code, description) VALUES
    -- Razorpay Order/Payment States
    ('RAZORPAY', 'created', 'CREATED', 'Order created in Razorpay'),
    ('RAZORPAY', 'attempted', 'PENDING', 'Payment attempted by customer'),
    ('RAZORPAY', 'paid', '200', 'Payment successfully paid'),
    ('RAZORPAY', 'authorized', 'AUTHORIZED', 'Payment authorized'),
    ('RAZORPAY', 'captured', '200', 'Payment captured successfully'),
    ('RAZORPAY', 'failed', '400', 'Payment failed'),
    ('RAZORPAY', 'cancelled', '410', 'Payment cancelled by user'),
    
    -- Razorpay Refund States
    ('RAZORPAY', 'refunded', 'REFUNDED', 'Payment fully refunded'),
    ('RAZORPAY', 'partial_refund', 'PARTIAL_REFUNDED', 'Payment partially refunded'),
    ('RAZORPAY', 'refund_pending', 'REFUND_PENDING', 'Refund initiated'),
    ('RAZORPAY', 'refund_failed', 'REFUND_FAILED', 'Refund failed'),
    
    -- Razorpay Error States
    ('RAZORPAY', 'error', '402', 'Error occurred during payment'),
    ('RAZORPAY', 'timeout', '404', 'Payment timed out'),
    
    -- Stripe status mappings
    ('STRIPE', 'requires_payment_method', 'PENDING', 'Requires payment method'),
    ('STRIPE', 'requires_confirmation', 'PENDING', 'Requires confirmation'),
    ('STRIPE', 'requires_action', 'PENDING', 'Requires customer action'),
    ('STRIPE', 'processing', 'processing', 'Payment processing'),
    ('STRIPE', 'requires_capture', 'AUTHORIZED', 'Payment authorized, requires capture'),
    ('STRIPE', 'canceled', '410', 'Payment canceled'),
    ('STRIPE', 'cancelled', '410', 'Payment cancelled'),
    ('STRIPE', 'succeeded', '200', 'Payment succeeded'),
    ('STRIPE', 'failed', '400', 'Payment failed'),
    
    -- Stripe Refund States
    ('STRIPE', 'refunded', 'REFUNDED', 'Payment refunded'),
    ('STRIPE', 'partial_refunded', 'PARTIAL_REFUNDED', 'Payment partially refunded'),
    
    -- PayPal status mappings
    ('PAYPAL', 'CREATED', 'CREATED', 'Order created'),
    ('PAYPAL', 'SAVED', 'PENDING', 'Order saved'),
    ('PAYPAL', 'APPROVED', 'AUTHORIZED', 'Order approved'),
    ('PAYPAL', 'VOIDED', '410', 'Order voided'),
    ('PAYPAL', 'COMPLETED', '200', 'Payment completed'),
    ('PAYPAL', 'FAILED', '400', 'Payment failed'),
    ('PAYPAL', 'DECLINED', '401', 'Payment declined'),
    ('PAYPAL', 'PENDING', 'PENDING', 'Payment pending'),
    
    -- PayPal Refund States
    ('PAYPAL', 'REFUNDED', 'REFUNDED', 'Payment refunded'),
    ('PAYPAL', 'PARTIALLY_REFUNDED', 'PARTIAL_REFUNDED', 'Payment partially refunded'),
    
    -- Test Gateway Mappings
    ('TESTSEAMLESS', 'success', '200', 'Test payment success'),
    ('TESTSEAMLESS', 'failure', '400', 'Test payment failure'),
    ('TESTSEAMLESS', 'pending', 'PENDING', 'Test payment pending')
    ON CONFLICT (acquirer_code, acquirer_status) DO NOTHING;
  `;
  
  try {
    await pool.query(query);
    logger.info('✅ Acquirer status mapping table created with VEpay-style mappings');
  } catch (error) {
    logger.error('❌ Error creating acquirer status mapping table:', error.message);
    throw error;
  }
};

/**
 * Get standard status for acquirer status (DB lookup)
 */
const mapAcquirerStatusFromDB = async (acquirerCode, acquirerStatus) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `SELECT standard_status_code, description 
       FROM acquirer_status_mapping 
       WHERE acquirer_code = $1 AND acquirer_status = $2 AND is_active = TRUE`,
      [acquirerCode.toUpperCase(), acquirerStatus]
    );
    
    if (result.rows.length > 0) {
      logger.info(`✅ Mapped ${acquirerCode}:${acquirerStatus} → ${result.rows[0].standard_status_code}`);
      return result.rows[0].standard_status_code;
    }
    
    // Fallback to 502 (Invalid Request)
    logger.warn(`⚠️ No mapping found for ${acquirerCode}:${acquirerStatus}, defaulting to 502 (INVALID)`);
    return '502';
  } catch (error) {
    logger.error('❌ Error mapping acquirer status:', error.message);
    return '502';
  }
};

/**
 * Add new acquirer status mapping
 */
const addAcquirerMapping = async (acquirerCode, acquirerStatus, standardStatusCode, description) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `INSERT INTO acquirer_status_mapping (acquirer_code, acquirer_status, standard_status_code, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (acquirer_code, acquirer_status) 
       DO UPDATE SET standard_status_code = $3, description = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [acquirerCode.toUpperCase(), acquirerStatus, standardStatusCode, description]
    );
    
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Error adding acquirer mapping:', error.message);
    throw error;
  }
};

/**
 * Get all mappings for an acquirer
 */
const getAcquirerMappings = async (acquirerCode) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM acquirer_status_mapping WHERE acquirer_code = $1 AND is_active = TRUE ORDER BY acquirer_status',
      [acquirerCode.toUpperCase()]
    );
    
    return result.rows;
  } catch (error) {
    logger.error(`❌ Error fetching mappings for ${acquirerCode}:`, error.message);
    return [];
  }
};

/**
 * Toggle mapping active status
 */
const toggleMappingStatus = async (acquirerCode, acquirerStatus, isActive) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `UPDATE acquirer_status_mapping 
       SET is_active = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE acquirer_code = $1 AND acquirer_status = $2
       RETURNING *`,
      [acquirerCode.toUpperCase(), acquirerStatus, isActive]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('❌ Error toggling mapping status:', error.message);
    throw error;
  }
};

module.exports = {
  createAcquirerStatusMappingTable,
  mapAcquirerStatusFromDB,
  addAcquirerMapping,
  getAcquirerMappings,
  toggleMappingStatus
};

