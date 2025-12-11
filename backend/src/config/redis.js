// Redis Configuration
const redis = require('redis');
const logger = require('./winstonLogger');

let redisClient;
let redisAvailable = false;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 5000, // 5 second timeout
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', () => {
      // Silently handle errors - Redis is optional
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis Connected Successfully');
      redisAvailable = true;
    });

    // Try to connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    return redisClient;
  } catch (error) {
    logger.warn('⚠️ Redis unavailable (continuing without cache)');
    logger.info('💡 To enable caching, start Redis server: redis-server');
    redisClient = null;
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient || !redisAvailable) {
    return null;
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
