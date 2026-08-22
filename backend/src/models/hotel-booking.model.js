/**
 * Hotel Booking Model (PostgreSQL Schema)
 * Handles hotel_bookings table creation and operations
 */
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createHotelBookingTable = async () => {
  const pool = getPool();
  const query = `
    -- Create hotel booking status enum type
    DO $$ BEGIN
      CREATE TYPE hotel_booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'payment_initiated', 'expired');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Add 'expired' to existing enum if not present
    DO $$ BEGIN
      ALTER TYPE hotel_booking_status ADD VALUE IF NOT EXISTS 'expired';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS hotel_bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      hotel_id VARCHAR(100),
      offer_id VARCHAR(255),
      booking_reference VARCHAR(50) UNIQUE NOT NULL,
      hotel_name VARCHAR(500),
      hotel_data JSONB,
      offer_data JSONB,
      check_in_date DATE,
      check_out_date DATE,
      room_quantity INTEGER DEFAULT 1,
      adults INTEGER DEFAULT 1,
      total_price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status hotel_booking_status DEFAULT 'pending',
      contact_email VARCHAR(255),
      contact_phone VARCHAR(20),
      special_requests TEXT,
      provider_confirmation_id VARCHAR(100),
      amadeus_order_id VARCHAR(100),
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_hotel_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create hotel_guests table for guest details
    CREATE TABLE IF NOT EXISTS hotel_guests (
      id SERIAL PRIMARY KEY,
      hotel_booking_id INTEGER NOT NULL,
      title VARCHAR(5),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_hotel_guest_booking FOREIGN KEY (hotel_booking_id) REFERENCES hotel_bookings(id) ON DELETE CASCADE
    );

    -- Create indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_hotel_bookings_user_id ON hotel_bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_hotel_bookings_reference ON hotel_bookings(booking_reference);
    CREATE INDEX IF NOT EXISTS idx_hotel_bookings_status ON hotel_bookings(status);
    CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel_id ON hotel_bookings(hotel_id);
    CREATE INDEX IF NOT EXISTS idx_hotel_bookings_expires_at ON hotel_bookings(expires_at);
    CREATE INDEX IF NOT EXISTS idx_hotel_bookings_check_in ON hotel_bookings(check_in_date);
    CREATE INDEX IF NOT EXISTS idx_hotel_guests_booking_id ON hotel_guests(hotel_booking_id);

    -- Create trigger for updated_at timestamp
    DROP TRIGGER IF EXISTS update_hotel_bookings_updated_at ON hotel_bookings;
    CREATE TRIGGER update_hotel_bookings_updated_at
      BEFORE UPDATE ON hotel_bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await pool.query(query);
    logger.info('✅ Hotel bookings & guests tables created/verified successfully');
  } catch (error) {
    logger.error('❌ Error creating hotel bookings table:', error.message);
    throw error;
  }
};

module.exports = { createHotelBookingTable };
