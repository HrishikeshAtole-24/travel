// Amadeus Supplier Export
const amadeusFlightAPI = require('./amadeus.flight');

module.exports = {
  searchFlights: (params) => amadeusFlightAPI.searchFlights(params),
  getFlightDetails: (flightId) => amadeusFlightAPI.getFlightDetails(flightId),
  getFlightPrice: (flightOffer) => amadeusFlightAPI.getFlightPrice(flightOffer),
  createFlightOrder: (flightOffer, travelers) => amadeusFlightAPI.createFlightOrder(flightOffer, travelers),
};
