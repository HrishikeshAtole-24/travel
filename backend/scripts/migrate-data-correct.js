/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIGRATE DATA FROM NEON TO SUPABASE (Correct Schema)
 * ═══════════════════════════════════════════════════════════════════════════
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

async function migrateData() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📤 MIGRATING DATA FROM NEON TO SUPABASE');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // 1. Migrate Users
    console.log('📦 Migrating users...');
    const users = await neonPool.query('SELECT * FROM users');
    console.log(`   Found ${users.rows.length} users`);
    
    for (const user of users.rows) {
      await supabasePool.query(`
        INSERT INTO users (id, email, password, first_name, last_name, phone, 
          email_verified, phone_verified, email_otp, phone_otp, otp_expires_at,
          status, last_login, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING
      `, [
        user.id, user.email, user.password, user.first_name, user.last_name,
        user.phone, user.email_verified, user.phone_verified, user.email_otp,
        user.phone_otp, user.otp_expires_at, user.status, user.last_login,
        user.created_at, user.updated_at
      ]);
    }
    console.log(`   ✅ Migrated ${users.rows.length} users`);
    
    // Reset sequence
    await supabasePool.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM users), false)`);
    
    // 2. Migrate Acquirers
    console.log('\n📦 Migrating acquirers...');
    const acquirers = await neonPool.query('SELECT * FROM acquirers');
    console.log(`   Found ${acquirers.rows.length} acquirers`);
    
    for (const acq of acquirers.rows) {
      await supabasePool.query(`
        INSERT INTO acquirers (id, name, display_name, is_active, config, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [acq.id, acq.name, acq.display_name, acq.is_active, acq.config, acq.created_at, acq.updated_at]);
    }
    console.log(`   ✅ Migrated ${acquirers.rows.length} acquirers`);
    await supabasePool.query(`SELECT setval('acquirers_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM acquirers), false)`);
    
    // 3. Migrate Bookings
    console.log('\n📦 Migrating bookings...');
    const bookings = await neonPool.query('SELECT * FROM bookings');
    console.log(`   Found ${bookings.rows.length} bookings`);
    
    for (const b of bookings.rows) {
      await supabasePool.query(`
        INSERT INTO bookings (id, user_id, flight_id, booking_reference, total_price,
          currency, status, flight_data, contact_email, contact_phone, special_requests,
          pnr, ticket_number, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id, b.user_id, b.flight_id, b.booking_reference, b.total_price,
        b.currency, b.status, b.flight_data, b.contact_email, b.contact_phone,
        b.special_requests, b.pnr, b.ticket_number, b.created_at, b.updated_at
      ]);
    }
    console.log(`   ✅ Migrated ${bookings.rows.length} bookings`);
    await supabasePool.query(`SELECT setval('bookings_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM bookings), false)`);
    
    // 4. Migrate Travelers
    console.log('\n📦 Migrating travelers...');
    const travelers = await neonPool.query('SELECT * FROM travelers');
    console.log(`   Found ${travelers.rows.length} travelers`);
    
    for (const t of travelers.rows) {
      await supabasePool.query(`
        INSERT INTO travelers (id, booking_id, traveler_type, title, first_name, last_name,
          date_of_birth, gender, email, phone, passport_number, passport_expiry, nationality, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, [
        t.id, t.booking_id, t.traveler_type, t.title, t.first_name, t.last_name,
        t.date_of_birth, t.gender, t.email, t.phone, t.passport_number,
        t.passport_expiry, t.nationality, t.created_at
      ]);
    }
    console.log(`   ✅ Migrated ${travelers.rows.length} travelers`);
    await supabasePool.query(`SELECT setval('travelers_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM travelers), false)`);
    
    // 5. Migrate Payments
    console.log('\n📦 Migrating payments...');
    const payments = await neonPool.query('SELECT * FROM payments');
    console.log(`   Found ${payments.rows.length} payments`);
    
    for (const p of payments.rows) {
      await supabasePool.query(`
        INSERT INTO payments (id, payment_reference, booking_id, user_id, amount, currency,
          acquirer, acquirer_order_id, acquirer_payment_id, acquirer_transaction_id,
          payment_method, status, customer_email, customer_phone, customer_name,
          gateway_fees, gst_amount, net_amount, refunded_amount, refund_reference,
          success_url, failure_url, callback_url, payment_link, description,
          ip_address, user_agent, acquirer_response, payment_details, webhook_data,
          metadata, initiated_at, completed_at, failed_at, refunded_at, expires_at,
          created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, p.payment_reference, p.booking_id, p.user_id, p.amount, p.currency,
        p.acquirer, p.acquirer_order_id, p.acquirer_payment_id, p.acquirer_transaction_id,
        p.payment_method, p.status, p.customer_email, p.customer_phone, p.customer_name,
        p.gateway_fees, p.gst_amount, p.net_amount, p.refunded_amount, p.refund_reference,
        p.success_url, p.failure_url, p.callback_url, p.payment_link, p.description,
        p.ip_address, p.user_agent, p.acquirer_response, p.payment_details, p.webhook_data,
        p.metadata, p.initiated_at, p.completed_at, p.failed_at, p.refunded_at, p.expires_at,
        p.created_at, p.updated_at
      ]);
    }
    console.log(`   ✅ Migrated ${payments.rows.length} payments`);
    await supabasePool.query(`SELECT setval('payments_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM payments), false)`);
    
    // Verify migration
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  📊 VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const tables = ['users', 'acquirers', 'bookings', 'travelers', 'payments'];
    for (const table of tables) {
      const neonCount = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);
      const supabaseCount = await supabasePool.query(`SELECT COUNT(*) FROM ${table}`);
      const match = neonCount.rows[0].count === supabaseCount.rows[0].count ? '✅' : '⚠️';
      console.log(`   ${match} ${table}: Neon=${neonCount.rows[0].count}, Supabase=${supabaseCount.rows[0].count}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    await neonPool.end();
    await supabasePool.end();
    
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error(error);
    await neonPool.end();
    await supabasePool.end();
    process.exit(1);
  }
}

migrateData();
