/**
 * Migration Script: Fix bookings table structure
 * Adds missing columns: flight_data, contact_email, contact_phone, special_requests
 */

const { connectDB, getPool } = require('./src/config/database');
require('./src/config/dotenv');

async function fixBookingsTable() {
  try {
    console.log('🔧 Starting bookings table migration...');
    
    // Initialize database connection
    await connectDB();
    const pool = getPool();

    // Add missing columns if they don't exist
    const alterQueries = [
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_data JSONB;`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;`,
      `ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;`,
      `ALTER TABLE bookings ALTER COLUMN flight_id DROP NOT NULL;`
    ];

    for (const query of alterQueries) {
      await pool.query(query);
      console.log(`✅ Executed: ${query.substring(0, 60)}...`);
    }

    // Verify the structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Current bookings table structure:');
    console.table(result.rows);

    console.log('\n✅ Bookings table migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixBookingsTable();
