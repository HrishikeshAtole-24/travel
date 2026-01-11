/**
 * Migrate acquirer_status_mapping and standard_status_codes tables
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DPpTY3JEC9zx@ep-spring-recipe-ah71u1rn-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 60000
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
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Migrating acquirer_status_mapping & standard_status_codes');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get table structures from Neon
    console.log('📋 Checking Neon tables...\n');

    // Check acquirer_status_mapping
    const asmCols = await neonPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='acquirer_status_mapping' 
      ORDER BY ordinal_position
    `);
    console.log('acquirer_status_mapping columns:');
    asmCols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    const asmCount = await neonPool.query('SELECT COUNT(*) FROM acquirer_status_mapping');
    console.log(`  Total rows: ${asmCount.rows[0].count}\n`);

    // Check standard_status_codes
    const sscCols = await neonPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='standard_status_codes' 
      ORDER BY ordinal_position
    `);
    console.log('standard_status_codes columns:');
    sscCols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    const sscCount = await neonPool.query('SELECT COUNT(*) FROM standard_status_codes');
    console.log(`  Total rows: ${sscCount.rows[0].count}\n`);

    // Step 2: Create tables in Supabase
    console.log('🔧 Creating tables in Supabase...\n');

    // Drop if exists
    await supabasePool.query(`
      DROP TABLE IF EXISTS acquirer_status_mapping CASCADE;
      DROP TABLE IF EXISTS standard_status_codes CASCADE;
    `);

    // Create standard_status_codes first (if acquirer_status_mapping references it)
    if (sscCols.rows.length > 0) {
      await supabasePool.query(`
        CREATE TABLE standard_status_codes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          description TEXT,
          abbreviation VARCHAR(50),
          message TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('  ✅ Created standard_status_codes');
    }

    // Create acquirer_status_mapping
    if (asmCols.rows.length > 0) {
      await supabasePool.query(`
        CREATE TABLE acquirer_status_mapping (
          id SERIAL PRIMARY KEY,
          acquirer_code VARCHAR(100),
          acquirer_status VARCHAR(100) NOT NULL,
          standard_status_code VARCHAR(100),
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('  ✅ Created acquirer_status_mapping');
    }

    // Step 3: Migrate data
    console.log('\n📤 Migrating data...\n');

    // Migrate standard_status_codes
    if (sscCols.rows.length > 0) {
      const sscData = await neonPool.query('SELECT * FROM standard_status_codes');
      console.log(`Migrating ${sscData.rows.length} standard_status_codes...`);
      
      for (const row of sscData.rows) {
        try {
          const cols = Object.keys(row);
          const vals = cols.map(col => {
            const val = row[col];
            if (val !== null && typeof val === 'object') return JSON.stringify(val);
            return val;
          });
          const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
          await supabasePool.query(
            `INSERT INTO standard_status_codes (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            vals
          );
        } catch (e) {
          console.log(`  ⚠️ Row ${row.id}: ${e.message.substring(0, 50)}`);
        }
      }
      await supabasePool.query(`SELECT setval('standard_status_codes_id_seq', COALESCE((SELECT MAX(id) FROM standard_status_codes), 0) + 1, false)`);
      console.log('  ✅ Done!');
    }

    // Migrate acquirer_status_mapping
    if (asmCols.rows.length > 0) {
      const asmData = await neonPool.query('SELECT * FROM acquirer_status_mapping');
      console.log(`Migrating ${asmData.rows.length} acquirer_status_mapping...`);
      
      for (const row of asmData.rows) {
        try {
          const cols = Object.keys(row);
          const vals = cols.map(col => {
            const val = row[col];
            if (val !== null && typeof val === 'object') return JSON.stringify(val);
            return val;
          });
          const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
          await supabasePool.query(
            `INSERT INTO acquirer_status_mapping (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            vals
          );
        } catch (e) {
          console.log(`  ⚠️ Row ${row.id}: ${e.message.substring(0, 50)}`);
        }
      }
      await supabasePool.query(`SELECT setval('acquirer_status_mapping_id_seq', COALESCE((SELECT MAX(id) FROM acquirer_status_mapping), 0) + 1, false)`);
      console.log('  ✅ Done!');
    }

    // Step 4: Verify
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const table of ['standard_status_codes', 'acquirer_status_mapping']) {
      try {
        const nc = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);
        const sc = await supabasePool.query(`SELECT COUNT(*) FROM ${table}`);
        const match = nc.rows[0].count === sc.rows[0].count;
        console.log(`  ${match ? '✅' : '⚠️'} ${table.padEnd(25)} Neon: ${nc.rows[0].count.toString().padStart(3)}  |  Supabase: ${sc.rows[0].count.toString().padStart(3)}`);
      } catch (e) {
        console.log(`  ⚠️ ${table}: ${e.message.substring(0, 40)}`);
      }
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }

  await neonPool.end();
  await supabasePool.end();
}

run();
