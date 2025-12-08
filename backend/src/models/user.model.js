// User Model (MySQL Schema)
const { getPool } = require('../config/database');

const createUserTable = async () => {
  const pool = getPool();
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  await pool.execute(query);
};

module.exports = { createUserTable };
