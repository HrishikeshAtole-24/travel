/**
 * Amadeus Supplier Interface
 * Clean export interface for all Amadeus APIs
 * 
 * Groups APIs into logical categories:
 * 1. Core Flight Search & Booking
 * 2. Reference Data (Airports, Cities, Airlines)
 * 3. Analytics & Insights
 */
const amadeusFlightAPI = require('./amadeus.flight');

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // 🔥 CORE FLIGHT SEARCH & BOOKING APIs
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Search for flight offers (v2)
   * @param {Object} params - Search parameters
   */
  searchFlights: (params) => amadeusFlightAPI.searchFlights(params),
  
  /**
   * Get flight price confirmation before booking
   * @param {Object} flightOffer - Flight offer to price
   * @param {Array} payments - Payment details (optional)
   */
  getFlightPrice: (flightOffer, payments = null) => 
    amadeusFlightAPI.getFlightPrice(flightOffer, payments),
  
  /**
   * Alias for getFlightPrice (for compatibility)
   * @param {Object} flightOffer - Flight offer to price
   */
  priceFlights: (flightOffer) => 
    amadeusFlightAPI.getFlightPrice(flightOffer),
  
  /**
   * Create flight booking order
   * @param {Object} flightOffer - Priced flight offer
   * @param {Array} travelers - Traveler details
   * @param {Object} contacts - Contact information
   * @param {Array} remarks - Booking remarks (optional)
   */
  createFlightOrder: (flightOffer, travelers, contacts, remarks = null) => 
    amadeusFlightAPI.createFlightOrder(flightOffer, travelers, contacts, remarks),
  
  /**
   * Get flight order details by ID
   * @param {String} orderId - Flight order ID
   */
  getFlightOrder: (orderId) => 
    amadeusFlightAPI.getFlightOrder(orderId),
  
  /**
   * Cancel flight order
   * @param {String} orderId - Flight order ID
   */
  cancelFlightOrder: (orderId) => 
    amadeusFlightAPI.cancelFlightOrder(orderId),

  // ═══════════════════════════════════════════════════════════════
  // 🌍 REFERENCE DATA APIs (Airports, Cities, Airlines)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Search locations (airports/cities) - Autocomplete
   * @param {String} keyword - Search keyword (min 3 chars)
   * @param {String} subType - AIRPORT, CITY, or AIRPORT,CITY
   */
  searchLocations: (keyword, subType = 'AIRPORT,CITY') => 
    amadeusFlightAPI.searchLocations(keyword, subType),
  
  /**
   * Get airport information by IATA code
   * @param {String} iataCode - Airport code (e.g., BOM, DEL)
   */
  getAirportInfo: (iataCode) => 
    amadeusFlightAPI.getAirportInfo(iataCode),
  
  /**
   * Get all airports in a city
   * @param {String} cityCode - City IATA code
   */
  getAirportsByCity: (cityCode) => 
    amadeusFlightAPI.getAirportsByCity(cityCode),
  
  /**
   * Get airline information by code
   * @param {String} airlineCode - Airline IATA code (e.g., AI, EK)
   */
  getAirlineInfo: (airlineCode) => 
    amadeusFlightAPI.getAirlineInfo(airlineCode),

  // ═══════════════════════════════════════════════════════════════
  // 📊 ANALYTICS & INSIGHTS APIs
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get cheapest dates to fly
   * @param {Object} params - Search parameters
   */
  getFlightCheapestDates: (params) => 
    amadeusFlightAPI.getFlightCheapestDates(params),
  
  /**
   * Get flight destination suggestions from origin
   * @param {String} origin - Origin IATA code
   * @param {Object} options - Optional filters
   */
  getFlightDestinations: (origin, options = {}) => 
    amadeusFlightAPI.getFlightDestinations(origin, options),
  
  /**
   * Get routes served by an airline
   * @param {String} airlineCode - Airline IATA code
   * @param {String} departureDate - Departure date (optional)
   */
  getAirlineRoutes: (airlineCode, departureDate = null) => 
    amadeusFlightAPI.getAirlineRoutes(airlineCode, departureDate),

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILITY
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Check API health and connection
   */
  healthCheck: () => amadeusFlightAPI.healthCheck(),
};
