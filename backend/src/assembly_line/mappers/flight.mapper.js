/**
 * Flight Mapper - Convert Supplier Formats → Industry Standard Format
 * Maps data from Amadeus (and future suppliers) to NDC/OTA-style format
 */
const logger = require('../../config/winstonLogger');

/**
 * Parse ISO 8601 duration to minutes
 * Examples: "PT2H30M" → 150, "P1DT50M" → 1490 (Duffel uses days for long journeys)
 */
const parseDuration = (duration) => {
  if (!duration) return 0;

  const matches = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!matches) return 0;

  const days = parseInt(matches[1] || 0);
  const hours = parseInt(matches[2] || 0);
  const minutes = parseInt(matches[3] || 0);

  return days * 24 * 60 + hours * 60 + minutes;
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

// ═══════════════════════════════════════════════════════════════
// ✈️ DUFFEL
// ═══════════════════════════════════════════════════════════════

// Duffel passenger types → standard traveler types
const DUFFEL_PASSENGER_TYPES = {
  adult: 'ADULT',
  child: 'CHILD',
  infant_without_seat: 'INFANT'
};

/**
 * Summarize Duffel baggage list into the standard baggage shape
 * Duffel gives piece counts per type; weights are not provided.
 */
const mapDuffelBaggage = (baggages = []) => {
  const pieces = (type) => (baggages || [])
    .filter(b => b.type === type)
    .reduce((sum, b) => sum + (b.quantity || 0), 0);

  return {
    checkIn: { pieces: pieces('checked'), weightKg: null },
    cabin: { pieces: pieces('carry_on'), weightKg: null }
  };
};

/**
 * Map a Duffel offer to the standard offer format
 * @param {Object} duffelOffer - Raw Duffel offer
 * @param {string} supplierCode - Supplier code
 * @returns {Object} Standard flight offer
 */
const mapDuffelOffer = (duffelOffer, supplierCode = 'duffel') => {
  const passengerTypes = Object.fromEntries(
    (duffelOffer.passengers || []).map(p => [p.id, DUFFEL_PASSENGER_TYPES[p.type] || 'ADULT'])
  );
  // Baggage/fare shown on the segment is taken from the first passenger
  const leadPassengerId = duffelOffer.passengers?.[0]?.id;

  const slices = duffelOffer.slices.map((slice, sliceIndex) => {
    const segments = slice.segments.map((seg, segIndex) => {
      const leadPax = seg.passengers?.find(p => p.passenger_id === leadPassengerId) || seg.passengers?.[0] || {};

      return {
        segmentId: `SEG${sliceIndex + 1}_${segIndex + 1}`,
        supplierSegmentId: seg.id,
        marketingAirlineCode: seg.marketing_carrier?.iata_code,
        marketingAirlineName: seg.marketing_carrier?.name || null,
        marketingAirlineLogo: seg.marketing_carrier?.logo_symbol_url || null,
        operatingAirlineCode: seg.operating_carrier?.iata_code || seg.marketing_carrier?.iata_code,
        flightNumber: seg.marketing_carrier_flight_number,
        departure: {
          airportCode: seg.origin?.iata_code,
          airportName: seg.origin?.name || null,
          cityName: seg.origin?.city_name || null,
          countryCode: seg.origin?.iata_country_code || null,
          timeZone: seg.origin?.time_zone || null,
          terminal: seg.origin_terminal || null,
          time: seg.departing_at
        },
        arrival: {
          airportCode: seg.destination?.iata_code,
          airportName: seg.destination?.name || null,
          cityName: seg.destination?.city_name || null,
          countryCode: seg.destination?.iata_country_code || null,
          timeZone: seg.destination?.time_zone || null,
          terminal: seg.destination_terminal || null,
          time: seg.arriving_at
        },
        aircraftCode: seg.aircraft?.iata_code || null,
        aircraftName: seg.aircraft?.name || null,
        cabinClass: mapCabinClass(String(leadPax.cabin_class || 'economy').toUpperCase()),
        bookingClass: null, // Duffel does not expose RBD
        fareBasisCode: leadPax.fare_basis_code || null,
        baggage: mapDuffelBaggage(leadPax.baggages),
        durationMinutes: parseDuration(seg.duration),
        technicalStops: (seg.stops || []).length
      };
    });

    return {
      sliceId: sliceIndex === 0 ? 'OUTBOUND' : 'INBOUND',
      supplierSliceId: slice.id,
      durationMinutes: parseDuration(slice.duration),
      fareBrandName: slice.fare_brand_name || null,
      segments
    };
  });

  const totalAmount = parseFloat(duffelOffer.total_amount);
  const baseAmount = parseFloat(duffelOffer.base_amount || 0);
  const taxesAmount = parseFloat(duffelOffer.tax_amount || 0);
  const refund = duffelOffer.conditions?.refund_before_departure;
  const change = duffelOffer.conditions?.change_before_departure;

  const feeType = (condition) => {
    if (!condition) return 'UNKNOWN';
    if (!condition.allowed) return 'NOT_PERMITTED';
    return parseFloat(condition.penalty_amount || 0) > 0 ? 'FIXED' : 'FREE';
  };

  const pricing = {
    totalAmount,
    totalCurrency: duffelOffer.total_currency,
    baseAmount,
    taxesAmount,
    fareFamily: slices[0]?.fareBrandName || null,
    isRefundable: Boolean(refund?.allowed),
    isChangeable: Boolean(change?.allowed),
    penaltiesSummary: {
      changeFeeType: feeType(change),
      refundFeeType: feeType(refund)
    }
  };

  // Duffel prices the offer as a whole; per-traveler amounts are not itemised
  const travelerPricing = (duffelOffer.passengers || []).map(p => ({
    travelerType: passengerTypes[p.id],
    supplierPassengerId: p.id,
    quantity: 1,
    price: null,
    fareDetailsBySegment: slices.flatMap((slice, sliceIndex) =>
      duffelOffer.slices[sliceIndex].segments.map((seg, segIndex) => {
        const pax = seg.passengers?.find(sp => sp.passenger_id === p.id) || {};
        const baggage = mapDuffelBaggage(pax.baggages);
        return {
          segmentId: slice.segments[segIndex].segmentId,
          cabinClass: mapCabinClass(String(pax.cabin_class || 'economy').toUpperCase()),
          bookingClass: null,
          fareBasisCode: pax.fare_basis_code || null,
          baggage: {
            checkInPieces: baggage.checkIn.pieces,
            checkInWeightKg: null
          }
        };
      })
    )
  }));

  return {
    id: `OFFER_${duffelOffer.id}`,
    source: {
      supplier: supplierCode,
      supplierOfferId: duffelOffer.id,
      distributionChannel: 'NDC',
      fetchedAt: Date.now(),
      expiresAt: duffelOffer.expires_at || null,
      liveMode: Boolean(duffelOffer.live_mode)
    },
    itinerary: {
      slices
    },
    pricing,
    travelerPricing,
    // What the booking form must collect, in the order the airline expects
    passengers: (duffelOffer.passengers || []).map(p => ({
      supplierPassengerId: p.id,
      type: passengerTypes[p.id]
    })),
    requirements: {
      identityDocumentsRequired: Boolean(duffelOffer.passenger_identity_documents_required),
      instantPaymentRequired: Boolean(duffelOffer.payment_requirements?.requires_instant_payment)
    },
    validatingAirlineCode: duffelOffer.owner?.iata_code || slices[0].segments[0].marketingAirlineCode,
    validatingAirlineName: duffelOffer.owner?.name || null,
    emissionsKg: duffelOffer.total_emissions_kg ? parseFloat(duffelOffer.total_emissions_kg) : null
  };
};

/**
 * Map Duffel data to standardized format
 * Accepts an offer request response ({ data: { offers: [] } })
 * or a single offer response ({ data: { id: 'off_...' } }).
 * @param {Object} duffelData - Raw Duffel API response
 * @param {string} supplierCode - Supplier identifier
 * @returns {Array} Array of standard flight offers
 */
const mapDuffelData = (duffelData, supplierCode = 'duffel') => {
  const data = duffelData?.data;
  if (!data) return [];

  const rawOffers = Array.isArray(data.offers) ? data.offers : (data.id ? [data] : []);
  const offers = [];

  for (const raw of rawOffers) {
    try {
      offers.push(mapDuffelOffer(raw, supplierCode));
    } catch (error) {
      // One malformed offer must not break the whole search
      logger.warn(`Skipping unmappable Duffel offer ${raw?.id}: ${error.message}`);
    }
  }

  logger.info(`✅ Mapped ${offers.length} flight offers from ${supplierCode}`);
  return offers;
};

// ═══════════════════════════════════════════════════════════════
// ✈️ LITEAPI (Nuitée Connect)
// ═══════════════════════════════════════════════════════════════

// LiteAPI cabin names ("Economy", "Premium Economy") → standard cabin codes
const mapLiteApiCabin = (cabin) =>
  mapCabinClass(String(cabin || 'ECONOMY').toUpperCase().replace(/\s+/g, '_'));

/**
 * Summarize LiteAPI included baggage into the standard baggage shape
 * Uses allowances for adults (ADT) or all passengers (ALL).
 */
const mapLiteApiBaggage = (baggage) => {
  const included = (baggage?.included || []).filter(b => ['ADT', 'ALL'].includes(b.passengerType || 'ALL'));
  const pick = (types) => included.filter(b => types.includes(b.bagType));
  const summarize = (bags) => ({
    pieces: bags.reduce((sum, b) => sum + (b.pieces || 0), 0),
    weightKg: bags.find(b => b.weightKg)?.weightKg ?? null
  });
  return {
    checkIn: summarize(pick(['checked'])),
    cabin: summarize(pick(['cabin', 'personal']))
  };
};

/**
 * Map one LiteAPI journey + fare offer to the standard offer format
 * @param {Object} journey - LiteAPI journey (segments, legDurations, ...)
 * @param {Object} offer - The fare (pricing, baggage, fare, terms, segmentFares)
 * @param {string} offerId - LiteAPI offer ID (verify responses don't include it)
 * @param {Object|null} passengerCounts - { adults, children, infants } when known (verify)
 * @param {string} supplierCode
 */
const mapLiteApiJourney = (journey, offer, offerId, passengerCounts, supplierCode = 'liteapi') => {
  const segmentFares = offer.segmentFares || [];
  const baggage = mapLiteApiBaggage(offer.baggage);
  const directions = ['OUTBOUND', 'INBOUND'];
  let segmentIndex = 0;

  const slices = directions
    .map((direction, sliceIndex) => {
      const segs = (journey.segments || []).filter(g => (g.direction || 'OUTBOUND') === direction);
      if (segs.length === 0) return null;

      const segments = segs.map((seg, i) => {
        const fare = segmentFares[segmentIndex++] || {};
        return {
          segmentId: `SEG${sliceIndex + 1}_${i + 1}`,
          supplierSegmentId: seg.segmentKey || null,
          marketingAirlineCode: seg.carrier?.marketingCode,
          marketingAirlineName: seg.carrier?.marketingName || null,
          marketingAirlineLogo: seg.carrier?.marketingLogo || null,
          operatingAirlineCode: seg.carrier?.operatingCode || seg.carrier?.marketingCode,
          flightNumber: seg.flight?.marketingNumber,
          departure: {
            airportCode: seg.originCode,
            airportName: seg.originName || null,
            terminal: seg.originTerminal || null,
            time: seg.departureTime
          },
          arrival: {
            airportCode: seg.destinationCode,
            airportName: seg.destinationName || null,
            terminal: seg.destinationTerminal || null,
            time: seg.arrivalTime
          },
          aircraftCode: seg.aircraft?.code || null,
          aircraftName: seg.aircraft?.name || null,
          cabinClass: mapLiteApiCabin(fare.cabin),
          bookingClass: fare.bookingCode || null,
          fareBasisCode: fare.fareBasisCode || null,
          baggage,
          durationMinutes: seg.duration?.minutes ?? parseDuration(seg.duration?.iso8601),
          technicalStops: seg.stopCount || 0
        };
      });

      const legDuration = (journey.legDurations || []).find(l => l.direction === direction);
      const fallbackMinutes = Math.round(
        (new Date(segs[segs.length - 1].arrivalTime) - new Date(segs[0].departureTime)) / 60000
      );

      return {
        sliceId: direction,
        durationMinutes: legDuration?.duration?.minutes ?? fallbackMinutes,
        fareBrandName: offer.fare?.family || null,
        segments
      };
    })
    .filter(Boolean);

  const display = offer.pricing?.display || {};
  const terms = offer.terms || {};
  const feeType = (allowed, hasFee) => {
    if (allowed === undefined) return 'UNKNOWN';
    if (!allowed) return 'NOT_PERMITTED';
    return hasFee ? 'VARIABLE' : 'FREE';
  };

  const pricing = {
    totalAmount: parseFloat(display.total),
    totalCurrency: display.currency,
    baseAmount: parseFloat(display.base || 0),
    taxesAmount: Math.round(((display.taxes || 0) + (display.fees || 0)) * 100) / 100,
    fareFamily: offer.fare?.family || null,
    isRefundable: Boolean(terms.refundable),
    isChangeable: Boolean(terms.changeable),
    penaltiesSummary: {
      changeFeeType: feeType(terms.changeable, terms.hasChangeFee),
      refundFeeType: feeType(terms.refundable, terms.hasRefundFee)
    },
    termsSummary: (terms.summary || []).map(t => t.message)
  };

  // Per-passenger-type prices are itemised by LiteAPI
  const perPassenger = display.perPassenger || {};
  const counts = passengerCounts || {};
  const travelerTypes = [
    ['ADULT', 'adult', counts.adults],
    ['CHILD', 'child', counts.children],
    ['INFANT', 'infant', counts.infants]
  ];

  const travelerPricing = travelerTypes
    .filter(([, key, count]) => perPassenger[key] && (passengerCounts ? count > 0 : key === 'adult'))
    .map(([type, key, count]) => ({
      travelerType: type,
      quantity: count || 1,
      price: {
        totalAmount: parseFloat(perPassenger[key].total),
        totalCurrency: perPassenger[key].currency || display.currency,
        baseAmount: parseFloat(perPassenger[key].base || 0),
        taxesAmount: Math.round(((perPassenger[key].taxes || 0) + (perPassenger[key].fees || 0)) * 100) / 100
      },
      fareDetailsBySegment: []
    }));

  // LiteAPI has no passenger IDs: slots are positional (same order sent at prebook)
  const passengers = passengerCounts ? travelerTypes.flatMap(([type, , count]) =>
    Array.from({ length: count || 0 }, (_, i) => ({ supplierPassengerId: `${type}_${i + 1}`, type }))
  ) : [];

  const firstSegment = slices[0]?.segments[0] || {};

  return {
    id: `OFFER_LITEAPI_${journey.journeyKey || offerId.slice(-16)}`,
    source: {
      supplier: supplierCode,
      supplierOfferId: offerId,
      distributionChannel: 'AGGREGATOR',
      fetchedAt: Date.now(),
      expiresAt: offer.expiration || journey.expiration || null
    },
    itinerary: { slices },
    pricing,
    travelerPricing,
    passengers,
    requirements: {
      identityDocumentsRequired: false,
      instantPaymentRequired: true,
      holdBeforePayment: true // seats are held at prebook, before the customer pays
    },
    validatingAirlineCode: firstSegment.marketingAirlineCode,
    validatingAirlineName: firstSegment.marketingAirlineName,
    seatsRemaining: offer.fare?.seatsRemaining ?? null
  };
};

/**
 * Map LiteAPI flight data to standardized format
 * Accepts a search response ({ data: [{ journeys }] }) or a verify response
 * ({ data: [{ journey, changes }], requestedOfferId }).
 */
const mapLiteApiFlightData = (liteData, supplierCode = 'liteapi') => {
  const first = Array.isArray(liteData?.data) ? liteData.data[0] : liteData?.data;
  if (!first) return [];

  const offers = [];

  // Verify response: the fare is merged into the journey itself
  if (first.journey) {
    try {
      offers.push(mapLiteApiJourney(first.journey, first.journey, liteData.requestedOfferId, first.journey.passengers || null, supplierCode));
    } catch (error) {
      logger.warn(`Skipping unmappable LiteAPI verify response: ${error.message}`);
    }
    return offers;
  }

  for (const journey of first.journeys || []) {
    const offer = journey.cheapestOffer || journey.offers?.[0];
    if (!offer?.offerId) continue;
    try {
      offers.push(mapLiteApiJourney(journey, offer, offer.offerId, null, supplierCode));
    } catch (error) {
      // One malformed journey must not break the whole search
      logger.warn(`Skipping unmappable LiteAPI journey ${journey.journeyKey}: ${error.message}`);
    }
  }

  logger.info(`✅ Mapped ${offers.length} flight offers from ${supplierCode}`);
  return offers;
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

    case 'duffel':
      return mapDuffelData(rawData, supplier);

    case 'liteapi':
      return mapLiteApiFlightData(rawData, supplier);
    
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
  mapDuffelData,
  mapDuffelOffer,
  mapLiteApiFlightData,
  parseDuration
};
