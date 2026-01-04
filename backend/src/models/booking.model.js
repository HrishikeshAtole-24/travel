/**
 * Booking Model (PostgreSQL Schema)
 * Handles bookings table creation and operations
 */
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createBookingTable = async () => {
  const pool = getPool();
  const query = `
    -- Create booking status enum type
    DO $$ BEGIN
      CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'payment_initiated');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      flight_id VARCHAR(100),
      booking_reference VARCHAR(50) UNIQUE NOT NULL,
      flight_data JSONB,
      total_price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status booking_status DEFAULT 'pending',
      contact_email VARCHAR(255),
      contact_phone VARCHAR(20),
      special_requests TEXT,
      pnr VARCHAR(20),
      ticket_number VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

    -- Create trigger for updated_at timestamp
    DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
    CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    logger.info('✅ Bookings table created/verified successfully');
  } catch (error) {
    logger.error('❌ Error creating bookings table:', error.message);
    throw error;
  }
};

module.exports = { createBookingTable };
