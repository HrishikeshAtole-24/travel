/**
 * Migration script to add missing columns to bookings table
 */
require('./src/config/dotenv');
const { connectDB, getPool, closeDB } = require('./src/config/database');

async function addColumns() {
  try {
    await connectDB();
    const pool = getPool();
    
    console.log('Adding pnr column...');
    await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pnr VARCHAR(20)');
    
    console.log('Adding ticket_number column...');
    await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50)');
    
    console.log('✅ Columns added successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await closeDB();
    process.exit(0);
  }
}

addColumns();
