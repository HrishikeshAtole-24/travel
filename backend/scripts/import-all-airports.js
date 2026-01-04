/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AIRPORT DATA IMPORTER - PRODUCTION GRADE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Downloads and imports ALL airports worldwide from OurAirports.com
 * Source: https://ourairports.com/data/ (Most complete public dataset)
 * 
 * Features:
 * - ~74,000 airports (all types)
 * - ~9,000 commercial airports (filtered)
 * - Smart priority scoring like MMT/Booking.com
 * - Automatic search keywords generation
 * 
 * Usage: node scripts/import-all-airports.js [--full | --commercial]
 * ═══════════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');
const { parse } = require('csv-parse/sync');
const { connectDB, getPool, closeDB } = require('../src/config/database');
require('../src/config/dotenv');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const OURAIRPORTS_URLS = {
  airports: 'https://davidmegginson.github.io/ourairports-data/airports.csv',
  countries: 'https://davidmegginson.github.io/ourairports-data/countries.csv',
  regions: 'https://davidmegginson.github.io/ourairports-data/regions.csv'
};

// Airport types to include
const COMMERCIAL_TYPES = ['large_airport', 'medium_airport'];
const ALL_TYPES = ['large_airport', 'medium_airport', 'small_airport', 'seaplane_base', 'heliport'];

// Major hub airports (highest priority)
const MAJOR_HUBS = [
  // India
  'DEL', 'BOM', 'BLR', 'MAA', 'CCU', 'HYD', 'AMD', 'COK', 'PNQ', 'GOI',
  // Middle East
  'DXB', 'AUH', 'DOH', 'RUH', 'JED', 'BAH', 'KWI', 'MCT',
  // Asia Pacific
  'SIN', 'BKK', 'HKG', 'KUL', 'CGK', 'MNL', 'NRT', 'HND', 'ICN', 'PVG', 'PEK', 'CAN',
  // Europe
  'LHR', 'CDG', 'AMS', 'FRA', 'MUC', 'MAD', 'BCN', 'FCO', 'ZRH', 'VIE', 'IST',
  // Americas
  'JFK', 'LAX', 'ORD', 'MIA', 'ATL', 'DFW', 'SFO', 'EWR', 'YYZ', 'MEX', 'GRU',
  // Africa & Oceania
  'JNB', 'CAI', 'SYD', 'MEL', 'AKL'
];

// Priority scoring rules
const PRIORITY_RULES = {
  MAJOR_HUB: 100,
  LARGE_AIRPORT: 80,
  MEDIUM_AIRPORT: 50,
  SMALL_AIRPORT: 30,
  OTHER: 10,
  // Bonuses
  INDIAN_AIRPORT_BONUS: 10,
  SCHEDULED_SERVICE_BONUS: 15
};

// ═══════════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════════

async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Fetching: ${url}`);
    
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ Downloaded: ${(data.length / 1024 / 1024).toFixed(2)} MB`);
        resolve(data);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════
// DATA PROCESSING
// ═══════════════════════════════════════════════════════════════

function calculatePriority(airport, iataCode) {
  let priority = PRIORITY_RULES.OTHER;
  
  // Check if it's a major hub
  if (MAJOR_HUBS.includes(iataCode)) {
    priority = PRIORITY_RULES.MAJOR_HUB;
  } else {
    // Base priority by type
    switch (airport.type) {
      case 'large_airport':
        priority = PRIORITY_RULES.LARGE_AIRPORT;
        break;
      case 'medium_airport':
        priority = PRIORITY_RULES.MEDIUM_AIRPORT;
        break;
      case 'small_airport':
        priority = PRIORITY_RULES.SMALL_AIRPORT;
        break;
      default:
        priority = PRIORITY_RULES.OTHER;
    }
  }
  
  // Bonuses
  if (airport.iso_country === 'IN') {
    priority += PRIORITY_RULES.INDIAN_AIRPORT_BONUS;
  }
  
  if (airport.scheduled_service === 'yes') {
    priority += PRIORITY_RULES.SCHEDULED_SERVICE_BONUS;
  }
  
  return Math.min(priority, 100);
}

function processAirports(csvData, countriesMap, includeAll = false) {
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`📊 Total records from OurAirports: ${records.length}`);
  
  const typesToInclude = includeAll ? ALL_TYPES : COMMERCIAL_TYPES;
  
  const airports = records
    .filter(row => {
      // Must have valid IATA code (3 letters)
      const iataCode = row.iata_code?.trim();
      if (!iataCode || iataCode.length !== 3) return false;
      
      // Filter by type
      if (!typesToInclude.includes(row.type)) return false;
      
      // Must have coordinates
      if (!row.latitude_deg || !row.longitude_deg) return false;
      
      return true;
    })
    .map(row => {
      const iataCode = row.iata_code.trim().toUpperCase();
      const countryCode = row.iso_country?.trim().toUpperCase() || '';
      const countryName = countriesMap[countryCode] || row.iso_country || 'Unknown';
      
      // Extract city from municipality or parse from name
      let cityName = row.municipality?.trim() || '';
      if (!cityName) {
        // Try to extract city from airport name
        const nameParts = row.name.split(/[-–,]/);
        cityName = nameParts[0].replace(/International|Airport|Regional|Intl/gi, '').trim();
      }
      
      return {
        iata_code: iataCode,
        icao_code: (row.ident?.trim()?.toUpperCase() || '').substring(0, 10) || null,
        airport_name: (row.name?.trim() || `${cityName} Airport`).substring(0, 255),
        city_name: (cityName || iataCode).substring(0, 100),
        country_name: countryName.substring(0, 100),
        country_code: countryCode.substring(0, 2),
        timezone: row.timezone || null,
        latitude: parseFloat(row.latitude_deg) || 0,
        longitude: parseFloat(row.longitude_deg) || 0,
        is_major_airport: row.type === 'large_airport' || MAJOR_HUBS.includes(iataCode),
        priority_score: calculatePriority(row, iataCode),
        airport_type: row.type,
        has_scheduled_service: row.scheduled_service === 'yes'
      };
    });
  
  // Remove duplicates (keep highest priority)
  const uniqueAirports = new Map();
  airports.forEach(airport => {
    const existing = uniqueAirports.get(airport.iata_code);
    if (!existing || airport.priority_score > existing.priority_score) {
      uniqueAirports.set(airport.iata_code, airport);
    }
  });
  
  const result = Array.from(uniqueAirports.values());
  console.log(`✅ Processed ${result.length} unique airports with IATA codes`);
  
  return result;
}

function parseCountries(csvData) {
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  const countriesMap = {};
  records.forEach(row => {
    if (row.code && row.name) {
      countriesMap[row.code.toUpperCase()] = row.name;
    }
  });
  
  console.log(`✅ Loaded ${Object.keys(countriesMap).length} countries`);
  return countriesMap;
}

// ═══════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════

async function ensureTableExists(pool) {
  // First, create table if not exists
  const createTableQuery = `
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(createTableQuery);
  
  // Add new columns if they don't exist (for existing tables)
  const alterQueries = [
    `ALTER TABLE airports ADD COLUMN IF NOT EXISTS airport_type VARCHAR(50)`,
    `ALTER TABLE airports ADD COLUMN IF NOT EXISTS has_scheduled_service BOOLEAN DEFAULT false`,
    `ALTER TABLE airports ALTER COLUMN icao_code TYPE VARCHAR(10)`
  ];
  
  for (const query of alterQueries) {
    try {
      await pool.query(query);
    } catch (err) {
      // Column might already exist in some PostgreSQL versions
      if (!err.message.includes('already exists')) {
        console.log(`Note: ${err.message}`);
      }
    }
  }
  
  // Create indexes
  const indexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code)`,
    `CREATE INDEX IF NOT EXISTS idx_airports_priority ON airports(priority_score DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country_code)`
  ];
  
  for (const query of indexQueries) {
    try {
      await pool.query(query);
    } catch (err) {
      // Index might already exist
    }
  }
  
  // Try to create GIN indexes (may fail on some setups)
  const ginIndexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_airports_city ON airports USING GIN (to_tsvector('english', city_name))`,
    `CREATE INDEX IF NOT EXISTS idx_airports_type ON airports(airport_type)`
  ];
  
  for (const query of ginIndexQueries) {
    try {
      await pool.query(query);
    } catch (err) {
      // GIN indexes might not be available
    }
  }
  
  console.log('✅ Table structure verified');
}

async function insertAirports(pool, airports, batchSize = 500) {
  console.log(`\n📤 Inserting ${airports.length} airports into database...`);
  
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  
  for (let i = 0; i < airports.length; i += batchSize) {
    const batch = airports.slice(i, i + batchSize);
    
    for (const airport of batch) {
      try {
        const searchKeywords = [
          airport.iata_code,
          airport.icao_code,
          airport.city_name,
          airport.airport_name,
          airport.country_name,
          airport.country_code
        ].filter(Boolean).join(' ').toLowerCase();
        
        const result = await pool.query(`
          INSERT INTO airports (
            iata_code, icao_code, airport_name, city_name, country_name,
            country_code, timezone, latitude, longitude, is_major_airport,
            priority_score, search_keywords, airport_type, has_scheduled_service
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
            priority_score = GREATEST(airports.priority_score, EXCLUDED.priority_score),
            search_keywords = EXCLUDED.search_keywords,
            airport_type = EXCLUDED.airport_type,
            has_scheduled_service = EXCLUDED.has_scheduled_service,
            updated_at = CURRENT_TIMESTAMP
          RETURNING (xmax = 0) as is_insert
        `, [
          airport.iata_code,
          airport.icao_code,
          airport.airport_name,
          airport.city_name,
          airport.country_name,
          airport.country_code,
          airport.timezone,
          airport.latitude,
          airport.longitude,
          airport.is_major_airport,
          airport.priority_score,
          searchKeywords,
          airport.airport_type,
          airport.has_scheduled_service
        ]);
        
        if (result.rows[0]?.is_insert) {
          inserted++;
        } else {
          updated++;
        }
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`⚠️ Error inserting ${airport.iata_code}:`, error.message);
        }
      }
    }
    
    // Progress update
    const progress = Math.round(((i + batch.length) / airports.length) * 100);
    process.stdout.write(`\r   Progress: ${progress}% (${i + batch.length}/${airports.length})`);
  }
  
  console.log(`\n\n✅ Import complete:`);
  console.log(`   • Inserted: ${inserted}`);
  console.log(`   • Updated: ${updated}`);
  console.log(`   • Errors: ${errors}`);
  
  return { inserted, updated, errors };
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const includeAll = args.includes('--full');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🛫 AIRPORT DATA IMPORTER - OurAirports.com');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${includeAll ? 'FULL (all airport types)' : 'COMMERCIAL (large + medium airports)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Download data
    console.log('📥 STEP 1: Downloading airport data from OurAirports...\n');
    
    const [airportsCsv, countriesCsv] = await Promise.all([
      fetchCSV(OURAIRPORTS_URLS.airports),
      fetchCSV(OURAIRPORTS_URLS.countries)
    ]);
    
    // Step 2: Process data
    console.log('\n📊 STEP 2: Processing airport data...\n');
    
    const countriesMap = parseCountries(countriesCsv);
    const airports = processAirports(airportsCsv, countriesMap, includeAll);
    
    // Show stats
    const byType = airports.reduce((acc, a) => {
      acc[a.airport_type] = (acc[a.airport_type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Airport breakdown by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count}`);
    });
    
    const byCountry = airports.reduce((acc, a) => {
      acc[a.country_code] = (acc[a.country_code] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`\n📊 Airports by region:`);
    console.log(`   • India (IN): ${byCountry['IN'] || 0}`);
    console.log(`   • USA (US): ${byCountry['US'] || 0}`);
    console.log(`   • Total countries: ${Object.keys(byCountry).length}`);
    
    // Step 3: Database import
    console.log('\n💾 STEP 3: Importing to database...\n');
    
    // Initialize database connection first
    await connectDB();
    const pool = getPool();
    await ensureTableExists(pool);
    await insertAirports(pool, airports);
    
    // Verify
    const countResult = await pool.query('SELECT COUNT(*) FROM airports');
    const topAirports = await pool.query(`
      SELECT iata_code, city_name, country_code, priority_score 
      FROM airports 
      ORDER BY priority_score DESC 
      LIMIT 10
    `);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ IMPORT COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total airports in database: ${countResult.rows[0].count}`);
    console.log('\n  Top 10 airports by priority:');
    topAirports.rows.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.iata_code} - ${a.city_name}, ${a.country_code} (${a.priority_score})`);
    });
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Close database connection
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    await closeDB().catch(() => {});
    process.exit(1);
  }
}

main();
