/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLETE MIGRATION - Export Neon Schema & Data to Supabase
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL, // e.g. postgresql://user:pass@host/neondb?sslmode=require
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

const supabasePool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

async function getTableColumns(pool, tableName) {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating ${tableName}...`);
  
  try {
    // Get data from Neon
    const data = await neonPool.query(`SELECT * FROM ${tableName}`);
    console.log(`   Found ${data.rows.length} rows`);
    
    if (data.rows.length === 0) {
      console.log(`   ⏭️ No data to migrate`);
      return;
    }
    
    // Get column names from the first row
    const columns = Object.keys(data.rows[0]);
    
    // Insert each row
    let inserted = 0;
    for (const row of data.rows) {
      try {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await supabasePool.query(`
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `, values);
        inserted++;
      } catch (err) {
        if (!err.message.includes('duplicate')) {
          console.log(`   ⚠️ Row error: ${err.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log(`   ✅ Migrated ${inserted}/${data.rows.length} rows`);
    
    // Reset sequence if table has id column
    if (columns.includes('id')) {
      try {
        await supabasePool.query(`SELECT setval('${tableName}_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM ${tableName}), false)`);
      } catch (e) {}
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function exportAndRecreateSchema() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 COMPLETE NEON → SUPABASE MIGRATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Get all tables from Neon (excluding airports)
    const tablesResult = await neonPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'airports'
      ORDER BY table_name
    `);
    
    console.log('📋 Tables in Neon DB (excluding airports):');
    tablesResult.rows.forEach(t => console.log(`   • ${t.table_name}`));
    
    // Drop existing tables in Supabase
    console.log('\n🗑️ Cleaning Supabase...');
    await supabasePool.query(`
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS travelers CASCADE;
      DROP TABLE IF EXISTS bookings CASCADE;
      DROP TABLE IF EXISTS acquirer_status_mappings CASCADE;
      DROP TABLE IF EXISTS standard_payment_statuses CASCADE;
      DROP TABLE IF EXISTS acquirers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      
      DROP TYPE IF EXISTS user_status CASCADE;
      DROP TYPE IF EXISTS booking_status CASCADE;
      DROP TYPE IF EXISTS gender_type CASCADE;
      DROP TYPE IF EXISTS traveler_type CASCADE;
      DROP TYPE IF EXISTS payment_status CASCADE;
      DROP TYPE IF EXISTS payment_method CASCADE;
      DROP TYPE IF EXISTS acquirer_type CASCADE;
    `);
    console.log('   ✅ Cleaned');
    
    // Get and recreate ENUMs from Neon
    console.log('\n📝 Getting ENUM types from Neon...');
    const enumsResult = await neonPool.query(`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);
    
    // Group by enum name
    const enumMap = {};
    for (const row of enumsResult.rows) {
      if (!enumMap[row.enum_name]) enumMap[row.enum_name] = [];
      enumMap[row.enum_name].push(row.enum_value);
    }
    
    for (const [enumName, enumValues] of Object.entries(enumMap)) {
      const values = enumValues.map(v => `'${v}'`).join(', ');
      try {
        await supabasePool.query(`CREATE TYPE ${enumName} AS ENUM (${values})`);
        console.log(`   ✅ Created ENUM: ${enumName} (${enumValues.length} values)`);
      } catch (e) {
        console.log(`   ⚠️ ENUM ${enumName}: ${e.message}`);
      }
    }
    
    // Create tables by getting DDL from Neon
    console.log('\n📝 Creating tables in Supabase...');
    
    // We need to create tables in order (respecting foreign keys)
    const tableOrder = ['users', 'acquirers', 'bookings', 'travelers', 'payments'];
    
    for (const tableName of tableOrder) {
      console.log(`\n   Creating ${tableName}...`);
      
      // Get column info
      const columns = await getTableColumns(neonPool, tableName);
      
      if (columns.length === 0) {
        console.log(`   ⏭️ Table doesn't exist in Neon`);
        continue;
      }
      
      // Build CREATE TABLE statement
      const columnDefs = columns.map(col => {
        let def = `${col.column_name} `;
        
        // Handle data types
        if (col.data_type === 'integer' && col.column_name === 'id') {
          def += 'SERIAL PRIMARY KEY';
        } else if (col.data_type === 'USER-DEFINED') {
          // It's an ENUM, get the type name
          def += col.column_name.includes('status') ? 
            (tableName === 'payments' ? 'payment_status' : 
             tableName === 'bookings' ? 'booking_status' : 
             tableName === 'users' ? 'user_status' : 'VARCHAR(50)') :
            col.column_name === 'gender' ? 'gender_type' :
            col.column_name === 'traveler_type' ? 'traveler_type' :
            col.column_name === 'payment_method' ? 'payment_method' :
            col.column_name === 'acquirer' ? 'acquirer_type' :
            col.column_name === 'type' ? 'VARCHAR(50)' :
            'VARCHAR(50)';
        } else if (col.data_type === 'ARRAY') {
          def += 'TEXT[]';
        } else {
          def += col.data_type === 'character varying' ? 'VARCHAR(255)' :
                 col.data_type === 'timestamp without time zone' ? 'TIMESTAMP' :
                 col.data_type === 'timestamp with time zone' ? 'TIMESTAMPTZ' :
                 col.data_type.toUpperCase();
        }
        
        return def;
      }).join(',\n        ');
      
      const createSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n        ${columnDefs}\n      )`;
      
      try {
        await supabasePool.query(createSQL);
        console.log(`   ✅ Created ${tableName}`);
      } catch (err) {
        console.log(`   ❌ Error creating ${tableName}: ${err.message}`);
        // Try simpler approach - just the columns without constraints
      }
    }
    
    // Migrate data
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  📤 MIGRATING DATA');
    console.log('═══════════════════════════════════════════════════════════════');
    
    for (const tableName of tableOrder) {
      await migrateTable(tableName);
    }
    
    // Verify
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLETE - VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    for (const table of tableOrder) {
      try {
        const neonCount = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);
        const supabaseCount = await supabasePool.query(`SELECT COUNT(*) FROM ${table}`);
        const match = neonCount.rows[0].count === supabaseCount.rows[0].count ? '✅' : '⚠️';
        console.log(`   ${match} ${table}: Neon=${neonCount.rows[0].count}, Supabase=${supabaseCount.rows[0].count}`);
      } catch (e) {
        console.log(`   ⚠️ ${table}: error checking`);
      }
    }
    
    console.log('\n   Next: Run airport import separately');
    
    await neonPool.end();
    await supabasePool.end();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await neonPool.end();
    await supabasePool.end();
    process.exit(1);
  }
}

exportAndRecreateSchema();
