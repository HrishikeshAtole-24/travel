/**
 * Traveler Model (PostgreSQL Schema)
 * Handles travelers table creation and operations
 */
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createTravelerTable = async () => {
  const pool = getPool();
  const query = `
    -- Create gender enum type
    DO $$ BEGIN
      CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Create traveler type enum
    DO $$ BEGIN
      CREATE TYPE traveler_type_enum AS ENUM ('ADULT', 'CHILD', 'INFANT');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS travelers (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL,
      traveler_type traveler_type_enum DEFAULT 'ADULT',
      title VARCHAR(10),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE,
      gender gender_type,
      passport_number VARCHAR(50),
      passport_expiry DATE,
      nationality VARCHAR(3),
      email VARCHAR(255),
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    -- Create index for faster booking lookups
    CREATE INDEX IF NOT EXISTS idx_travelers_booking_id ON travelers(booking_id);
    CREATE INDEX IF NOT EXISTS idx_travelers_passport ON travelers(passport_number);
  `;
  
  try {
    await pool.query(query);
    logger.info('✅ Travelers table created/verified successfully');
  } catch (error) {
    logger.error('❌ Error creating travelers table:', error.message);
    throw error;
  }
};

module.exports = { createTravelerTable };
