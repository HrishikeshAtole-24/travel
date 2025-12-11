/**
 * User Model (PostgreSQL Schema)
 * Handles user table creation and operations
 */
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createUserTable = async () => {
  const pool = getPool();
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create index on email for faster lookups
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Create trigger for updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    logger.info('✅ Users table created/verified successfully');
  } catch (error) {
    logger.error('❌ Error creating users table:', error.message);
    throw error;
  }
};

module.exports = { createUserTable };
