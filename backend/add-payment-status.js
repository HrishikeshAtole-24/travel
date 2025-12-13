/**
 * Migration Script: Add payment_initiated status to booking_status enum
 */

const { connectDB, getPool } = require('./src/config/database');
require('./src/config/dotenv');

async function addPaymentInitiatedStatus() {
  try {
    console.log('🔧 Adding payment_initiated status to booking_status enum...');
    
    // Initialize database connection
    await connectDB();
    const pool = getPool();

    // Add new value to enum
    await pool.query(`
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_initiated';
    `);
    
    console.log('✅ Added payment_initiated to booking_status enum');

    // Verify enum values
    const result = await pool.query(`
      SELECT unnest(enum_range(NULL::booking_status)) AS status;
    `);

    console.log('\n📋 Current booking_status enum values:');
    console.table(result.rows);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addPaymentInitiatedStatus();
