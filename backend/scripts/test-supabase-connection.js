/**
 * Test Supabase Database Connection
 */
const { Pool } = require('pg');

// Supabase connection - using individual params to handle special chars in password
const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,  // Original password with special chars
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

async function testConnection() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔌 TESTING SUPABASE CONNECTION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    console.log('📡 Connecting to Supabase...');
    const client = await pool.connect();
    
    // Test basic query
    const result = await client.query('SELECT NOW() as time, current_database() as db');
    console.log('✅ Connection successful!');
    console.log(`   Database: ${result.rows[0].db}`);
    console.log(`   Server time: ${result.rows[0].time}`);
    
    // Check existing tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Existing tables in Supabase (${tables.rows.length}):`);
    if (tables.rows.length === 0) {
      console.log('   (No tables yet - fresh database)');
    } else {
      tables.rows.forEach(t => console.log(`   • ${t.table_name}`));
    }
    
    client.release();
    await pool.end();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ SUPABASE CONNECTION TEST PASSED');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    return true;
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    await pool.end();
    return false;
  }
}

testConnection();
