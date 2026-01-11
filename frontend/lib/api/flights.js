/**
 * Flight API Functions
 * Handles all flight-related API calls
 */

import apiClient from './client';

/**
 * Transform frontend flight format to Amadeus API format
 * @param {Object} flight - Frontend transformed flight object
 * @returns {Object} - Amadeus-compatible flight offer
 */
function transformToAmadeusFormat(flight) {
  // If already has source.originalOffer, use that
  if (flight.source?.originalOffer) {
    return flight.source.originalOffer;
  }

  // Build Amadeus format from our transformed data
  const itinerary = flight.itinerary || {};
  const slices = itinerary.slices || [];
  
  // Build itineraries array
  const itineraries = slices.map(slice => ({
    duration: slice.durationFormatted?.replace(/(\d+)h\s*(\d+)m/, 'PT$1H$2M') || 'PT0H0M',
    segments: (slice.segments || []).map((seg, segIdx) => ({
      departure: {
        iataCode: seg.departure?.airportCode || seg.departure?.airport,
        terminal: seg.departure?.terminal || undefined,
        at: seg.departure?.time
      },
      arrival: {
        iataCode: seg.arrival?.airportCode || seg.arrival?.airport,
        terminal: seg.arrival?.terminal || undefined,
        at: seg.arrival?.time
      },
      carrierCode: seg.marketingAirlineCode || seg.airlineCode,
      number: seg.flightNumber?.replace(/[A-Z]+/g, '') || '0',
      aircraft: {
        code: seg.aircraftCode || '320'
      },
      operating: {
        carrierCode: seg.operatingAirlineCode || seg.marketingAirlineCode || seg.airlineCode
      },
      duration: `PT${Math.floor(seg.durationMinutes / 60)}H${seg.durationMinutes % 60}M`,
      id: seg.segmentId?.replace(/[^a-zA-Z0-9]/g, '') || `${segIdx + 1}`,
      numberOfStops: 0,
      blacklistedInEU: false
    }))
  }));

  // Build traveler pricings
  const travelerPricings = (flight.travelerPricing || []).map((tp, idx) => ({
    travelerId: `${idx + 1}`,
    fareOption: 'STANDARD',
    travelerType: tp.travelerType || 'ADULT',
    price: {
      currency: flight.price?.currency || 'EUR',
      total: String(tp.price?.totalAmount || flight.price?.total || 0),
      base: String(tp.price?.baseAmount || flight.price?.base || 0)
    },
    fareDetailsBySegment: (tp.fareDetailsBySegment || []).map(fare => ({
      segmentId: fare.segmentId?.replace(/[^a-zA-Z0-9]/g, '') || '1',
      cabin: fare.cabinClass || 'ECONOMY',
      fareBasis: fare.fareBasisCode || 'ECONOMY',
      class: fare.bookingClass || 'Y',
      includedCheckedBags: fare.baggage?.checkInWeightKg ? {
        weight: fare.baggage.checkInWeightKg,
        weightUnit: 'KG'
      } : {
        quantity: fare.baggage?.checkInPieces || 1
      }
    }))
  }));

  // Build Amadeus offer with clean alphanumeric ID
  const cleanId = (flight.id || flight.offerId || 'OFFER1').replace(/[^a-zA-Z0-9]/g, '');
  
  return {
    type: 'flight-offer',
    id: cleanId,
    source: 'GDS',
    instantTicketingRequired: false,
    nonHomogeneous: false,
    oneWay: slices.length === 1,
    lastTicketingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    numberOfBookableSeats: 9,
    itineraries: itineraries,
    price: {
      currency: flight.price?.currency || 'EUR',
      total: String(flight.price?.total || 0),
      base: String(flight.price?.base || 0),
      fees: [{
        amount: '0.00',
        type: 'SUPPLIER'
      }],
      grandTotal: String(flight.price?.total || 0)
    },
    pricingOptions: {
      fareType: ['PUBLISHED'],
      includedCheckedBagsOnly: true
    },
    validatingAirlineCodes: [flight.validatingAirlineCode || 'XX'],
    travelerPricings: travelerPricings.length > 0 ? travelerPricings : [{
      travelerId: '1',
      fareOption: 'STANDARD',
      travelerType: 'ADULT',
      price: {
        currency: flight.price?.currency || 'EUR',
        total: String(flight.price?.total || 0),
        base: String(flight.price?.base || 0)
      },
      fareDetailsBySegment: itineraries[0]?.segments?.map((seg, idx) => ({
        segmentId: seg.id,
        cabin: 'ECONOMY',
        fareBasis: 'ECONOMY',
        class: 'Y',
        includedCheckedBags: {
          quantity: 1
        }
      })) || []
    }]
  };
}

/**
 * Validate flight price before booking
 * @param {Object} flightOffer - The flight offer object to validate
 * @returns {Promise<Object>} - Validated flight offer with updated pricing
 */
export async function validateFlightPrice(flightOffer) {
  try {
    // Transform to Amadeus format if needed
    const amadeusOffer = transformToAmadeusFormat(flightOffer);
    
    console.log('🔄 Transformed offer for validation:', amadeusOffer);

    const response = await apiClient.post('/flights/price', {
      flightOffer: amadeusOffer
    });
    
    return response;
  } catch (error) {
    console.error('❌ Price validation error:', error);
    throw new Error(error.message || 'Failed to validate flight price');
  }
}

/**
 * Search for flights
 * @param {Object} searchParams - Search parameters
 * @returns {Promise<Object>} - Flight search results
 */
export async function searchFlights(searchParams) {
  try {
    const response = await apiClient.get('/flights/search', searchParams);
    return response;
  } catch (error) {
    console.error('❌ Flight search error:', error);
    throw new Error(error.message || 'Failed to search flights');
  }
}
