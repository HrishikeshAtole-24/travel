// Redis Cache Repository
const { getRedisClient } = require('../config/redis');
const logger = require('../config/winstonLogger');

class CacheRepository {
  async set(key, value, ttl = 3600) {
    try {
      const client = getRedisClient();
      if (!client) {
        return false; // Redis unavailable, skip caching
      }
      const stringValue = JSON.stringify(value);
      await client.setEx(key, ttl, stringValue);
      logger.info(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error.message);
      return false;
    }
  }

  async get(key) {
    try {
      const client = getRedisClient();
      if (!client) {
        return null; // Redis unavailable, cache miss
      }
      const data = await client.get(key);
      
      if (!data) {
        logger.info(`Cache miss: ${key}`);
        return null;
      }

      logger.info(`Cache hit: ${key}`);
      return JSON.parse(data);
    } catch (error) {
      logger.error('Redis GET error:', error.message);
      return null;
    }
  }

  async delete(key) {
    try {
      const client = getRedisClient();
      if (!client) {
        return false; // Redis unavailable
      }
      await client.del(key);
      logger.info(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error('Redis DELETE error:', error.message);
      return false;
    }
  }

  async clear() {
    try {
      const client = getRedisClient();
      await client.flushAll();
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Redis CLEAR error:', error);
      return false;
    }
  }
}

module.exports = new CacheRepository();
