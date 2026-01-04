/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIX SUPABASE SCHEMA - Match Neon DB exactly
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require('pg');

const supabasePool = new Pool({
  host: 'db.bbaxhfbntnfkpiqlnqiy.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Hrishikesh@$%2406',
  ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔧 FIXING SUPABASE SCHEMA');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Drop existing tables and recreate with exact Neon schema
    console.log('📋 Dropping and recreating tables with exact Neon schema...\n');
    
    await supabasePool.query(`
      -- Drop existing tables (in reverse dependency order)
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS travelers CASCADE;
      DROP TABLE IF EXISTS bookings CASCADE;
      DROP TABLE IF EXISTS acquirer_status_mappings CASCADE;
      DROP TABLE IF EXISTS standard_payment_statuses CASCADE;
      DROP TABLE IF EXISTS acquirers CASCADE;
      DROP TABLE IF EXISTS airports CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      
      -- Drop any custom types
      DROP TYPE IF EXISTS user_status CASCADE;
      DROP TYPE IF EXISTS booking_status CASCADE;
      DROP TYPE IF EXISTS gender_type CASCADE;
      DROP TYPE IF EXISTS traveler_type CASCADE;
      DROP TYPE IF EXISTS payment_status CASCADE;
      DROP TYPE IF EXISTS payment_method CASCADE;
      DROP TYPE IF EXISTS acquirer_type CASCADE;
    `);
    console.log('   ✅ Dropped existing tables');
    
    // Create ENUM types
    await supabasePool.query(`
      CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted');
      CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'failed');
      CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
      CREATE TYPE traveler_type AS ENUM ('adult', 'child', 'infant');
      CREATE TYPE payment_status AS ENUM ('pending', 'initiated', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded');
      CREATE TYPE payment_method AS ENUM ('card', 'upi', 'netbanking', 'wallet', 'emi', 'other');
      CREATE TYPE acquirer_type AS ENUM ('razorpay', 'paytm', 'phonepe', 'cashfree');
    `);
    console.log('   ✅ Created ENUM types');
    
    // Users table (exact Neon schema)
    await supabasePool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        email_verified BOOLEAN DEFAULT false,
        phone_verified BOOLEAN DEFAULT false,
        email_otp VARCHAR(10),
        phone_otp VARCHAR(10),
        otp_expires_at TIMESTAMP,
        status user_status DEFAULT 'active',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Created users table');
    
    // Airports table
    await supabasePool.query(`
      CREATE TABLE airports (
        id SERIAL PRIMARY KEY,
        iata_code VARCHAR(3) UNIQUE NOT NULL,
        icao_code VARCHAR(10),
        airport_name VARCHAR(255) NOT NULL,
        city_name VARCHAR(100) NOT NULL,
        country_name VARCHAR(100) NOT NULL,
        country_code VARCHAR(2) NOT NULL,
        timezone VARCHAR(50),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_major_airport BOOLEAN DEFAULT false,
        priority_score INTEGER DEFAULT 0,
        search_keywords TEXT,
        airport_type VARCHAR(50),
        has_scheduled_service BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_airports_iata ON airports(iata_code);
      CREATE INDEX idx_airports_priority ON airports(priority_score DESC);
      CREATE INDEX idx_airports_country ON airports(country_code);
    `);
    console.log('   ✅ Created airports table');
    
    // Bookings table (exact Neon schema)
    await supabasePool.query(`
      CREATE TABLE bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        flight_id VARCHAR(100),
        booking_reference VARCHAR(50) UNIQUE NOT NULL,
        total_price NUMERIC(12, 2),
        currency VARCHAR(3) DEFAULT 'INR',
        status booking_status DEFAULT 'pending',
        flight_data JSONB,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        special_requests TEXT,
        pnr VARCHAR(20),
        ticket_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_bookings_user_id ON bookings(user_id);
      CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
      CREATE INDEX idx_bookings_status ON bookings(status);
    `);
    console.log('   ✅ Created bookings table');
    
    // Travelers table (exact Neon schema)
    await supabasePool.query(`
      CREATE TABLE travelers (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        traveler_type traveler_type NOT NULL,
        title VARCHAR(10),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        gender gender_type,
        email VARCHAR(255),
        phone VARCHAR(20),
        passport_number VARCHAR(50),
        passport_expiry DATE,
        nationality VARCHAR(2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_travelers_booking_id ON travelers(booking_id);
    `);
    console.log('   ✅ Created travelers table');
    
    // Payments table (exact Neon schema)
    await supabasePool.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        payment_reference VARCHAR(100) UNIQUE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        acquirer acquirer_type,
        acquirer_order_id VARCHAR(100),
        acquirer_payment_id VARCHAR(100),
        acquirer_transaction_id VARCHAR(100),
        payment_method payment_method,
        status payment_status DEFAULT 'pending',
        customer_email VARCHAR(255),
        customer_phone VARCHAR(20),
        customer_name VARCHAR(200),
        gateway_fees NUMERIC(10, 2),
        gst_amount NUMERIC(10, 2),
        net_amount NUMERIC(12, 2),
        refunded_amount NUMERIC(12, 2) DEFAULT 0,
        refund_reference VARCHAR(100),
        success_url TEXT,
        failure_url TEXT,
        callback_url TEXT,
        payment_link TEXT,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        acquirer_response JSONB,
        payment_details JSONB,
        webhook_data JSONB,
        metadata JSONB,
        initiated_at TIMESTAMP,
        completed_at TIMESTAMP,
        failed_at TIMESTAMP,
        refunded_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_payments_booking_id ON payments(booking_id);
      CREATE INDEX idx_payments_user_id ON payments(user_id);
      CREATE INDEX idx_payments_reference ON payments(payment_reference);
      CREATE INDEX idx_payments_status ON payments(status);
    `);
    console.log('   ✅ Created payments table');
    
    // Acquirers table (for payment gateway config)
    await supabasePool.query(`
      CREATE TABLE acquirers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Created acquirers table');
    
    console.log('\n✅ Schema fixed successfully!');
    
    await supabasePool.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await supabasePool.end();
    process.exit(1);
  }
}

fixSchema();
