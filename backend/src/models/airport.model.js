/**
 * Airport Model (PostgreSQL Schema)
 * Master airports database for fast autocomplete
 * Based on IATA standards + 9,000+ airports worldwide
 * Data source: OurAirports.com
 */
const { getPool } = require('../config/database');
const logger = require('../config/winstonLogger');

const createAirportTable = async () => {
  const pool = getPool();
  
  const query = `
    CREATE TABLE IF NOT EXISTS airports (
      id SERIAL PRIMARY KEY,
      iata_code VARCHAR(3) UNIQUE NOT NULL,
      icao_code VARCHAR(4),
      airport_name VARCHAR(255) NOT NULL,
      city_name VARCHAR(100) NOT NULL,
      country_name VARCHAR(100) NOT NULL,
      country_code VARCHAR(2) NOT NULL,
      timezone VARCHAR(50),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      is_major_airport BOOLEAN DEFAULT false,
      priority_score INTEGER DEFAULT 0,
      search_keywords TEXT,
      airport_type VARCHAR(50),
      has_scheduled_service BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for fast search
    CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
    CREATE INDEX IF NOT EXISTS idx_airports_city ON airports USING GIN (to_tsvector('english', city_name));
    CREATE INDEX IF NOT EXISTS idx_airports_name ON airports USING GIN (to_tsvector('english', airport_name));
    CREATE INDEX IF NOT EXISTS idx_airports_keywords ON airports USING GIN (to_tsvector('english', search_keywords));
    CREATE INDEX IF NOT EXISTS idx_airports_priority ON airports(priority_score DESC);
    CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country_code);
    CREATE INDEX IF NOT EXISTS idx_airports_type ON airports(airport_type);
    CREATE INDEX IF NOT EXISTS idx_airports_scheduled ON airports(has_scheduled_service);
    
    -- Composite index for common search pattern
    CREATE INDEX IF NOT EXISTS idx_airports_search_combo 
      ON airports(country_code, priority_score DESC, has_scheduled_service);
    
    -- Trigger to update search_keywords automatically
    CREATE OR REPLACE FUNCTION update_airport_search_keywords()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_keywords = LOWER(COALESCE(NEW.iata_code, '') || ' ' || COALESCE(NEW.city_name, '') || ' ' || COALESCE(NEW.airport_name, '') || ' ' || COALESCE(NEW.country_name, ''));
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_airport_search ON airports;
    CREATE TRIGGER trigger_update_airport_search
      BEFORE INSERT OR UPDATE ON airports
      FOR EACH ROW EXECUTE FUNCTION update_airport_search_keywords();
  `;

  try {
    await pool.query(query);
    logger.info('✅ Airports table created successfully with indexes');
  } catch (error) {
    logger.error('❌ Error creating airports table:', error);
    throw error;
  }
};

/**
 * Search airports by query (for autocomplete)
 * Enhanced with smart ranking like MMT/Booking.com
 */
const searchAirports = async (query, limit = 10, country = null, onlyScheduled = true) => {
  const pool = getPool();
  
  const searchTerm = query.toLowerCase().trim();
  
  let sql = `
    SELECT 
      iata_code,
      icao_code,
      airport_name,
      city_name,
      country_name,
      country_code,
      priority_score,
      is_major_airport,
      airport_type,
      has_scheduled_service,
      latitude,
      longitude,
      timezone
    FROM airports 
    WHERE (
      iata_code ILIKE $1
      OR city_name ILIKE $1
      OR airport_name ILIKE $1
      OR search_keywords ILIKE $1
    )
  `;
  
  const params = [`%${searchTerm}%`];
  
  // Add country filter if specified
  if (country) {
    sql += ` AND country_code = $${params.length + 1}`;
    params.push(country.toUpperCase());
  }
  
  // Only airports with scheduled service (commercial flights)
  if (onlyScheduled) {
    sql += ` AND (has_scheduled_service = true OR is_major_airport = true OR priority_score >= 50)`;
  }
  
  // Smart ranking: exact match > starts with > contains
  sql += `
    ORDER BY 
      CASE 
        WHEN UPPER(iata_code) = UPPER($${params.length + 1}) THEN 1
        WHEN UPPER(city_name) = UPPER($${params.length + 1}) THEN 2
        WHEN city_name ILIKE $${params.length + 1} || '%' THEN 3
        WHEN iata_code ILIKE $${params.length + 1} || '%' THEN 4
        ELSE 5
      END,
      priority_score DESC,
      is_major_airport DESC,
      city_name ASC
    LIMIT $${params.length + 2}
  `;
  params.push(searchTerm);
  params.push(limit);

  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('❌ Error searching airports:', error);
    throw error;
  }
};

/**
 * Get airport by IATA code
 */
const getAirportByCode = async (iataCode) => {
  const pool = getPool();
  
  const query = `
    SELECT * FROM airports 
    WHERE iata_code = $1
  `;
  
  try {
    const result = await pool.query(query, [iataCode.toUpperCase()]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Error getting airport by code:', error);
    throw error;
  }
};

/**
 * Insert airport data (for data seeding)
 */
const insertAirport = async (airportData) => {
  const pool = getPool();
  
  const query = `
    INSERT INTO airports (
      iata_code, icao_code, airport_name, city_name, country_name, 
      country_code, timezone, latitude, longitude, is_major_airport, priority_score
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (iata_code) DO UPDATE SET
      icao_code = EXCLUDED.icao_code,
      airport_name = EXCLUDED.airport_name,
      city_name = EXCLUDED.city_name,
      country_name = EXCLUDED.country_name,
      country_code = EXCLUDED.country_code,
      timezone = EXCLUDED.timezone,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      is_major_airport = EXCLUDED.is_major_airport,
      priority_score = EXCLUDED.priority_score
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [
      airportData.iata_code,
      airportData.icao_code,
      airportData.airport_name,
      airportData.city_name,
      airportData.country_name,
      airportData.country_code,
      airportData.timezone,
      airportData.latitude,
      airportData.longitude,
      airportData.is_major_airport || false,
      airportData.priority_score || 0
    ]);
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Error inserting airport:', error);
    throw error;
  }
};

/**
 * Bulk insert airports (for data seeding)
 */
const bulkInsertAirports = async (airports) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let insertCount = 0;
    for (const airport of airports) {
      try {
        await insertAirport(airport);
        insertCount++;
      } catch (error) {
        logger.warn(`⚠️ Skipped airport ${airport.iata_code}: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    logger.info(`✅ Bulk inserted ${insertCount}/${airports.length} airports`);
    return insertCount;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Error in bulk insert:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get popular airports by country with high priority scores
 */
const getPopularAirports = async (countryCode = 'IN', limit = 10) => {
  const pool = getPool();
  
  try {
    const query = `
      SELECT iata_code, airport_name, city_name, country_name, country_code, priority_score
      FROM airports 
      WHERE country_code = UPPER($1) 
        AND priority_score > 50
      ORDER BY priority_score DESC, city_name ASC
      LIMIT $2
    `;
    
    const values = [countryCode, limit];
    logger.info(`🔍 Getting popular airports for ${countryCode}, limit: ${limit}`);
    
    const result = await pool.query(query, values);
    logger.info(`✅ Found ${result.rows.length} popular airports`);
    
    return result.rows;
  } catch (error) {
    logger.error('❌ Error getting popular airports:', error);
    throw error;
  }
};

/**
 * Get airport database statistics
 */
const getAirportStats = async () => {
  const pool = getPool();
  
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_airports,
        COUNT(CASE WHEN is_major_airport THEN 1 END) as major_airports,
        COUNT(CASE WHEN has_scheduled_service THEN 1 END) as scheduled_service,
        COUNT(DISTINCT country_code) as total_countries,
        COUNT(CASE WHEN airport_type = 'large_airport' THEN 1 END) as large_airports,
        COUNT(CASE WHEN airport_type = 'medium_airport' THEN 1 END) as medium_airports,
        COUNT(CASE WHEN airport_type = 'small_airport' THEN 1 END) as small_airports
      FROM airports
    `);
    
    const topCountries = await pool.query(`
      SELECT country_code, country_name, COUNT(*) as count
      FROM airports
      GROUP BY country_code, country_name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    return {
      ...stats.rows[0],
      top_countries: topCountries.rows
    };
  } catch (error) {
    logger.error('❌ Error getting airport stats:', error);
    throw error;
  }
};

/**
 * Get all airports for a specific country
 */
const getAirportsByCountry = async (countryCode, limit = 100) => {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT iata_code, airport_name, city_name, country_name, country_code, 
             priority_score, is_major_airport, airport_type
      FROM airports
      WHERE country_code = UPPER($1)
      ORDER BY priority_score DESC, city_name ASC
      LIMIT $2
    `, [countryCode, limit]);
    
    return result.rows;
  } catch (error) {
    logger.error('❌ Error getting airports by country:', error);
    throw error;
  }
};

module.exports = {
  createAirportTable,
  searchAirports,
  getAirportByCode,
  getPopularAirports,
  insertAirport,
  bulkInsertAirports,
  getAirportStats,
  getAirportsByCountry
};