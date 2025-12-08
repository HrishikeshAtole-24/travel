// MySQL Database Configuration
const mysql = require('mysql2/promise');
const logger = require('./winstonLogger');

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'travel_booking',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    logger.info('✅ MySQL Connected Successfully');
    connection.release();
    
    return pool;
  } catch (error) {
    logger.error('❌ MySQL Connection Failed:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB first.');
  }
  return pool;
};

module.exports = { connectDB, getPool };
