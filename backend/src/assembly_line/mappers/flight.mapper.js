/**
 * Flight Mapper - Convert Supplier Formats → Industry Standard Format
 * Maps data from Amadeus (and future suppliers) to NDC/OTA-style format
 */
const logger = require('../../config/winstonLogger');

/**
 * Parse ISO 8601 duration to minutes
 * Example: "PT2H30M" → 150 minutes
 */
const parseDuration = (duration) => {
  if (!duration) return 0;
  
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || 0);
  const minutes = parseInt(matches[2] || 0);
  
  return hours * 60 + minutes;
};

/**
 * Map Amadeus flight offer to standard format
 * @param {Object} amadeusOffer - Raw Amadeus offer
 * @param {string} supplierCode - Supplier code
 * @returns {Object} Standard flight offer
 */
const mapAmadeusOffer = (amadeusOffer, supplierCode = 'amadeus') => {
  try {
    // Map slices (outbound, inbound)
    const slices = amadeusOffer.itineraries.map((itinerary, index) => {
      const sliceId = index === 0 ? 'OUTBOUND' : 'INBOUND';
      
      // Map segments
      const segments = itinerary.segments.map((seg, segIndex) => ({
        segmentId: `SEG${index + 1}_${segIndex + 1}`,
        marketingAirlineCode: seg.carrierCode,
        operatingAirlineCode: seg.operating?.carrierCode || seg.carrierCode,
        flightNumber: seg.number,
        departure: {
          airportCode: seg.departure.iataCode,
          terminal: seg.departure.terminal || null,
          time: seg.departure.at
        },
        arrival: {
          airportCode: seg.arrival.iataCode,
          terminal: seg.arrival.terminal || null,
          time: seg.arrival.at
        },
        aircraftCode: seg.aircraft?.code || null,
        cabinClass: mapCabinClass(seg.cabin),
        bookingClass: seg.bookingClass || seg.pricingDetailPerAdult?.availabilityClass || null,
        baggage: {
          checkIn: {
            pieces: 1,
            weightKg: 25 // Default - should be parsed from includedCheckedBags
          },
          cabin: {
            pieces: 1,
            weightKg: 7
          }
        },
        durationMinutes: parseDuration(seg.duration)
      }));

      return {
        sliceId,
        durationMinutes: parseDuration(itinerary.duration),
        segments
      };
    });

    // Map pricing
    const pricing = {
      totalAmount: parseFloat(amadeusOffer.price.total),
      totalCurrency: amadeusOffer.price.currency,
      baseAmount: parseFloat(amadeusOffer.price.base || 0),
      taxesAmount: parseFloat(amadeusOffer.price.total) - parseFloat(amadeusOffer.price.base || 0),
      fareFamily: null, // Amadeus may provide this in some responses
      isRefundable: false, // Parse from fareDetailsBySegment if available
      isChangeable: true,
      penaltiesSummary: {
        changeFeeType: 'VARIABLE',
        refundFeeType: 'NOT_PERMITTED'
      }
    };

    // Map traveler pricing
    const travelerPricing = amadeusOffer.travelerPricings?.map(tp => {
      const fareDetails = tp.fareDetailsBySegment?.map((fd, idx) => ({
        segmentId: `SEG${Math.floor(idx / slices[0].segments.length) + 1}_${(idx % slices[0].segments.length) + 1}`,
        cabinClass: mapCabinClass(fd.cabin),
        bookingClass: fd.class,
        fareBasisCode: fd.fareBasis || null,
        baggage: {
          checkInPieces: fd.includedCheckedBags?.quantity || 1,
          checkInWeightKg: fd.includedCheckedBags?.weight || 25
        }
      })) || [];

      return {
        travelerType: tp.travelerType,
        quantity: 1,
        price: {
          totalAmount: parseFloat(tp.price.total),
          totalCurrency: tp.price.currency,
          baseAmount: parseFloat(tp.price.base || 0),
          taxesAmount: parseFloat(tp.price.total) - parseFloat(tp.price.base || 0)
        },
        fareDetailsBySegment: fareDetails
      };
    }) || [];

    // Build standard offer
    return {
      id: `OFFER_${amadeusOffer.id}`,
      source: {
        supplier: supplierCode,
        supplierOfferId: amadeusOffer.id,
        distributionChannel: 'GDS',
        fetchedAt: Date.now()
      },
      itinerary: {
        slices
      },
      pricing,
      travelerPricing,
      validatingAirlineCode: amadeusOffer.validatingAirlineCodes?.[0] || slices[0].segments[0].marketingAirlineCode
    };

  } catch (error) {
    logger.error('Error mapping Amadeus offer:', error);
    throw error;
  }
};

/**
 * Map cabin class from Amadeus format to standard
 */
const mapCabinClass = (amadeusClass) => {
  const mapping = {
    'ECONOMY': 'ECONOMY',
    'PREMIUM_ECONOMY': 'PREMIUM_ECONOMY',
    'BUSINESS': 'BUSINESS',
    'FIRST': 'FIRST'
  };
  return mapping[amadeusClass] || 'ECONOMY';
};

/**
 * Map Amadeus flight data to standardized format
 * @param {Object} amadeusData - Raw Amadeus API response
 * @param {string} supplierCode - Supplier identifier
 * @returns {Array} Array of standard flight offers
 */
const mapAmadeusData = (amadeusData, supplierCode = 'amadeus') => {
  try {
    if (!amadeusData || !amadeusData.data) {
      return [];
    }

    const offers = amadeusData.data.map(offer => mapAmadeusOffer(offer, supplierCode));

    logger.info(`✅ Mapped ${offers.length} flight offers from ${supplierCode}`);
    return offers;

  } catch (error) {
    logger.error('Amadeus data mapping error:', error);
    throw new Error('Failed to map Amadeus flight data');
  }
};

/**
 * Generic mapper - routes to specific supplier mapper
 * @param {Object} rawData - Raw supplier data
 * @param {string} supplier - Supplier code
 * @returns {Array} Standard flight offers
 */
const mapFlightData = (rawData, supplier = 'amadeus') => {
  switch (supplier.toLowerCase()) {
    case 'amadeus':
      return mapAmadeusData(rawData, supplier);
    
    // Future suppliers
    // case 'sabre':
    //   return mapSabreData(rawData, supplier);
    // case 'travelport':
    //   return mapTravelportData(rawData, supplier);
    
    default:
      logger.warn(`No mapper found for supplier: ${supplier}`);
      return [];
  }
};

module.exports = { 
  mapFlightData,
  mapAmadeusData,
  mapAmadeusOffer,
  parseDuration
};
