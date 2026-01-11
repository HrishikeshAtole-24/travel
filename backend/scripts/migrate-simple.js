/**
 * ROBUST MIGRATION - Step by step with full logging
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
  console.log('Starting migration...\n');
  
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
    
    // Step 2: Create ENUMs
    console.log('STEP 2: Creating ENUMs...');
    const enumsSQL = `
      CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
      CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'failed', 'processing', 'payment_pending', 'refunded');
      CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
      CREATE TYPE traveler_type AS ENUM ('adult', 'child', 'infant');
      CREATE TYPE payment_status AS ENUM ('initiated', 'pending', 'authorized', 'captured', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'expired');
      CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'net_banking', 'upi', 'wallet', 'emi', 'pay_later');
      CREATE TYPE acquirer_type AS ENUM ('razorpay', 'stripe', 'paypal', 'payu', 'cashfree');
    `;
    await supabasePool.query(enumsSQL);
    console.log('Done!\n');
    
    // Step 3: Get exact table definitions from Neon and create in Supabase
    console.log('STEP 3: Creating tables...\n');
    
    // Users table
    const usersColumns = await neonPool.query(`SELECT column_name, data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
    console.log('Users columns from Neon:');
    usersColumns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    
    await supabasePool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        avatar VARCHAR(500),
        status user_status DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  Created users table!\n');
    
    // Acquirers table
    const acquirersColumns = await neonPool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='acquirers' ORDER BY ordinal_position`);
    console.log('Acquirers columns from Neon:');
    acquirersColumns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    
    await supabasePool.query(`
      CREATE TABLE acquirers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        config JSONB,
        credentials JSONB,
        base_currency VARCHAR(10),
        allowed_currencies TEXT[],
        transaction_fee_percent DECIMAL(5,2),
        transaction_fee_fixed DECIMAL(10,2),
        setup_cost DECIMAL(10,2),
        refund_fees DECIMAL(10,2),
        chargeback_fees DECIMAL(10,2),
        settlement_cycle_days INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  Created acquirers table!\n');
    
    // Bookings table
    const bookingsColumns = await neonPool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='bookings' ORDER BY ordinal_position`);
    console.log('Bookings columns from Neon:');
    bookingsColumns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    
    await supabasePool.query(`
      CREATE TABLE bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        pnr VARCHAR(20) UNIQUE,
        booking_reference VARCHAR(50),
        flight_offer_id VARCHAR(100),
        flight_details JSONB,
        contact_info JSONB,
        total_price DECIMAL(12,2),
        currency VARCHAR(10) DEFAULT 'INR',
        status booking_status DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        source VARCHAR(50),
        dictionaries JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  Created bookings table!\n');
    
    // Travelers table
    const travelersColumns = await neonPool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='travelers' ORDER BY ordinal_position`);
    console.log('Travelers columns from Neon:');
    travelersColumns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    
    await supabasePool.query(`
      CREATE TABLE travelers (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        traveler_id VARCHAR(50),
        traveler_type traveler_type DEFAULT 'adult',
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        gender gender_type,
        email VARCHAR(255),
        phone VARCHAR(50),
        document_type VARCHAR(50),
        document_number VARCHAR(100),
        document_expiry DATE,
        document_nationality VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  Created travelers table!\n');
    
    // Payments table
    const paymentsColumns = await neonPool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='payments' ORDER BY ordinal_position`);
    console.log('Payments columns from Neon:');
    paymentsColumns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    
    await supabasePool.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        acquirer acquirer_type,
        payment_method payment_method,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status payment_status DEFAULT 'initiated',
        transaction_id VARCHAR(255),
        acquirer_reference VARCHAR(255),
        acquirer_response JSONB,
        error_code VARCHAR(100),
        error_message TEXT,
        initiated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        metadata JSONB
      )
    `);
    console.log('  Created payments table!\n');
    
    // Step 4: Migrate data
    console.log('STEP 4: Migrating data...\n');
    
    // Users
    const usersData = await neonPool.query('SELECT * FROM users');
    console.log(`Migrating ${usersData.rows.length} users...`);
    for (const u of usersData.rows) {
      await supabasePool.query(
        'INSERT INTO users (id, name, email, password, phone, avatar, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
        [u.id, u.name, u.email, u.password, u.phone, u.avatar, u.status, u.created_at, u.updated_at]
      );
    }
    await supabasePool.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id),0)+1 FROM users), false)`);
    console.log('  Done!\n');
    
    // Acquirers
    const acquirersData = await neonPool.query('SELECT * FROM acquirers');
    console.log(`Migrating ${acquirersData.rows.length} acquirers...`);
    for (const a of acquirersData.rows) {
      await supabasePool.query(
        `INSERT INTO acquirers (id, name, code, type, is_active, config, credentials, base_currency, allowed_currencies, 
         transaction_fee_percent, transaction_fee_fixed, setup_cost, refund_fees, chargeback_fees, settlement_cycle_days, 
         created_at, updated_at) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT DO NOTHING`,
        [a.id, a.name, a.code, a.type, a.is_active, a.config, a.credentials, a.base_currency, a.allowed_currencies,
         a.transaction_fee_percent, a.transaction_fee_fixed, a.setup_cost, a.refund_fees, a.chargeback_fees, 
         a.settlement_cycle_days, a.created_at, a.updated_at]
      );
    }
    await supabasePool.query(`SELECT setval('acquirers_id_seq', (SELECT COALESCE(MAX(id),0)+1 FROM acquirers), false)`);
    console.log('  Done!\n');
    
    // Bookings
    const bookingsData = await neonPool.query('SELECT * FROM bookings');
    console.log(`Migrating ${bookingsData.rows.length} bookings...`);
    for (const b of bookingsData.rows) {
      try {
        await supabasePool.query(
          `INSERT INTO bookings (id, user_id, pnr, booking_reference, flight_offer_id, flight_details, contact_info, 
           total_price, currency, status, payment_status, source, dictionaries, created_at, updated_at) 
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING`,
          [b.id, b.user_id, b.pnr, b.booking_reference, b.flight_offer_id, b.flight_details, b.contact_info,
           b.total_price, b.currency, b.status, b.payment_status, b.source, b.dictionaries, b.created_at, b.updated_at]
        );
      } catch (e) {
        console.log(`  Warning on booking ${b.id}: ${e.message.substring(0,50)}`);
      }
    }
    await supabasePool.query(`SELECT setval('bookings_id_seq', (SELECT COALESCE(MAX(id),0)+1 FROM bookings), false)`);
    console.log('  Done!\n');
    
    // Travelers
    const travelersData = await neonPool.query('SELECT * FROM travelers');
    console.log(`Migrating ${travelersData.rows.length} travelers...`);
    for (const t of travelersData.rows) {
      try {
        await supabasePool.query(
          `INSERT INTO travelers (id, booking_id, traveler_id, traveler_type, first_name, last_name, date_of_birth, 
           gender, email, phone, document_type, document_number, document_expiry, document_nationality, created_at) 
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING`,
          [t.id, t.booking_id, t.traveler_id, t.traveler_type, t.first_name, t.last_name, t.date_of_birth,
           t.gender, t.email, t.phone, t.document_type, t.document_number, t.document_expiry, t.document_nationality, t.created_at]
        );
      } catch (e) {
        console.log(`  Warning on traveler ${t.id}: ${e.message.substring(0,50)}`);
      }
    }
    await supabasePool.query(`SELECT setval('travelers_id_seq', (SELECT COALESCE(MAX(id),0)+1 FROM travelers), false)`);
    console.log('  Done!\n');
    
    // Payments
    const paymentsData = await neonPool.query('SELECT * FROM payments');
    console.log(`Migrating ${paymentsData.rows.length} payments...`);
    for (const p of paymentsData.rows) {
      try {
        await supabasePool.query(
          `INSERT INTO payments (id, booking_id, acquirer, payment_method, amount, currency, status, transaction_id, 
           acquirer_reference, acquirer_response, error_code, error_message, initiated_at, completed_at, metadata) 
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING`,
          [p.id, p.booking_id, p.acquirer, p.payment_method, p.amount, p.currency, p.status, p.transaction_id,
           p.acquirer_reference, p.acquirer_response, p.error_code, p.error_message, p.initiated_at, p.completed_at, p.metadata]
        );
      } catch (e) {
        console.log(`  Warning on payment ${p.id}: ${e.message.substring(0,50)}`);
      }
    }
    await supabasePool.query(`SELECT setval('payments_id_seq', (SELECT COALESCE(MAX(id),0)+1 FROM payments), false)`);
    console.log('  Done!\n');
    
    // Step 5: Verify
    console.log('STEP 5: Verification...\n');
    const tables = ['users', 'acquirers', 'bookings', 'travelers', 'payments'];
    for (const t of tables) {
      const nc = await neonPool.query(`SELECT COUNT(*) FROM ${t}`);
      const sc = await supabasePool.query(`SELECT COUNT(*) FROM ${t}`);
      const icon = nc.rows[0].count === sc.rows[0].count ? '✅' : '⚠️';
      console.log(`  ${icon} ${t}: Neon=${nc.rows[0].count}, Supabase=${sc.rows[0].count}`);
    }
    
    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('Next: Run airport import script');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
  
  await neonPool.end();
  await supabasePool.end();
}

run();
