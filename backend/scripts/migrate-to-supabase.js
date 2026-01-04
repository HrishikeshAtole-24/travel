/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEON DB → SUPABASE MIGRATION SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Migrates all data from Neon DB to Supabase (EXCEPT airports)
 * - Users
 * - Bookings
 * - Travelers
 * - Payments
 * - Acquirers
 * - Standard Statuses
 * 
 * Usage: node scripts/migrate-to-supabase.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require('pg');

// ═══════════════════════════════════════════════════════════════
// DATABASE CONNECTIONS
// ═══════════════════════════════════════════════════════════════

// Source: Neon DB
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DPpTY3JEC9zx@ep-spring-recipe-ah71u1rn-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

// Target: Supabase
const supabasePool = new Pool({
  host: 'db.bbaxhfbntnfkpiqlnqiy.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Hrishikesh@$%2406',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

// ═══════════════════════════════════════════════════════════════
// TABLE CREATION QUERIES (in dependency order)
// ═══════════════════════════════════════════════════════════════

const CREATE_TABLES = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Airports table (structure only, data imported separately)
CREATE TABLE IF NOT EXISTS airports (
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

-- Acquirers table (payment gateways)
CREATE TABLE IF NOT EXISTS acquirers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Standard payment statuses
CREATE TABLE IF NOT EXISTS standard_payment_statuses (
  id SERIAL PRIMARY KEY,
  status_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Acquirer status mappings
CREATE TABLE IF NOT EXISTS acquirer_status_mappings (
  id SERIAL PRIMARY KEY,
  acquirer_id INTEGER REFERENCES acquirers(id),
  acquirer_status VARCHAR(100) NOT NULL,
  standard_status_id INTEGER REFERENCES standard_payment_statuses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(acquirer_id, acquirer_status)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  booking_reference VARCHAR(50) UNIQUE NOT NULL,
  pnr VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  flight_offer_id TEXT,
  flight_details JSONB,
  total_amount DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Travelers table
CREATE TABLE IF NOT EXISTS travelers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_type VARCHAR(20) NOT NULL,
  title VARCHAR(10),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(10),
  email VARCHAR(255),
  phone VARCHAR(20),
  document_type VARCHAR(50),
  document_number VARCHAR(50),
  document_expiry DATE,
  nationality VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  acquirer_id INTEGER REFERENCES acquirers(id),
  payment_reference VARCHAR(100) UNIQUE,
  acquirer_reference VARCHAR(100),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'initiated',
  standard_status_id INTEGER REFERENCES standard_payment_statuses(id),
  payment_method VARCHAR(50),
  acquirer_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_travelers_booking_id ON travelers(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_priority ON airports(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country_code);
`;

// ═══════════════════════════════════════════════════════════════
// MIGRATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getTableData(pool, tableName) {
  try {
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    return result.rows;
  } catch (error) {
    console.log(`   ⚠️ Table ${tableName} doesn't exist or error: ${error.message}`);
    return [];
  }
}

async function insertData(pool, tableName, rows, columns) {
  if (rows.length === 0) {
    console.log(`   ⏭️ No data in ${tableName}`);
    return 0;
  }
  
  let inserted = 0;
  
  for (const row of rows) {
    try {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnNames = columns.join(', ');
      
      await pool.query(`
        INSERT INTO ${tableName} (${columnNames})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `, values);
      
      inserted++;
    } catch (error) {
      console.log(`   ⚠️ Error inserting into ${tableName}: ${error.message}`);
    }
  }
  
  return inserted;
}

async function migrateTable(neon, supabase, tableName, columns) {
  console.log(`\n📦 Migrating ${tableName}...`);
  
  // Get data from Neon
  const data = await getTableData(neon, tableName);
  console.log(`   📊 Found ${data.length} rows in Neon DB`);
  
  if (data.length === 0) return { table: tableName, count: 0 };
  
  // Insert into Supabase
  const inserted = await insertData(supabase, tableName, data, columns);
  console.log(`   ✅ Inserted ${inserted} rows into Supabase`);
  
  return { table: tableName, count: inserted };
}

async function resetSequences(pool, tableName) {
  try {
    await pool.query(`
      SELECT setval(
        pg_get_serial_sequence('${tableName}', 'id'),
        COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1,
        false
      )
    `);
  } catch (error) {
    // Sequence might not exist
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN MIGRATION
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 NEON DB → SUPABASE MIGRATION');
  console.log('  (Excluding airports - will be imported separately)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Test connections
    console.log('🔌 STEP 1: Testing connections...\n');
    
    console.log('   Testing Neon DB...');
    const neonClient = await neonPool.connect();
    const neonTest = await neonClient.query('SELECT NOW()');
    console.log('   ✅ Neon DB connected');
    neonClient.release();
    
    console.log('   Testing Supabase...');
    const supabaseClient = await supabasePool.connect();
    const supabaseTest = await supabaseClient.query('SELECT NOW()');
    console.log('   ✅ Supabase connected');
    supabaseClient.release();
    
    // Step 2: Create tables in Supabase
    console.log('\n📋 STEP 2: Creating tables in Supabase...\n');
    await supabasePool.query(CREATE_TABLES);
    console.log('   ✅ All tables created');
    
    // Step 3: Get Neon data summary
    console.log('\n📊 STEP 3: Checking Neon DB data...\n');
    
    const tables = ['users', 'acquirers', 'standard_payment_statuses', 'bookings', 'travelers', 'payments'];
    
    for (const table of tables) {
      try {
        const count = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   • ${table}: ${count.rows[0].count} rows`);
      } catch (e) {
        console.log(`   • ${table}: (table not found)`);
      }
    }
    
    // Step 4: Migrate data (in order of dependencies)
    console.log('\n📤 STEP 4: Migrating data...');
    
    const results = [];
    
    // Users
    results.push(await migrateTable(neonPool, supabasePool, 'users', 
      ['id', 'email', 'password', 'first_name', 'last_name', 'phone', 'created_at', 'updated_at']
    ));
    
    // Acquirers
    results.push(await migrateTable(neonPool, supabasePool, 'acquirers',
      ['id', 'name', 'display_name', 'is_active', 'config', 'created_at', 'updated_at']
    ));
    
    // Standard Payment Statuses
    results.push(await migrateTable(neonPool, supabasePool, 'standard_payment_statuses',
      ['id', 'status_code', 'display_name', 'description', 'is_final', 'created_at']
    ));
    
    // Acquirer Status Mappings
    results.push(await migrateTable(neonPool, supabasePool, 'acquirer_status_mappings',
      ['id', 'acquirer_id', 'acquirer_status', 'standard_status_id', 'created_at']
    ));
    
    // Bookings
    results.push(await migrateTable(neonPool, supabasePool, 'bookings',
      ['id', 'user_id', 'booking_reference', 'pnr', 'status', 'payment_status', 
       'flight_offer_id', 'flight_details', 'total_amount', 'currency', 
       'contact_email', 'contact_phone', 'special_requests', 'created_at', 'updated_at']
    ));
    
    // Travelers
    results.push(await migrateTable(neonPool, supabasePool, 'travelers',
      ['id', 'booking_id', 'traveler_type', 'title', 'first_name', 'last_name',
       'date_of_birth', 'gender', 'email', 'phone', 'document_type', 
       'document_number', 'document_expiry', 'nationality', 'created_at']
    ));
    
    // Payments
    results.push(await migrateTable(neonPool, supabasePool, 'payments',
      ['id', 'booking_id', 'acquirer_id', 'payment_reference', 'acquirer_reference',
       'amount', 'currency', 'status', 'standard_status_id', 'payment_method',
       'acquirer_response', 'created_at', 'updated_at']
    ));
    
    // Step 5: Reset sequences
    console.log('\n🔄 STEP 5: Resetting sequences...');
    for (const table of tables) {
      await resetSequences(supabasePool, table);
    }
    console.log('   ✅ Sequences reset');
    
    // Step 6: Verify migration
    console.log('\n✅ STEP 6: Verifying migration...\n');
    
    for (const table of tables) {
      try {
        const count = await supabasePool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   • ${table}: ${count.rows[0].count} rows`);
      } catch (e) {
        console.log(`   • ${table}: error`);
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n  Summary:');
    results.forEach(r => {
      console.log(`   • ${r.table}: ${r.count} rows migrated`);
    });
    console.log('\n  Next steps:');
    console.log('   1. Update .env with Supabase DATABASE_URL');
    console.log('   2. Test your APIs');
    console.log('   3. Run airport import script');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    await neonPool.end();
    await supabasePool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await neonPool.end().catch(() => {});
    await supabasePool.end().catch(() => {});
    process.exit(1);
  }
}

main();
