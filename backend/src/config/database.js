/**
 * PostgreSQL Database Configuration
 * Supports both Supabase and Neon DB
 */
const { Pool } = require('pg');
const logger = require('./winstonLogger');

let pool;

const connectDB = async () => {
  try {
    // Prioritize individual params (for Supabase with special chars in password)
    // Falls back to DATABASE_URL if DB_HOST not set
    const connectionConfig = process.env.DB_HOST
      ? {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT) || 5432,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'postgres',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }
      : process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        }
      : {
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: '',
          database: 'travel_booking',
          ssl: false,
        };
    
    logger.info(`🔌 Connecting to PostgreSQL via ${process.env.DB_HOST ? 'DB_HOST params' : process.env.DATABASE_URL ? 'DATABASE_URL' : 'localhost defaults'}`);

    pool = new Pool({
      ...connectionConfig,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 15000, // Return error after 15 seconds
    });

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    
    const dbType = process.env.DB_HOST?.includes('supabase') ? 'Supabase' : 
                   process.env.DATABASE_URL?.includes('neon') ? 'Neon DB' : 'PostgreSQL';
    
    logger.info(`✅ ${dbType} Connected Successfully`);
    logger.info(`📅 Database Time: ${result.rows[0].now}`);
    client.release();

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('❌ Unexpected PostgreSQL pool error:', err);
    });

    return pool;
  } catch (error) {
    logger.error('❌ PostgreSQL Connection Failed:', error.message);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB first.');
  }
  return pool;
};

const closeDB = async () => {
  if (pool) {
    await pool.end();
    logger.info('🔌 PostgreSQL connection pool closed');
  }
};

module.exports = { connectDB, getPool, closeDB };
