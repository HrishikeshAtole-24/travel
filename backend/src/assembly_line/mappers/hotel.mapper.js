/**
 * Hotel Mapper - Convert Supplier Formats → Industry Standard Format
 * Maps hotel data from Amadeus (and future suppliers) to standard format
 * 
 * Standard Format:
 * - Hotel List → Standard hotel info objects
 * - Hotel Offers → Standard offer objects with pricing
 */
const logger = require('../../config/winstonLogger');

// ═══════════════════════════════════════════════════════════════
// 🏨 HOTEL LIST MAPPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Map single Amadeus hotel from list to standard format
 * @param {Object} amadeusHotel - Raw Amadeus hotel from Hotel List API
 * @param {string} supplierCode - Supplier code
 * @returns {Object} Standard hotel object
 */
const mapAmadeusHotel = (amadeusHotel, supplierCode = 'amadeus') => {
  try {
    return {
      hotelId: amadeusHotel.hotelId,
      name: amadeusHotel.name || 'Unknown Hotel',
      source: {
        supplier: supplierCode,
        supplierHotelId: amadeusHotel.hotelId,
        distributionChannel: amadeusHotel.source || 'GDS',
        fetchedAt: Date.now()
      },
      chainCode: amadeusHotel.chainCode || null,
      brandCode: amadeusHotel.brandCode || null,
      dupeId: amadeusHotel.dupeId || null,
      iataCode: amadeusHotel.iataCode || null,
      location: {
        latitude: amadeusHotel.geoCode?.latitude || null,
        longitude: amadeusHotel.geoCode?.longitude || null,
        address: {
          countryCode: amadeusHotel.address?.countryCode || null,
        },
        distance: amadeusHotel.distance ? {
          value: amadeusHotel.distance.value,
          unit: amadeusHotel.distance.unit
        } : null
      },
      lastUpdate: amadeusHotel.lastUpdate || null
    };
  } catch (error) {
    logger.error('Error mapping Amadeus hotel:', error);
    return null;
  }
};

/**
 * Map Amadeus hotel list response to standard format
 * @param {Object} amadeusData - Raw Amadeus API response
 * @param {string} supplierCode - Supplier code
 * @returns {Array} Array of standard hotel objects
 */
const mapAmadeusHotelList = (amadeusData, supplierCode = 'amadeus') => {
  try {
    if (!amadeusData || !amadeusData.data) {
      return [];
    }

    const hotels = amadeusData.data
      .map(hotel => mapAmadeusHotel(hotel, supplierCode))
      .filter(h => h !== null);

    logger.info(`✅ Mapped ${hotels.length} hotels from ${supplierCode}`);
    return hotels;
  } catch (error) {
    logger.error('Amadeus hotel list mapping error:', error);
    throw new Error('Failed to map Amadeus hotel list data');
  }
};

// ═══════════════════════════════════════════════════════════════
// 💰 HOTEL OFFER MAPPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Map single Amadeus hotel offer to standard format
 * @param {Object} amadeusOffer - Raw Amadeus offer from Hotel Search API
 * @param {Object} hotelInfo - Parent hotel info 
 * @param {string} supplierCode - Supplier code
 * @returns {Object} Standard hotel offer
 */
const mapAmadeusHotelOffer = (amadeusOffer, hotelInfo = {}, supplierCode = 'amadeus') => {
  try {
    // Map room info
    const room = amadeusOffer.room || {};
    const roomInfo = {
      type: room.type || null,
      typeEstimated: room.typeEstimated ? {
        category: room.typeEstimated.category || null,
        beds: room.typeEstimated.beds || null,
        bedType: room.typeEstimated.bedType || null
      } : null,
      description: room.description?.text || room.description?.lang || null,
    };

    // Map pricing
    const price = amadeusOffer.price || {};
    const pricing = {
      totalAmount: parseFloat(price.total || 0),
      totalCurrency: price.currency || 'USD',
      baseAmount: parseFloat(price.base || 0),
      taxesAmount: 0,
      markupAmount: parseFloat(price.markups?.[0]?.amount || 0),
      variations: null,
    };

    // Calculate taxes
    if (price.taxes && Array.isArray(price.taxes)) {
      pricing.taxesAmount = price.taxes.reduce((sum, tax) => {
        return sum + parseFloat(tax.amount || 0);
      }, 0);
      pricing.taxDetails = price.taxes.map(tax => ({
        code: tax.code || null,
        amount: parseFloat(tax.amount || 0),
        currency: tax.currency || pricing.totalCurrency,
        pricingFrequency: tax.pricingFrequency || null,
        pricingMode: tax.pricingMode || null,
        description: tax.description || null,
        isIncludedInTotal: tax.included || false
      }));
    }

    // Map price variations (per night)
    if (price.variations) {
      pricing.variations = {
        average: price.variations.average ? {
          baseAmount: parseFloat(price.variations.average.base || 0),
          totalAmount: parseFloat(price.variations.average.total || 0)
        } : null,
        changes: price.variations.changes?.map(change => ({
          startDate: change.startDate,
          endDate: change.endDate,
          baseAmount: parseFloat(change.base || 0),
          totalAmount: parseFloat(change.total || 0)
        })) || []
      };
    }

    // Map policies
    const policies = amadeusOffer.policies || {};
    const policyInfo = {
      paymentType: policies.paymentType || null,  // GUARANTEE, DEPOSIT, PREPAY
      cancellation: null,
      deposit: null,
      holdTime: null,
      checkInOut: null
    };

    // Cancellation policy
    if (policies.cancellation || policies.cancellations) {
      const cancellation = policies.cancellation || policies.cancellations;
      if (cancellation.deadline) {
        policyInfo.cancellation = {
          deadline: cancellation.deadline,
          description: cancellation.description?.text || null,
          amount: cancellation.amount ? parseFloat(cancellation.amount) : null,
          numberOfNights: cancellation.numberOfNights ? parseInt(cancellation.numberOfNights) : null,
          type: cancellation.type || null
        };
      } else if (Array.isArray(cancellation)) {
        policyInfo.cancellation = cancellation.map(c => ({
          deadline: c.deadline || null,
          description: c.description?.text || null,
          amount: c.amount ? parseFloat(c.amount) : null,
          numberOfNights: c.numberOfNights ? parseInt(c.numberOfNights) : null,
          type: c.type || null
        }));
      }
    }

    // Deposit policy
    if (policies.deposit) {
      policyInfo.deposit = {
        amount: policies.deposit.amount ? parseFloat(policies.deposit.amount) : null,
        deadline: policies.deposit.deadline || null,
        description: policies.deposit.description?.text || null,
        acceptedPayments: policies.deposit.acceptedPayments?.methods || []
      };
    }

    // Hold time
    if (policies.holdTime) {
      policyInfo.holdTime = {
        deadline: policies.holdTime.deadline || null
      };
    }

    // Check in/out
    if (policies.checkInOut) {
      policyInfo.checkInOut = {
        checkIn: policies.checkInOut.checkIn || null,
        checkOut: policies.checkInOut.checkOut || null,
        checkInDescription: policies.checkInOut.checkInDescription?.text || null,
        checkOutDescription: policies.checkInOut.checkOutDescription?.text || null
      };
    }

    // Build standard offer
    return {
      id: `HOTEL_OFFER_${amadeusOffer.id}`,
      source: {
        supplier: supplierCode,
        supplierOfferId: amadeusOffer.id,
        distributionChannel: 'GDS',
        fetchedAt: Date.now()
      },
      hotel: {
        hotelId: hotelInfo.hotelId || hotelInfo.hotel?.hotelId || null,
        name: hotelInfo.name || hotelInfo.hotel?.name || null,
        chainCode: hotelInfo.chainCode || hotelInfo.hotel?.chainCode || null,
        cityCode: hotelInfo.cityCode || hotelInfo.hotel?.cityCode || null,
        latitude: hotelInfo.latitude || hotelInfo.hotel?.latitude || null,
        longitude: hotelInfo.longitude || hotelInfo.hotel?.longitude || null,
      },
      checkInDate: amadeusOffer.checkInDate || null,
      checkOutDate: amadeusOffer.checkOutDate || null,
      roomQuantity: amadeusOffer.roomQuantity || 1,
      rateCode: amadeusOffer.rateCode || null,
      rateFamilyEstimated: amadeusOffer.rateFamilyEstimated ? {
        code: amadeusOffer.rateFamilyEstimated.code || null,
        type: amadeusOffer.rateFamilyEstimated.type || null
      } : null,
      boardType: amadeusOffer.boardType || null,
      room: roomInfo,
      guests: amadeusOffer.guests ? {
        adults: amadeusOffer.guests.adults || 1
      } : { adults: 1 },
      pricing,
      policies: policyInfo,
      self: amadeusOffer.self || null
    };
  } catch (error) {
    logger.error('Error mapping Amadeus hotel offer:', error);
    return null;
  }
};

/**
 * Map Amadeus hotel offers response to standard format
 * Handles the v3 hotel-offers response structure
 * @param {Object} amadeusData - Raw Amadeus API response
 * @param {string} supplierCode - Supplier code
 * @returns {Array} Array of standard hotel offer objects
 */
const mapAmadeusHotelOffers = (amadeusData, supplierCode = 'amadeus') => {
  try {
    if (!amadeusData || !amadeusData.data) {
      return [];
    }

    const allOffers = [];

    // v3 response: data is array of hotel objects, each with offers array
    const hotels = Array.isArray(amadeusData.data) ? amadeusData.data : [amadeusData.data];

    hotels.forEach(hotelData => {
      const hotelInfo = {
        hotelId: hotelData.hotel?.hotelId || hotelData.hotelId,
        name: hotelData.hotel?.name || hotelData.name,
        chainCode: hotelData.hotel?.chainCode || hotelData.chainCode,
        cityCode: hotelData.hotel?.cityCode || hotelData.cityCode,
        latitude: hotelData.hotel?.latitude || hotelData.hotel?.geoCode?.latitude,
        longitude: hotelData.hotel?.longitude || hotelData.hotel?.geoCode?.longitude,
      };

      if (hotelData.offers && Array.isArray(hotelData.offers)) {
        hotelData.offers.forEach(offer => {
          const mappedOffer = mapAmadeusHotelOffer(offer, hotelInfo, supplierCode);
          if (mappedOffer) {
            allOffers.push(mappedOffer);
          }
        });
      }
    });

    logger.info(`✅ Mapped ${allOffers.length} hotel offers from ${supplierCode}`);
    return allOffers;
  } catch (error) {
    logger.error('Amadeus hotel offers mapping error:', error);
    throw new Error('Failed to map Amadeus hotel offers data');
  }
};

// ═══════════════════════════════════════════════════════════════
// ⭐ HOTEL RATINGS MAPPER
// ═══════════════════════════════════════════════════════════════

/**
 * Map Amadeus hotel ratings to standard format
 * @param {Object} amadeusData - Raw Amadeus hotel sentiments response
 * @returns {Array} Standard hotel ratings
 */
const mapAmadeusHotelRatings = (amadeusData) => {
  try {
    if (!amadeusData || !amadeusData.data) {
      return [];
    }

    return amadeusData.data.map(hotel => ({
      hotelId: hotel.hotelId,
      overallRating: hotel.overallRating || null,
      numberOfReviews: hotel.numberOfReviews || null,
      numberOfRatings: hotel.numberOfRatings || null,
      sentiments: {
        sleepQuality: hotel.sentiments?.sleepQuality || null,
        service: hotel.sentiments?.service || null,
        facilities: hotel.sentiments?.facilities || null,
        roomComforts: hotel.sentiments?.roomComforts || null,
        valueForMoney: hotel.sentiments?.valueForMoney || null,
        catering: hotel.sentiments?.catering || null,
        location: hotel.sentiments?.location || null,
        pointsOfInterest: hotel.sentiments?.pointsOfInterest || null,
        staff: hotel.sentiments?.staff || null,
        swimmingPool: hotel.sentiments?.swimmingPool || null,
      }
    }));
  } catch (error) {
    logger.error('Amadeus hotel ratings mapping error:', error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔍 HOTEL AUTOCOMPLETE MAPPER
// ═══════════════════════════════════════════════════════════════

/**
 * Map Amadeus hotel autocomplete to standard format
 * @param {Object} amadeusData - Raw Amadeus autocomplete response
 * @returns {Array} Standard autocomplete results
 */
const mapAmadeusHotelAutocomplete = (amadeusData) => {
  try {
    if (!amadeusData || !amadeusData.data) {
      return [];
    }

    return amadeusData.data.map(item => ({
      id: item.id || null,
      name: item.name || null,
      hotelIds: item.hotelIds || [],
      subType: item.subType || null,
      iataCode: item.iataCode || null,
      address: {
        cityName: item.address?.cityName || null,
        countryCode: item.address?.countryCode || null,
      },
      geoCode: {
        latitude: item.geoCode?.latitude || null,
        longitude: item.geoCode?.longitude || null
      },
      relevance: item.relevance || null
    }));
  } catch (error) {
    logger.error('Amadeus hotel autocomplete mapping error:', error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔀 GENERIC MAPPER
// ═══════════════════════════════════════════════════════════════

/**
 * Generic hotel list mapper - routes to specific supplier mapper
 * @param {Object} rawData - Raw supplier data
 * @param {string} supplier - Supplier code
 * @returns {Array} Standard hotel list
 */
const mapHotelListData = (rawData, supplier = 'amadeus') => {
  switch (supplier.toLowerCase()) {
    case 'amadeus':
      return mapAmadeusHotelList(rawData, supplier);
    // Future: case 'booking': return mapBookingHotelList(rawData, supplier);
    default:
      logger.warn(`No hotel list mapper found for supplier: ${supplier}`);
      return [];
  }
};

/**
 * Generic hotel offers mapper - routes to specific supplier mapper
 * @param {Object} rawData - Raw supplier data
 * @param {string} supplier - Supplier code
 * @returns {Array} Standard hotel offers
 */
const mapHotelOffersData = (rawData, supplier = 'amadeus') => {
  switch (supplier.toLowerCase()) {
    case 'amadeus':
      return mapAmadeusHotelOffers(rawData, supplier);
    default:
      logger.warn(`No hotel offers mapper found for supplier: ${supplier}`);
      return [];
  }
};

module.exports = {
  mapHotelListData,
  mapHotelOffersData,
  mapAmadeusHotel,
  mapAmadeusHotelList,
  mapAmadeusHotelOffer,
  mapAmadeusHotelOffers,
  mapAmadeusHotelRatings,
  mapAmadeusHotelAutocomplete
};
