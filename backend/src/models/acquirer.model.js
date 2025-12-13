/**
 * Acquirer Model
 * Stores payment acquirer/gateway configuration
 * Inspired by VEpay acquirers structure, adapted for SQL and flight bookings
 */

const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createAcquirerTable = async () => {
  const pool = getPool();
  const query = `
    -- Drop existing table if needed
    DROP TABLE IF EXISTS acquirers CASCADE;

    -- Create acquirers table
    CREATE TABLE IF NOT EXISTS acquirers (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      base_currency VARCHAR(3) DEFAULT 'INR',
      allowed_currencies JSONB DEFAULT '[]',
      credentials JSONB DEFAULT '{}',
      config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      setup_cost DECIMAL(10,2) DEFAULT 0,
      transaction_fee_percent DECIMAL(5,2) DEFAULT 0,
      transaction_fee_fixed DECIMAL(10,2) DEFAULT 0,
      refund_fees DECIMAL(10,2) DEFAULT 0,
      chargeback_fees DECIMAL(10,2) DEFAULT 0,
      settlement_cycle_days INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_acquirer_code ON acquirers(code);
    CREATE INDEX IF NOT EXISTS idx_acquirer_active ON acquirers(is_active);

    -- Insert initial acquirers
    INSERT INTO acquirers (code, name, type, base_currency, allowed_currencies, credentials, config, is_active) VALUES
    (
      'RAZORPAY',
      'RazorPay',
      'razorpay.seamless',
      'INR',
      '["INR", "USD"]'::jsonb,
      '{
        "key_id": "",
        "key_secret": "",
        "webhook_secret": ""
      }'::jsonb,
      '{
        "payment_methods": ["card", "netbanking", "upi", "wallet"],
        "supported_features": ["refunds", "partial_refunds", "webhooks"],
        "max_amount": 10000000,
        "min_amount": 100
      }'::jsonb,
      true
    ),
    (
      'STRIPE',
      'Stripe',
      'stripe.seamless',
      'USD',
      '["USD", "EUR", "GBP", "INR"]'::jsonb,
      '{
        "publishable_key": "",
        "secret_key": "",
        "webhook_secret": ""
      }'::jsonb,
      '{
        "payment_methods": ["card"],
        "supported_features": ["refunds", "partial_refunds", "webhooks", "3ds"],
        "max_amount": 99999999,
        "min_amount": 50
      }'::jsonb,
      false
    ),
    (
      'PAYPAL',
      'PayPal',
      'paypal.seamless',
      'USD',
      '["USD", "EUR", "GBP"]'::jsonb,
      '{
        "client_id": "",
        "client_secret": "",
        "mode": "sandbox"
      }'::jsonb,
      '{
        "payment_methods": ["paypal"],
        "supported_features": ["refunds", "partial_refunds"],
        "max_amount": 10000000,
        "min_amount": 100
      }'::jsonb,
      false
    ),
    (
      'TESTSEAMLESS',
      'Test Seamless',
      'test.seamless',
      'INR',
      '["INR"]'::jsonb,
      '{
        "api_key": "test_key"
      }'::jsonb,
      '{
        "payment_methods": ["card", "upi"],
        "supported_features": ["test_mode"],
        "max_amount": 100000,
        "min_amount": 1
      }'::jsonb,
      true
    )
    ON CONFLICT (code) DO NOTHING;
  `;
  
  try {
    await pool.query(query);
    logger.info('✅ Acquirers table created/verified successfully');
  } catch (error) {
    logger.error('❌ Error creating acquirers table:', error.message);
    throw error;
  }
};

/**
 * Get acquirer by code
 */
const getAcquirerByCode = async (code) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM acquirers WHERE code = $1 AND is_active = TRUE',
      [code.toUpperCase()]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error(`Error fetching acquirer ${code}:`, error.message);
    return null;
  }
};

/**
 * Get all active acquirers
 */
const getAllActiveAcquirers = async () => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM acquirers WHERE is_active = TRUE ORDER BY name'
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Error fetching active acquirers:', error.message);
    return [];
  }
};

/**
 * Update acquirer credentials
 */
const updateAcquirerCredentials = async (code, credentials) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `UPDATE acquirers 
       SET credentials = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE code = $1 
       RETURNING *`,
      [code.toUpperCase(), JSON.stringify(credentials)]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error(`Error updating acquirer credentials for ${code}:`, error.message);
    throw error;
  }
};

/**
 * Toggle acquirer active status
 */
const toggleAcquirerStatus = async (code, isActive) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `UPDATE acquirers 
       SET is_active = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE code = $1 
       RETURNING *`,
      [code.toUpperCase(), isActive]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error(`Error toggling acquirer status for ${code}:`, error.message);
    throw error;
  }
};

module.exports = {
  createAcquirerTable,
  getAcquirerByCode,
  getAllActiveAcquirers,
  updateAcquirerCredentials,
  toggleAcquirerStatus
};
