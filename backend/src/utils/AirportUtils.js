// Airport Utility Functions
class AirportUtils {
  /**
   * Airport IATA codes mapping (sample data)
   */
  static AIRPORTS = {
    'DEL': { city: 'Delhi', country: 'India', name: 'Indira Gandhi International Airport' },
    'BOM': { city: 'Mumbai', country: 'India', name: 'Chhatrapati Shivaji Maharaj International Airport' },
    'BLR': { city: 'Bangalore', country: 'India', name: 'Kempegowda International Airport' },
    'MAA': { city: 'Chennai', country: 'India', name: 'Chennai International Airport' },
    'HYD': { city: 'Hyderabad', country: 'India', name: 'Rajiv Gandhi International Airport' },
    'JFK': { city: 'New York', country: 'USA', name: 'John F. Kennedy International Airport' },
    'LAX': { city: 'Los Angeles', country: 'USA', name: 'Los Angeles International Airport' },
    'LHR': { city: 'London', country: 'UK', name: 'Heathrow Airport' },
    'CDG': { city: 'Paris', country: 'France', name: 'Charles de Gaulle Airport' },
    'DXB': { city: 'Dubai', country: 'UAE', name: 'Dubai International Airport' },
    'SIN': { city: 'Singapore', country: 'Singapore', name: 'Singapore Changi Airport' },
  };

  /**
   * Get airport details by IATA code
   */
  static getAirportInfo(iataCode) {
    return this.AIRPORTS[iataCode] || {
      city: iataCode,
      country: 'Unknown',
      name: iataCode,
    };
  }

  /**
   * Validate IATA code format (3 letters)
   */
  static isValidIataCode(code) {
    return /^[A-Z]{3}$/.test(code);
  }

  /**
   * Get city name from IATA code
   */
  static getCityName(iataCode) {
    const airport = this.AIRPORTS[iataCode];
    return airport ? airport.city : iataCode;
  }
}

module.exports = AirportUtils;
