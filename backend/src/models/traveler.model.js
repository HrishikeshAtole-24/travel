// Traveler Model (MySQL Schema)
const { getPool } = require('../config/database');

const createTravelerTable = async () => {
  const pool = getPool();
  const query = `
    CREATE TABLE IF NOT EXISTS travelers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE,
      gender ENUM('male', 'female', 'other'),
      passport_number VARCHAR(50),
      passport_expiry DATE,
      nationality VARCHAR(3),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      INDEX idx_booking_id (booking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  await pool.execute(query);
};

module.exports = { createTravelerTable };
