// Flight Repository - DB Queries Only
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

class FlightRepository {
  async saveSearchHistory(userId, searchParams) {
    try {
      const pool = getPool();
      const query = `
        INSERT INTO search_history (user_id, origin, destination, departure_date, search_date)
        VALUES (?, ?, ?, ?, NOW())
      `;
      const [result] = await pool.execute(query, [
        userId,
        searchParams.origin,
        searchParams.destination,
        searchParams.departureDate
      ]);
      return result.insertId;
    } catch (error) {
      logger.error('Save search history error:', error);
      throw error;
    }
  }

  async getSearchHistory(userId, limit = 10) {
    try {
      const pool = getPool();
      const query = `
        SELECT * FROM search_history 
        WHERE user_id = ? 
        ORDER BY search_date DESC 
        LIMIT ?
      `;
      const [rows] = await pool.execute(query, [userId, limit]);
      return rows;
    } catch (error) {
      logger.error('Get search history error:', error);
      throw error;
    }
  }

  async saveBooking(bookingData) {
    try {
      const pool = getPool();
      const query = `
        INSERT INTO bookings (user_id, flight_id, booking_reference, total_price, status)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [result] = await pool.execute(query, [
        bookingData.userId,
        bookingData.flightId,
        bookingData.bookingReference,
        bookingData.totalPrice,
        bookingData.status
      ]);
      return result.insertId;
    } catch (error) {
      logger.error('Save booking error:', error);
      throw error;
    }
  }
}

module.exports = new FlightRepository();
