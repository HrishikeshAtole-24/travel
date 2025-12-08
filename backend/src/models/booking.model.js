// Booking Model (MySQL Schema)
const { getPool } = require('../config/database');

const createBookingTable = async () => {
  const pool = getPool();
  const query = `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      flight_id VARCHAR(100) NOT NULL,
      booking_reference VARCHAR(50) UNIQUE NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      INDEX idx_user_id (user_id),
      INDEX idx_booking_ref (booking_reference)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  await pool.execute(query);
};

module.exports = { createBookingTable };
