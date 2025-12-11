// Server Entry Point
require('./config/dotenv');
const app = require('./app');
const logger = require('./config/winstonLogger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeDatabase } = require('./models');

const PORT = process.env.PORT || 5000;

// Initialize Connections and Database Tables
(async () => {
  try {
    // 1. Connect to PostgreSQL (Neon DB) - REQUIRED
    await connectDB();
    
    // 2. Initialize database tables - REQUIRED
    await initializeDatabase();
    
    // 3. Connect to Redis cache - OPTIONAL
    const redisClient = await connectRedis();
    const cacheStatus = redisClient ? 'Connected' : 'Disabled (optional)';
    
    // 4. Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`💾 Database: PostgreSQL (Neon DB) - ✅ Connected`);
      logger.info(`🔴 Cache: Redis - ${cacheStatus}`);
      console.log(`\n✅ Server is live at http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/health\n`);
      
      if (!redisClient) {
        console.log('💡 Note: Redis caching is disabled. To enable:');
        console.log('   1. Install Redis: https://redis.io/download');
        console.log('   2. Start Redis: redis-server');
        console.log('   3. Restart this server\n');
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
})();
