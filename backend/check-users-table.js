require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsersTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Users table columns:');
    console.log('='.repeat(70));
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(20)} | Nullable: ${row.is_nullable}`);
    });
    console.log('='.repeat(70));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkUsersTable();
