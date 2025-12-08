// Redis Configuration
const redis = require('redis');
const logger = require('./winstonLogger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis Connected Successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis Connection Failed:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
