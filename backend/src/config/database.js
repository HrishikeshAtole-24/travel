/**
 * PostgreSQL Database Configuration (Neon DB)
 * Connection pool for PostgreSQL with Neon serverless database
 */
const { Pool } = require('pg');
const logger = require('./winstonLogger');

let pool;

const connectDB = async () => {
  try {
    // Use connection string from Neon DB or individual params
    const connectionConfig = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false, // Required for Neon DB
          },
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'travel_booking',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };

    pool = new Pool({
      ...connectionConfig,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection not available
    });

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('✅ PostgreSQL (Neon DB) Connected Successfully');
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
