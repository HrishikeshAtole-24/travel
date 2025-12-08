// Environment Variables Configuration
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  
  // Amadeus
  AMADEUS_API_KEY: process.env.AMADEUS_API_KEY,
  AMADEUS_API_SECRET: process.env.AMADEUS_API_SECRET,
  AMADEUS_BASE_URL: process.env.AMADEUS_BASE_URL,
};
