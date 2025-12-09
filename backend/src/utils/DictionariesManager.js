/**
 * Dictionaries Manager
 * Manages lookup data for airlines, airports, and aircraft
 * In production, this data should be stored in MySQL and cached in Redis
 */

/**
 * Airlines database (sample - should be in MySQL)
 * Key: IATA airline code
 */
const AIRLINES = {
  'EK': { name: 'Emirates', logo: 'https://cdn.example.com/logos/EK.png' },
  'AI': { name: 'Air India', logo: 'https://cdn.example.com/logos/AI.png' },
  'BA': { name: 'British Airways', logo: 'https://cdn.example.com/logos/BA.png' },
  'LH': { name: 'Lufthansa', logo: 'https://cdn.example.com/logos/LH.png' },
  'QR': { name: 'Qatar Airways', logo: 'https://cdn.example.com/logos/QR.png' },
  'SQ': { name: 'Singapore Airlines', logo: 'https://cdn.example.com/logos/SQ.png' },
  '6E': { name: 'IndiGo', logo: 'https://cdn.example.com/logos/6E.png' },
  'SG': { name: 'SpiceJet', logo: 'https://cdn.example.com/logos/SG.png' },
  'UK': { name: 'Vistara', logo: 'https://cdn.example.com/logos/UK.png' },
  'AA': { name: 'American Airlines', logo: 'https://cdn.example.com/logos/AA.png' },
  'UA': { name: 'United Airlines', logo: 'https://cdn.example.com/logos/UA.png' },
  'DL': { name: 'Delta Air Lines', logo: 'https://cdn.example.com/logos/DL.png' },
};

/**
 * Airports database (sample - should be in MySQL)
 * Key: IATA airport code
 */
const AIRPORTS = {
  'BOM': {
    cityCode: 'BOM',
    countryCode: 'IN',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    city: 'Mumbai',
    timezone: 'Asia/Kolkata'
  },
  'DEL': {
    cityCode: 'DEL',
    countryCode: 'IN',
    name: 'Indira Gandhi International Airport',
    city: 'New Delhi',
    timezone: 'Asia/Kolkata'
  },
  'DXB': {
    cityCode: 'DXB',
    countryCode: 'AE',
    name: 'Dubai International Airport',
    city: 'Dubai',
    timezone: 'Asia/Dubai'
  },
  'LHR': {
    cityCode: 'LHR',
    countryCode: 'GB',
    name: 'London Heathrow Airport',
    city: 'London',
    timezone: 'Europe/London'
  },
  'JFK': {
    cityCode: 'NYC',
    countryCode: 'US',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    timezone: 'America/New_York'
  },
  'SIN': {
    cityCode: 'SIN',
    countryCode: 'SG',
    name: 'Singapore Changi Airport',
    city: 'Singapore',
    timezone: 'Asia/Singapore'
  },
  'BLR': {
    cityCode: 'BLR',
    countryCode: 'IN',
    name: 'Kempegowda International Airport',
    city: 'Bangalore',
    timezone: 'Asia/Kolkata'
  },
  'MAA': {
    cityCode: 'MAA',
    countryCode: 'IN',
    name: 'Chennai International Airport',
    city: 'Chennai',
    timezone: 'Asia/Kolkata'
  },
  'HYD': {
    cityCode: 'HYD',
    countryCode: 'IN',
    name: 'Rajiv Gandhi International Airport',
    city: 'Hyderabad',
    timezone: 'Asia/Kolkata'
  },
  'CCU': {
    cityCode: 'CCU',
    countryCode: 'IN',
    name: 'Netaji Subhas Chandra Bose International Airport',
    city: 'Kolkata',
    timezone: 'Asia/Kolkata'
  },
};

/**
 * Aircraft database (sample - should be in MySQL)
 * Key: IATA aircraft code
 */
const AIRCRAFT = {
  '77W': { name: 'Boeing 777-300ER' },
  '77L': { name: 'Boeing 777-200LR' },
  '788': { name: 'Boeing 787-8 Dreamliner' },
  '789': { name: 'Boeing 787-9 Dreamliner' },
  '78J': { name: 'Boeing 787-10 Dreamliner' },
  '380': { name: 'Airbus A380-800' },
  '359': { name: 'Airbus A350-900' },
  '35K': { name: 'Airbus A350-1000' },
  '388': { name: 'Airbus A380-800' },
  '320': { name: 'Airbus A320' },
  '32A': { name: 'Airbus A320neo' },
  '321': { name: 'Airbus A321' },
  '32B': { name: 'Airbus A321neo' },
  '738': { name: 'Boeing 737-800' },
  '73H': { name: 'Boeing 737-800 (winglets)' },
  '73J': { name: 'Boeing 737-900' },
  '7M8': { name: 'Boeing 737 MAX 8' },
  '7M9': { name: 'Boeing 737 MAX 9' },
};

class DictionariesManager {
  /**
   * Get airline info by code
   * @param {string} airlineCode - IATA airline code
   * @returns {Object|null}
   */
  static getAirline(airlineCode) {
    return AIRLINES[airlineCode] || { name: airlineCode }; // Fallback to code if not found
  }

  /**
   * Get multiple airlines
   * @param {string[]} airlineCodes - Array of IATA airline codes
   * @returns {Object} Map of airline codes to info
   */
  static getAirlines(airlineCodes) {
    const result = {};
    airlineCodes.forEach(code => {
      result[code] = this.getAirline(code);
    });
    return result;
  }

  /**
   * Get airport info by code
   * @param {string} airportCode - IATA airport code
   * @returns {Object|null}
   */
  static getAirport(airportCode) {
    return AIRPORTS[airportCode] || {
      cityCode: airportCode,
      countryCode: 'XX',
      name: airportCode
    };
  }

  /**
   * Get multiple airports
   * @param {string[]} airportCodes - Array of IATA airport codes
   * @returns {Object} Map of airport codes to info
   */
  static getAirports(airportCodes) {
    const result = {};
    airportCodes.forEach(code => {
      result[code] = this.getAirport(code);
    });
    return result;
  }

  /**
   * Get aircraft info by code
   * @param {string} aircraftCode - IATA aircraft code
   * @returns {Object|null}
   */
  static getAircraft(aircraftCode) {
    return AIRCRAFT[aircraftCode] || { name: aircraftCode };
  }

  /**
   * Get multiple aircraft
   * @param {string[]} aircraftCodes - Array of IATA aircraft codes
   * @returns {Object} Map of aircraft codes to info
   */
  static getAircrafts(aircraftCodes) {
    const result = {};
    aircraftCodes.forEach(code => {
      result[code] = this.getAircraft(code);
    });
    return result;
  }

  /**
   * Build dictionaries from flight offers
   * Extracts unique codes and builds lookup tables
   * @param {Array} offers - Array of flight offers
   * @returns {Object} Dictionaries object
   */
  static buildFromOffers(offers) {
    const airlineCodes = new Set();
    const airportCodes = new Set();
    const aircraftCodes = new Set();

    offers.forEach(offer => {
      // Extract from itinerary
      if (offer.itinerary && offer.itinerary.slices) {
        offer.itinerary.slices.forEach(slice => {
          slice.segments.forEach(segment => {
            // Airlines
            if (segment.marketingAirlineCode) airlineCodes.add(segment.marketingAirlineCode);
            if (segment.operatingAirlineCode) airlineCodes.add(segment.operatingAirlineCode);

            // Airports
            if (segment.departure?.airportCode) airportCodes.add(segment.departure.airportCode);
            if (segment.arrival?.airportCode) airportCodes.add(segment.arrival.airportCode);

            // Aircraft
            if (segment.aircraftCode) aircraftCodes.add(segment.aircraftCode);
          });
        });
      }

      // Also add validating airline
      if (offer.validatingAirlineCode) airlineCodes.add(offer.validatingAirlineCode);
    });

    return {
      airlines: this.getAirlines([...airlineCodes]),
      airports: this.getAirports([...airportCodes]),
      aircraft: this.getAircrafts([...aircraftCodes])
    };
  }
}

module.exports = DictionariesManager;
