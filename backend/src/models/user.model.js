/**
 * User Model (PostgreSQL Schema)
 * Handles user table creation and operations
 */
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createUserTable = async () => {
  const pool = getPool();
  
  // First, check if table exists and has the old schema
  const checkTableQuery = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name IN ('status', 'user_status');
  `;
  
  try {
    const checkResult = await pool.query(checkTableQuery);
    const hasStatusColumn = checkResult.rows.some(row => row.column_name === 'status' || row.column_name === 'user_status');
    
    // If table exists but doesn't have status column, we need to alter it
    if (!hasStatusColumn) {
      logger.info('📝 Updating users table schema with authentication fields...');
      
      // Create enum type first
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      // Add new columns if they don't exist
      await pool.query(`
        DO $$ 
        BEGIN
          -- Add phone column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
            ALTER TABLE users ADD COLUMN phone VARCHAR(20);
          END IF;
          
          -- Add password_hash column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
            ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
          END IF;
          
          -- Add verification columns
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
            ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_verified') THEN
            ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_otp') THEN
            ALTER TABLE users ADD COLUMN email_otp VARCHAR(10);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_otp') THEN
            ALTER TABLE users ADD COLUMN phone_otp VARCHAR(10);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='otp_expires_at') THEN
            ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMP;
          END IF;
          
          -- Add status column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
            ALTER TABLE users ADD COLUMN status user_status DEFAULT 'active';
          END IF;
          
          -- Add last_login column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login') THEN
            ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
          END IF;
        END $$;
      `);
      
      // Add UNIQUE constraints if they don't exist
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_key') THEN
            ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
          END IF;
        EXCEPTION
          WHEN others THEN null;
        END $$;
      `);
      
      logger.info('✅ Users table schema updated successfully');
    }
  } catch (error) {
    // If error is because table doesn't exist, create it fresh
    logger.info('📝 Creating users table...');
  }
  
  // Now create or verify the full table
  const query = `
    -- Create user_status enum
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      
      -- Authentication
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      
      -- Profile
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      
      -- Verification
      email_verified BOOLEAN DEFAULT false,
      phone_verified BOOLEAN DEFAULT false,
      email_otp VARCHAR(10),
      phone_otp VARCHAR(10),
      otp_expires_at TIMESTAMP,
      
      -- Status
      status user_status DEFAULT 'active',
      
      -- Timestamps
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

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
