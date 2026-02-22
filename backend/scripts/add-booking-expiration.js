/**
 * Migration Script: Add Booking Expiration Column
 * Adds expires_at column to bookings table and updates existing bookings
 * 
 * Industry Standard: Flight bookings typically expire in 15-30 minutes if unpaid
 * We'll use 30 minutes as the default expiration time
 */

require('../src/config/dotenv');
const { connectDB, getPool } = require('../src/config/database');

const BOOKING_EXPIRY_MINUTES = 30; // Industry standard for flight bookings

async function addBookingExpiration() {
  // Initialize database connection first
  await connectDB();
  const pool = getPool();
  
  try {
    console.log('🔄 Adding expires_at column to bookings table...');
    
    // Add expires_at column if it doesn't exist
    await pool.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    `);
    
    console.log('✅ expires_at column added');
    
    // Add expired status to the enum if not exists
    await pool.query(`
      DO $$ BEGIN
        ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    console.log('✅ "expired" status added to enum');
    
    // Update existing pending/payment_initiated bookings with expiration time
    // Set expiration to 30 minutes from creation
    const updateResult = await pool.query(`
      UPDATE bookings 
      SET expires_at = created_at + INTERVAL '${BOOKING_EXPIRY_MINUTES} minutes'
      WHERE expires_at IS NULL
      AND status IN ('pending', 'payment_initiated')
      RETURNING id, booking_reference, expires_at;
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} bookings with expiration time`);
    
    // Create index on expires_at for efficient expiration checks
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at);
    `);
    
    console.log('✅ Index created on expires_at');
    
    // Mark already expired bookings (created more than 30 mins ago and still unpaid)
    const expiredResult = await pool.query(`
      UPDATE bookings 
      SET status = 'expired'
      WHERE status IN ('pending', 'payment_initiated')
      AND expires_at < NOW()
      RETURNING id, booking_reference;
    `);
    
    if (expiredResult.rowCount > 0) {
      console.log(`⚠️  Marked ${expiredResult.rowCount} old bookings as expired`);
      expiredResult.rows.forEach(row => {
        console.log(`   - ${row.booking_reference}`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`📋 Booking expiration time: ${BOOKING_EXPIRY_MINUTES} minutes`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addBookingExpiration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { addBookingExpiration, BOOKING_EXPIRY_MINUTES };
