/**
 * Check column differences between Neon and Supabase
 */
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DPpTY3JEC9zx@ep-spring-recipe-ah71u1rn-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const supabasePool = new Pool({
  host: 'db.bbaxhfbntnfkpiqlnqiy.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Hrishikesh@$%2406',
  ssl: { rejectUnauthorized: false }
});

async function checkColumns(pool, name, table) {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [table]);
  
  console.log(`\n${name} - ${table}:`);
  result.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
  return result.rows.map(r => r.column_name);
}

async function main() {
  console.log('Checking column differences...');
  
  const tables = ['users', 'bookings', 'travelers', 'payments'];
  
  for (const table of tables) {
    const neonCols = await checkColumns(neonPool, 'NEON', table);
    const supabaseCols = await checkColumns(supabasePool, 'SUPABASE', table);
    
    const missing = neonCols.filter(c => !supabaseCols.includes(c));
    if (missing.length > 0) {
      console.log(`\n⚠️ Missing in Supabase ${table}: ${missing.join(', ')}`);
    }
  }
  
  await neonPool.end();
  await supabasePool.end();
}

main();
