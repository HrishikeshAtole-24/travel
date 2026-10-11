/**
 * Payment Model (PostgreSQL Schema)
 * Handles payment transactions for flight bookings
 */
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');
const { generateReference } = require('../utils/security');

const createPaymentTable = async () => {
  const pool = getPool();
  const query = `
    -- Create payment status enum type
    DO $$ BEGIN
      CREATE TYPE payment_status AS ENUM (
        'CREATED',
        'PENDING',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
        'PARTIAL_REFUND'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Create payment method enum type
    DO $$ BEGIN
      CREATE TYPE payment_method AS ENUM (
        'CARD',
        'UPI',
        'NET_BANKING',
        'WALLET',
        'EMI'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Create acquirer enum type
    DO $$ BEGIN
      CREATE TYPE payment_acquirer AS ENUM (
        'STRIPE',
        'RAZORPAY'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      
      -- Reference IDs
      payment_reference VARCHAR(100) UNIQUE NOT NULL,
      booking_id INTEGER NOT NULL,
      user_id INTEGER,
      
      -- Amount details
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'INR',
      
      -- Acquirer details
      acquirer payment_acquirer NOT NULL,
      acquirer_order_id VARCHAR(255),
      acquirer_payment_id VARCHAR(255),
      acquirer_transaction_id VARCHAR(255),
      
      -- Payment details
      payment_method payment_method,
      status payment_status DEFAULT 'CREATED',
      
      -- Customer details
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(20),
      customer_name VARCHAR(255),
      
      -- Fees and charges
      gateway_fees DECIMAL(10, 2) DEFAULT 0,
      gst_amount DECIMAL(10, 2) DEFAULT 0,
      net_amount DECIMAL(10, 2),
      
      -- Refund details
      refunded_amount DECIMAL(10, 2) DEFAULT 0,
      refund_reference VARCHAR(100),
      
      -- Response data
      success_url TEXT,
      failure_url TEXT,
      callback_url TEXT,
      
      -- Metadata
      payment_link TEXT,
      description TEXT,
      ip_address VARCHAR(50),
      user_agent TEXT,
      
      -- JSON fields for additional data
      acquirer_response JSONB,
      payment_details JSONB,
      webhook_data JSONB,
      metadata JSONB,
      
      -- Timestamps
      initiated_at TIMESTAMP,
      completed_at TIMESTAMP,
      failed_at TIMESTAMP,
      refunded_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      -- Foreign key constraints
      CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(payment_reference);
    CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_acquirer ON payments(acquirer);
    CREATE INDEX IF NOT EXISTS idx_payments_acquirer_order_id ON payments(acquirer_order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
    
    -- Create trigger for updated_at timestamp
    DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    logger.info('✅ Payments table created/verified successfully');
  } catch (error) {
    logger.error('❌ Error creating payments table:', error.message);
    throw error;
  }
};

/**
 * Allow payments to belong to either a flight booking (booking_id)
 * or a hotel booking (hotel_booking_id). Must run after hotel_bookings exists.
 */
const addHotelPaymentSupport = async () => {
  const pool = getPool();
  const query = `
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS hotel_booking_id INTEGER;
    ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;

    DO $$ BEGIN
      ALTER TABLE payments ADD CONSTRAINT fk_hotel_booking
        FOREIGN KEY (hotel_booking_id) REFERENCES hotel_bookings(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Every payment belongs to exactly one booking
    DO $$ BEGIN
      ALTER TABLE payments ADD CONSTRAINT chk_payment_single_booking
        CHECK ((booking_id IS NULL) <> (hotel_booking_id IS NULL));
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_payments_hotel_booking_id ON payments(hotel_booking_id);
  `;

  try {
    await pool.query(query);
    logger.info('✅ Payments table hotel support verified');
  } catch (error) {
    logger.error('❌ Error adding hotel support to payments table:', error.message);
    throw error;
  }
};

/**
 * Create a new payment record
 */
const createPayment = async (paymentData) => {
  const pool = getPool();
  const {
    bookingId,
    bookingType = 'flight',
    userId,
    amount,
    currency = 'INR',
    acquirer,
    customerEmail,
    customerPhone,
    customerName,
    successUrl,
    failureUrl,
    callbackUrl,
    description,
    ipAddress,
    userAgent,
    metadata = {}
  } = paymentData;

  const paymentReference = generatePaymentReference();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const query = `
    INSERT INTO payments (
      payment_reference, booking_id, hotel_booking_id, user_id, amount, currency, acquirer,
      customer_email, customer_phone, customer_name,
      success_url, failure_url, callback_url,
      description, ip_address, user_agent, metadata, expires_at,
      status, initiated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *;
  `;

  const values = [
    paymentReference,
    bookingType === 'hotel' ? null : bookingId,
    bookingType === 'hotel' ? bookingId : null,
    userId, amount, currency, acquirer,
    customerEmail, customerPhone, customerName,
    successUrl, failureUrl, callbackUrl,
    description, ipAddress, userAgent, JSON.stringify(metadata), expiresAt,
    'CREATED', new Date()
  ];

  try {
    const result = await pool.query(query, values);
    logger.info(`Payment created: ${paymentReference}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating payment:', error.message);
    throw error;
  }
};

/**
 * Map acquirer payment method names (e.g. Razorpay 'netbanking') to the payment_method enum.
 * Returns null for unknown methods so the enum column never rejects the update.
 */
const PAYMENT_METHOD_MAP = {
  card: 'CARD',
  upi: 'UPI',
  netbanking: 'NET_BANKING',
  net_banking: 'NET_BANKING',
  wallet: 'WALLET',
  emi: 'EMI'
};

function normalizePaymentMethod(method) {
  if (!method) return null;
  return PAYMENT_METHOD_MAP[String(method).toLowerCase()] || null;
}

/**
 * Update payment status
 */
const updatePaymentStatus = async (paymentReference, updateData) => {
  const pool = getPool();
  const {
    status,
    acquirerOrderId,
    acquirerPaymentId,
    acquirerTransactionId,
    paymentMethod,
    acquirerResponse,
    paymentDetails,
    gatewayFees,
    gstAmount,
    netAmount,
    refundedAmount,
    refundReference,
    webhookData
  } = updateData;

  const setClauses = [];
  const values = [];
  let paramCount = 1;

  if (status) {
    setClauses.push(`status = $${paramCount++}`);
    values.push(status);

    // Set timestamp based on status
    if (status === 'SUCCESS') {
      setClauses.push(`completed_at = $${paramCount++}`);
      values.push(new Date());
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      setClauses.push(`failed_at = $${paramCount++}`);
      values.push(new Date());
    } else if (status === 'REFUNDED' || status === 'PARTIAL_REFUND') {
      setClauses.push(`refunded_at = $${paramCount++}`);
      values.push(new Date());
    }
  }

  if (acquirerOrderId) {
    setClauses.push(`acquirer_order_id = $${paramCount++}`);
    values.push(acquirerOrderId);
  }

  if (acquirerPaymentId) {
    setClauses.push(`acquirer_payment_id = $${paramCount++}`);
    values.push(acquirerPaymentId);
  }

  if (acquirerTransactionId) {
    setClauses.push(`acquirer_transaction_id = $${paramCount++}`);
    values.push(acquirerTransactionId);
  }

  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  if (normalizedMethod) {
    setClauses.push(`payment_method = $${paramCount++}`);
    values.push(normalizedMethod);
  }

  if (acquirerResponse) {
    setClauses.push(`acquirer_response = $${paramCount++}`);
    values.push(JSON.stringify(acquirerResponse));
  }

  if (paymentDetails) {
    setClauses.push(`payment_details = $${paramCount++}`);
    values.push(JSON.stringify(paymentDetails));
  }

  if (gatewayFees !== undefined) {
    setClauses.push(`gateway_fees = $${paramCount++}`);
    values.push(gatewayFees);
  }

  if (gstAmount !== undefined) {
    setClauses.push(`gst_amount = $${paramCount++}`);
    values.push(gstAmount);
  }

  if (netAmount !== undefined) {
    setClauses.push(`net_amount = $${paramCount++}`);
    values.push(netAmount);
  }

  if (refundedAmount !== undefined) {
    setClauses.push(`refunded_amount = $${paramCount++}`);
    values.push(refundedAmount);
  }

  if (refundReference) {
    setClauses.push(`refund_reference = $${paramCount++}`);
    values.push(refundReference);
  }

  if (webhookData) {
    setClauses.push(`webhook_data = $${paramCount++}`);
    values.push(JSON.stringify(webhookData));
  }

  if (setClauses.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(paymentReference);
  const query = `
    UPDATE payments
    SET ${setClauses.join(', ')}
    WHERE payment_reference = $${paramCount}
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Payment not found: ${paymentReference}`);
    }
    logger.info(`Payment updated: ${paymentReference} - Status: ${status}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating payment:', error.message);
    throw error;
  }
};

/**
 * Get payment by reference
 */
const getPaymentByReference = async (paymentReference) => {
  const pool = getPool();
  const query = `SELECT * FROM payments WHERE payment_reference = $1;`;

  try {
    const result = await pool.query(query, [paymentReference]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error fetching payment:', error.message);
    throw error;
  }
};

/**
 * Get payment by booking ID
 */
const getPaymentByBookingId = async (bookingId) => {
  const pool = getPool();
  const query = `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1;`;

  try {
    const result = await pool.query(query, [bookingId]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error fetching payment by booking:', error.message);
    throw error;
  }
};

/**
 * Get all payments for a booking (newest first)
 * @param {number} bookingId
 * @param {'flight'|'hotel'} bookingType
 */
const getPaymentsByBookingId = async (bookingId, bookingType = 'flight') => {
  const pool = getPool();
  const column = bookingType === 'hotel' ? 'hotel_booking_id' : 'booking_id';
  const query = `SELECT * FROM payments WHERE ${column} = $1 ORDER BY created_at DESC;`;

  try {
    const result = await pool.query(query, [bookingId]);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching payments by booking:', error.message);
    throw error;
  }
};

/**
 * Get payments by user ID
 */
const getPaymentsByUserId = async (userId, options = {}) => {
  const pool = getPool();
  let query = `SELECT * FROM payments WHERE user_id = $1`;
  const values = [userId];

  if (options.status) {
    query += ` AND status = $2`;
    values.push(options.status);
  }

  query += ` ORDER BY created_at DESC`;

  if (options.limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(options.limit);
  }

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching user payments:', error.message);
    throw error;
  }
};

/**
 * Generate unique, unguessable payment reference
 * Format: PAY-YYYYMMDD-XXXXXXXXXX (e.g., PAY-20251211-7KQ4M9XA2C)
 */
function generatePaymentReference() {
  return generateReference('PAY');
}

module.exports = {
  createPaymentTable,
  addHotelPaymentSupport,
  createPayment,
  updatePaymentStatus,
  getPaymentByReference,
  getPaymentByBookingId,
  getPaymentsByBookingId,
  getPaymentsByUserId,
  normalizePaymentMethod
};
