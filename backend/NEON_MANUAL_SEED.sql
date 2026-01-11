-- AIRPORTS TABLE DATA - Copy and paste this into Neon SQL Editor
-- This will populate your airports table with production data

-- First, ensure the table exists
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

-- Clear existing data
DELETE FROM airports;

-- Insert airport data
INSERT INTO airports (iata_code, icao_code, airport_name, city_name, country_name, country_code, timezone, latitude, longitude, is_major_airport, priority_score, search_keywords) VALUES
('DEL', 'VIDP', 'Indira Gandhi International Airport', 'Delhi', 'India', 'IN', 'Asia/Kolkata', 28.5562, 77.1000, true, 100, 'del delhi indira gandhi international airport india'),
('BOM', 'VABB', 'Chhatrapati Shivaji Maharaj International Airport', 'Mumbai', 'India', 'IN', 'Asia/Kolkata', 19.0896, 72.8656, true, 95, 'bom mumbai chhatrapati shivaji maharaj international airport india'),
('BLR', 'VOBL', 'Kempegowda International Airport', 'Bangalore', 'India', 'IN', 'Asia/Kolkata', 13.1986, 77.7066, true, 90, 'blr bangalore kempegowda international airport india'),
('MAA', 'VOMM', 'Chennai International Airport', 'Chennai', 'India', 'IN', 'Asia/Kolkata', 12.9941, 80.1709, true, 85, 'maa chennai international airport india'),
('CCU', 'VECC', 'Netaji Subhas Chandra Bose International Airport', 'Kolkata', 'India', 'IN', 'Asia/Kolkata', 22.6546, 88.4467, true, 85, 'ccu kolkata netaji subhas chandra bose international airport india'),
('HYD', 'VOHS', 'Rajiv Gandhi International Airport', 'Hyderabad', 'India', 'IN', 'Asia/Kolkata', 17.2313, 78.4298, true, 80, 'hyd hyderabad rajiv gandhi international airport india'),
('AMD', 'VAAH', 'Sardar Vallabhbhai Patel International Airport', 'Ahmedabad', 'India', 'IN', 'Asia/Kolkata', 23.0775, 72.6347, true, 75, 'amd ahmedabad sardar vallabhbhai patel international airport india'),
('COK', 'VOCI', 'Cochin International Airport', 'Kochi', 'India', 'IN', 'Asia/Kolkata', 10.1520, 76.4019, true, 75, 'cok kochi cochin international airport india'),
('PNQ', 'VAPO', 'Pune Airport', 'Pune', 'India', 'IN', 'Asia/Kolkata', 18.5821, 73.9197, true, 70, 'pnq pune airport india'),
('GOI', 'VOGO', 'Goa International Airport', 'Goa', 'India', 'IN', 'Asia/Kolkata', 15.3808, 73.8314, true, 70, 'goi goa international airport india'),
('JAI', 'VIJP', 'Jaipur International Airport', 'Jaipur', 'India', 'IN', 'Asia/Kolkata', 26.8242, 75.8122, true, 65, 'jai jaipur international airport india'),
('DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 'AE', 'Asia/Dubai', 25.2532, 55.3657, true, 95, 'dxb dubai international airport united arab emirates'),
('SIN', 'WSSS', 'Singapore Changi Airport', 'Singapore', 'Singapore', 'SG', 'Asia/Singapore', 1.3644, 103.9915, true, 90, 'sin singapore changi airport singapore'),
('BKK', 'VTBS', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand', 'TH', 'Asia/Bangkok', 13.6810, 100.7472, true, 85, 'bkk bangkok suvarnabhumi airport thailand'),
('LHR', 'EGLL', 'Heathrow Airport', 'London', 'United Kingdom', 'GB', 'Europe/London', 51.4700, -0.4543, true, 90, 'lhr london heathrow airport united kingdom'),
('JFK', 'KJFK', 'John F. Kennedy International Airport', 'New York', 'United States', 'US', 'America/New_York', 40.6413, -73.7781, true, 85, 'jfk new york john f kennedy international airport united states'),
('LAX', 'KLAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 'US', 'America/Los_Angeles', 33.9425, -118.4081, true, 80, 'lax los angeles international airport united states'),
('CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'France', 'FR', 'Europe/Paris', 49.0097, 2.5479, true, 85, 'cdg paris charles de gaulle airport france'),
('FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'Germany', 'DE', 'Europe/Berlin', 50.0264, 8.5431, true, 80, 'fra frankfurt airport germany'),
('AMS', 'EHAM', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 'NL', 'Europe/Amsterdam', 52.3105, 4.7683, true, 80, 'ams amsterdam airport schiphol netherlands'),
('NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'Japan', 'JP', 'Asia/Tokyo', 35.7647, 140.3864, true, 85, 'nrt tokyo narita international airport japan'),
('LKO', 'VILK', 'Chaudhary Charan Singh International Airport', 'Lucknow', 'India', 'IN', 'Asia/Kolkata', 26.7606, 80.8893, false, 60, 'lko lucknow chaudhary charan singh international airport india'),
('CJB', 'VOCB', 'Coimbatore International Airport', 'Coimbatore', 'India', 'IN', 'Asia/Kolkata', 11.0297, 77.0436, false, 55, 'cjb coimbatore international airport india'),
('IXC', 'VECH', 'Chandigarh Airport', 'Chandigarh', 'India', 'IN', 'Asia/Kolkata', 30.6735, 76.7884, false, 55, 'ixc chandigarh airport india');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_city ON airports USING GIN (to_tsvector('english', city_name));
CREATE INDEX IF NOT EXISTS idx_airports_priority ON airports(priority_score DESC);

-- Verify the data
SELECT COUNT(*) as total_airports FROM airports;
SELECT iata_code, city_name, priority_score FROM airports ORDER BY priority_score DESC LIMIT 5;