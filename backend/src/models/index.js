/**
 * Database Initialization Script
 * Creates all tables in the correct order (respecting foreign key dependencies)
 */

const { getPool } = require('../config/database');
const { createUserTable } = require('./user.model');
const { createBookingTable } = require('./booking.model');
const { createTravelerTable } = require('./traveler.model');
const {createPaymentTable} = require("./payment.model");
const { createAcquirerTable } = require('./acquirer.model');
const { createStandardStatusTable } = require('./standard-status.model');
const { createAcquirerStatusMappingTable } = require('./acquirer-status-mapping.model');
const { createAirportTable } = require('./airport.model');
const logger = require('../config/winstonLogger');

const initializeDatabase = async () => {
  try {
    logger.info('🔄 Starting database initialization...');

    // Create tables in order (respect foreign key dependencies)
    // 1. Users table (no dependencies)
    await createUserTable();

    // 2. Airports table (no dependencies)
    await createAirportTable();

    // 3. Bookings table (depends on users)
    await createBookingTable();

    // 3. Travelers table (depends on bookings)
    await createTravelerTable();

    // 4. Payments table (depends on bookings)
    await createPaymentTable();

    // 5. Acquirers table (no dependencies)
    await createAcquirerTable();

    // 6. Standard status codes table (no dependencies)
    await createStandardStatusTable();

    // 7. Acquirer status mapping table (depends on acquirers and standard_status_codes)
    await createAcquirerStatusMappingTable();

    logger.info('✅ Database initialization completed successfully!');
    logger.info('📊 All tables created/verified:');
    logger.info('   - users');
    logger.info('   - airports');
    logger.info('   - bookings');
    logger.info('   - travelers');
    logger.info('   - payments');
    logger.info('   - acquirers');
    logger.info('   - standard_status_codes');
    logger.info('   - acquirer_status_mapping');

    return true;
  } catch (error) {
    logger.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = { initializeDatabase };
