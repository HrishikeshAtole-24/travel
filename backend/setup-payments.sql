-- ═══════════════════════════════════════════════════════════════
-- 💳 PAYMENT SYSTEM DATABASE SETUP
-- ═══════════════════════════════════════════════════════════════
-- Run this script to set up the payment tables and enums
-- PostgreSQL 12+
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. CREATE ENUMS
-- ───────────────────────────────────────────────────────────────

-- Payment status enum
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

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'card',
    'netbanking',
    'upi',
    'wallet',
    'emi'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment acquirer enum
DO $$ BEGIN
  CREATE TYPE payment_acquirer AS ENUM (
    'RAZORPAY',
    'STRIPE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ───────────────────────────────────────────────────────────────
-- 2. CREATE PAYMENTS TABLE
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  
  -- Payment Identifiers
  payment_reference VARCHAR(50) UNIQUE NOT NULL,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Amount Details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Payment Status
  status payment_status NOT NULL DEFAULT 'CREATED',
  payment_method payment_method,
  
  -- Acquirer Information
  acquirer payment_acquirer NOT NULL,
  acquirer_order_id VARCHAR(100),
  acquirer_payment_id VARCHAR(100),
  acquirer_transaction_id VARCHAR(100),
  
  -- Financial Details
  fee DECIMAL(10, 2) DEFAULT 0.00,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  refunded_amount DECIMAL(10, 2) DEFAULT 0.00,
  refund_reference VARCHAR(100),
  
  -- Customer Information
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_name VARCHAR(255),
  
  -- URLs
  success_url TEXT,
  failure_url TEXT,
  callback_url TEXT,
  
  -- JSONB Fields for flexible data storage
  acquirer_response JSONB,
  payment_details JSONB,
  webhook_data JSONB,
  metadata JSONB,
  
  -- Tracking
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ───────────────────────────────────────────────────────────────
-- 3. CREATE INDEXES
-- ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_acquirer ON payments(acquirer);
CREATE INDEX IF NOT EXISTS idx_payments_acquirer_order ON payments(acquirer_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_acquirer_payment ON payments(acquirer_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments(expires_at) WHERE expires_at IS NOT NULL;

-- JSONB indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_metadata ON payments USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_payments_payment_details ON payments USING GIN(payment_details);

-- ───────────────────────────────────────────────────────────────
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ───────────────────────────────────────────────────────────────
-- 5. VERIFICATION QUERIES
-- ───────────────────────────────────────────────────────────────

-- Check if enums were created
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'payment_status'::regtype 
ORDER BY enumsortorder;

-- Check if table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'payments';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'payments';

-- Check constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'payments';

-- ═══════════════════════════════════════════════════════════════
-- ✅ SETUP COMPLETE
-- ═══════════════════════════════════════════════════════════════
-- 
-- Next Steps:
-- 1. Verify all objects were created successfully
-- 2. Configure payment gateway credentials in .env
-- 3. Test payment flow with test credentials
-- 
-- ═══════════════════════════════════════════════════════════════
