// Assembly Line - Export All Assembly Functions
const { mapFlightData } = require('./mappers/flight.mapper');
const { validateFlightData } = require('./validators/flight.validator');
const { transformFlightData } = require('./transformers/flight.transform');

module.exports = {
  mapFlightData,
  validateFlightData,
  transformFlightData,
};
