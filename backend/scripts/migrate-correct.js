/**
 * CORRECT MIGRATION - Based on actual Neon schema
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DPpTY3JEC9zx@ep-spring-recipe-ah71u1rn-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

const supabasePool = new Pool({
  host: 'db.bbaxhfbntnfkpiqlnqiy.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Hrishikesh@$%2406',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

async function run() {
  console.log('Starting migration based on actual Neon schema...\n');
  
  try {
    // Step 1: Clean Supabase
    console.log('STEP 1: Cleaning Supabase...');
    await supabasePool.query(`
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS travelers CASCADE;
      DROP TABLE IF EXISTS bookings CASCADE;
      DROP TABLE IF EXISTS acquirer_status_mapping CASCADE;
      DROP TABLE IF EXISTS standard_status_codes CASCADE;
      DROP TABLE IF EXISTS acquirers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS airports CASCADE;
      DROP TYPE IF EXISTS user_status CASCADE;
      DROP TYPE IF EXISTS booking_status CASCADE;
      DROP TYPE IF EXISTS gender_type CASCADE;
      DROP TYPE IF EXISTS traveler_type CASCADE;
      DROP TYPE IF EXISTS payment_status CASCADE;
      DROP TYPE IF EXISTS payment_method CASCADE;
      DROP TYPE IF EXISTS acquirer_type CASCADE;
    `);
    console.log('Done!\n');
    
    // Step 2: Get actual ENUMs from Neon
    console.log('STEP 2: Getting ENUMs from Neon...');
    const enumsResult = await neonPool.query(`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);
    
    const enumMap = {};
    for (const row of enumsResult.rows) {
      if (!enumMap[row.enum_name]) enumMap[row.enum_name] = [];
      enumMap[row.enum_name].push(row.enum_value);
    }
    
    for (const [enumName, enumValues] of Object.entries(enumMap)) {
      const values = enumValues.map(v => `'${v}'`).join(', ');
      try {
        await supabasePool.query(`DROP TYPE IF EXISTS ${enumName} CASCADE`);
        await supabasePool.query(`CREATE TYPE ${enumName} AS ENUM (${values})`);
        console.log(`  Created: ${enumName} (${enumValues.join(', ')})`);
      } catch (e) {
        console.log(`  ⚠️ ${enumName}: ${e.message}`);
      }
    }
    console.log('Done!\n');
    
    // Step 3: Create tables with EXACT Neon schema
    console.log('STEP 3: Creating tables with exact Neon schema...\n');
    
    // Users table (exact from Neon)
    await supabasePool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        password VARCHAR(255),
        email_verified BOOLEAN DEFAULT false,
        phone_verified BOOLEAN DEFAULT false,
        email_otp VARCHAR(255),
        phone_otp VARCHAR(255),
        otp_expires_at TIMESTAMP,
        status user_status DEFAULT 'active',
        last_login TIMESTAMP
      )
    `);
    console.log('  ✅ Created users table');
    
    // Acquirers table (exact from Neon)
    await supabasePool.query(`
      CREATE TABLE acquirers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255),
        base_currency VARCHAR(255),
        allowed_currencies JSONB,
        credentials JSONB,
        config JSONB,
        is_active BOOLEAN DEFAULT true,
        setup_cost NUMERIC(10,2),
        transaction_fee_percent NUMERIC(5,2),
        transaction_fee_fixed NUMERIC(10,2),
        refund_fees NUMERIC(10,2),
        chargeback_fees NUMERIC(10,2),
        settlement_cycle_days INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Created acquirers table');
    
    // Bookings table (exact from Neon)
    await supabasePool.query(`
      CREATE TABLE bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        flight_id VARCHAR(255),
        booking_reference VARCHAR(255),
        total_price NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'INR',
        status booking_status DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        flight_data JSONB,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255),
        special_requests TEXT,
        pnr VARCHAR(255),
        ticket_number VARCHAR(255)
      )
    `);
    console.log('  ✅ Created bookings table');
    
    // Travelers table (exact from Neon)
    await supabasePool.query(`
      CREATE TABLE travelers (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        date_of_birth DATE,
        gender gender_type,
        passport_number VARCHAR(255),
        passport_expiry DATE,
        nationality VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        traveler_type traveler_type_enum DEFAULT 'ADULT',
        title VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(255)
      )
    `);
    console.log('  ✅ Created travelers table');
    
    // Payments table (exact from Neon)
    await supabasePool.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        payment_reference VARCHAR(255),
        booking_id INTEGER REFERENCES bookings(id),
        user_id INTEGER REFERENCES users(id),
        amount NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        acquirer payment_acquirer,
        acquirer_order_id VARCHAR(255),
        acquirer_payment_id VARCHAR(255),
        acquirer_transaction_id VARCHAR(255),
        payment_method payment_method,
        status payment_status DEFAULT 'CREATED',
        customer_email VARCHAR(255),
        customer_phone VARCHAR(255),
        customer_name VARCHAR(255),
        gateway_fees NUMERIC(10,2),
        gst_amount NUMERIC(10,2),
        net_amount NUMERIC(12,2),
        refunded_amount NUMERIC(12,2),
        refund_reference VARCHAR(255),
        success_url TEXT,
        failure_url TEXT,
        callback_url TEXT,
        payment_link TEXT,
        description TEXT,
        ip_address VARCHAR(255),
        user_agent TEXT,
        acquirer_response JSONB,
        payment_details JSONB,
        webhook_data JSONB,
        metadata JSONB,
        initiated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        failed_at TIMESTAMP,
        refunded_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Created payments table');
    
    console.log('\nDone creating tables!\n');
    
    // Step 4: Migrate data using SELECT *
    console.log('STEP 4: Migrating data...\n');
    
    // Users
    const users = await neonPool.query('SELECT * FROM users');
    console.log(`Migrating ${users.rows.length} users...`);
    for (const u of users.rows) {
      const cols = Object.keys(u);
      const vals = Object.values(u);
      const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
      await supabasePool.query(`INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
    }
    await supabasePool.query(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)`);
    console.log('  ✅ Done!\n');
    
    // Acquirers
    const acquirers = await neonPool.query('SELECT * FROM acquirers');
    console.log(`Migrating ${acquirers.rows.length} acquirers...`);
    for (const a of acquirers.rows) {
      try {
        // Convert JSONB fields to proper JSON strings for insert
        const cols = Object.keys(a);
        const vals = cols.map(col => {
          const val = a[col];
          // If it's an object or array, stringify it for JSONB columns
          if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
          }
          return val;
        });
        const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
        await supabasePool.query(`INSERT INTO acquirers (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
      } catch (e) {
        console.log(`  ⚠️ Acquirer ${a.id}: ${e.message.substring(0, 60)}`);
      }
    }
    await supabasePool.query(`SELECT setval('acquirers_id_seq', COALESCE((SELECT MAX(id) FROM acquirers), 0) + 1, false)`);
    console.log('  ✅ Done!\n');
    
    // Bookings
    const bookings = await neonPool.query('SELECT * FROM bookings');
    console.log(`Migrating ${bookings.rows.length} bookings...`);
    let bookingSuccess = 0;
    for (const b of bookings.rows) {
      try {
        const cols = Object.keys(b);
        const vals = cols.map(col => {
          const val = b[col];
          if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
          }
          return val;
        });
        const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
        await supabasePool.query(`INSERT INTO bookings (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
        bookingSuccess++;
      } catch (e) {
        console.log(`  ⚠️ Booking ${b.id}: ${e.message.substring(0, 60)}`);
      }
    }
    await supabasePool.query(`SELECT setval('bookings_id_seq', COALESCE((SELECT MAX(id) FROM bookings), 0) + 1, false)`);
    console.log(`  ✅ Done! (${bookingSuccess}/${bookings.rows.length})\n`);
    
    // Travelers
    const travelers = await neonPool.query('SELECT * FROM travelers');
    console.log(`Migrating ${travelers.rows.length} travelers...`);
    let travelerSuccess = 0;
    for (const t of travelers.rows) {
      try {
        const cols = Object.keys(t);
        const vals = Object.values(t);
        const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
        await supabasePool.query(`INSERT INTO travelers (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
        travelerSuccess++;
      } catch (e) {
        console.log(`  ⚠️ Traveler ${t.id}: ${e.message.substring(0, 60)}`);
      }
    }
    await supabasePool.query(`SELECT setval('travelers_id_seq', COALESCE((SELECT MAX(id) FROM travelers), 0) + 1, false)`);
    console.log(`  ✅ Done! (${travelerSuccess}/${travelers.rows.length})\n`);
    
    // Payments
    const payments = await neonPool.query('SELECT * FROM payments');
    console.log(`Migrating ${payments.rows.length} payments...`);
    let paymentSuccess = 0;
    for (const p of payments.rows) {
      try {
        const cols = Object.keys(p);
        const vals = cols.map(col => {
          const val = p[col];
          if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
          }
          return val;
        });
        const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
        await supabasePool.query(`INSERT INTO payments (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
        paymentSuccess++;
      } catch (e) {
        console.log(`  ⚠️ Payment ${p.id}: ${e.message.substring(0, 60)}`);
      }
    }
    await supabasePool.query(`SELECT setval('payments_id_seq', COALESCE((SELECT MAX(id) FROM payments), 0) + 1, false)`);
    console.log(`  ✅ Done! (${paymentSuccess}/${payments.rows.length})\n`);
    
    // Step 5: Verify
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const tables = ['users', 'acquirers', 'bookings', 'travelers', 'payments'];
    for (const t of tables) {
      const nc = await neonPool.query(`SELECT COUNT(*) FROM ${t}`);
      const sc = await supabasePool.query(`SELECT COUNT(*) FROM ${t}`);
      const match = nc.rows[0].count === sc.rows[0].count;
      console.log(`  ${match ? '✅' : '⚠️'} ${t.padEnd(12)} Neon: ${nc.rows[0].count.toString().padStart(3)}  |  Supabase: ${sc.rows[0].count.toString().padStart(3)}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('  1. Test backend server with Supabase');
    console.log('  2. Run airport import script');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
  
  await neonPool.end();
  await supabasePool.end();
}

run();
