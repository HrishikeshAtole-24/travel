'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import SearchFilters from '../components/SearchFilters/SearchFilters';
import FlightCard from '../components/FlightCard/FlightCard';
import SearchWidgetCompact from '../components/SearchWidgetCompact/SearchWidgetCompact';
import apiClient from '@/lib/api/client';
import './search.css';

function SearchContent() {
  const searchParams = useSearchParams();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [airportInfo, setAirportInfo] = useState({ from: null, to: null });
  const [sortBy, setSortBy] = useState('price'); // Default sort
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000, currency: 'INR' }); // Dynamic price range
  const [filters, setFilters] = useState({
    stops: 'any',
    priceRange: [0, 100000],
    departureTime: 'any',
    airlines: []
  });

  // Fetch airport info for displaying city names
  useEffect(() => {
    const fetchAirportInfo = async () => {
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      
      try {
        const [fromResponse, toResponse] = await Promise.all([
          from ? apiClient.get(`/airports/${from}`).catch(() => null) : null,
          to ? apiClient.get(`/airports/${to}`).catch(() => null) : null
        ]);
        
        console.log('Airport API responses:', { fromResponse, toResponse });
        
        setAirportInfo({
          from: fromResponse?.data ? {
            iata_code: fromResponse.data.iata,
            city_name: fromResponse.data.city,
            airport_name: fromResponse.data.name
          } : { iata_code: from, city_name: from },
          to: toResponse?.data ? {
            iata_code: toResponse.data.iata,
            city_name: toResponse.data.city,
            airport_name: toResponse.data.name
          } : { iata_code: to, city_name: to }
        });
      } catch (err) {
        console.error('Error fetching airport info:', err);
        setAirportInfo({
          from: { iata_code: from, city_name: from },
          to: { iata_code: to, city_name: to }
        });
      }
    };
    
    fetchAirportInfo();
  }, [searchParams]);

  useEffect(() => {
    searchFlights();
  }, [searchParams]);

  const searchFlights = async () => {
    try {
      setLoading(true);
      setError(null);

      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const departDate = searchParams.get('departDate');
      const returnDate = searchParams.get('returnDate');
      const passengers = searchParams.get('passengers') || 1;
      const cabinClass = searchParams.get('cabinClass') || 'economy';

      // Validate required parameters
      if (!from || !to || !departDate) {
        setError('Please select departure city, destination city, and travel date');
        setLoading(false);
        return;
      }

      if (from.trim() === '' || to.trim() === '') {
        setError('Please select valid departure and destination airports');
        setLoading(false);
        return;
      }

      // Build API request with query parameters
      const queryParams = new URLSearchParams({
        origin: from.trim(),
        destination: to.trim(),
        departureDate: departDate,
        adults: parseInt(passengers),
        cabinClass: cabinClass.toUpperCase(),
        currency: 'INR'
      });

      // Add return date if provided
      if (returnDate) {
        queryParams.append('returnDate', returnDate);
      }

      const response = await apiClient.get(`/flights/search?${queryParams.toString()}`);
      
      console.log('✈️ Flight API Response:', response);
      
      if (response && response.data && Array.isArray(response.data)) {
        // API returns flights directly in response.data array
        console.log('✈️ Flights data:', response.data.length, 'flights found');
        
        // Transform API data to match FlightCard component expectations with FULL DATA
        const transformedFlights = response.data.map(flight => {
          const itinerary = flight.itinerary || {};
          const firstSlice = itinerary.slices?.[0] || {};
          const firstSegment = firstSlice.segments?.[0] || {};
          const lastSegment = firstSlice.segments?.[firstSlice.segments?.length - 1] || firstSegment;
          
          // Extract all segments with full details
          const allSegments = firstSlice.segments?.map((seg, idx) => ({
            segmentId: seg.segmentId || `SEG_${idx}`,
            airlineCode: seg.marketingAirlineCode || seg.carrier || 'XX',
            operatingAirlineCode: seg.operatingAirlineCode || seg.marketingAirlineCode,
            airlineName: response.dictionaries?.airlines?.[seg.marketingAirlineCode]?.name || 
                        seg.airlineName || 'Unknown Airline',
            flightNumber: `${seg.marketingAirlineCode || ''}${seg.flightNumber || ''}`.trim(),
            aircraftCode: seg.aircraftCode || null,
            aircraftName: seg.aircraftCode ? (response.dictionaries?.aircraft?.[seg.aircraftCode]?.name || seg.aircraftCode) : null,
            departure: {
              time: seg.departure?.time,
              airport: seg.departure?.airportCode || seg.departure?.airport,
              terminal: seg.departure?.terminal || null,
              formatted: seg.departure?.formatted || null
            },
            arrival: {
              time: seg.arrival?.time,
              airport: seg.arrival?.airportCode || seg.arrival?.airport,
              terminal: seg.arrival?.terminal || null,
              formatted: seg.arrival?.formatted || null,
              nextDay: seg.arrival?.formatted?.nextDay || false
            },
            duration: seg.durationMinutes,
            cabinClass: seg.cabinClass || 'ECONOMY',
            bookingClass: seg.bookingClass || null,
            baggage: seg.baggage || {
              checkIn: { pieces: 1, weightKg: 15 },
              cabin: { pieces: 1, weightKg: 7 }
            }
          })) || [];

          // Calculate layovers
          const layovers = firstSlice.layovers || [];
          
          return {
            ...flight,
            // Main segment for card display
            segments: [{
              airlineCode: flight.validatingAirlineCode || firstSegment.marketingAirlineCode || 'XX',
              operatingAirlineCode: firstSegment.operatingAirlineCode || firstSegment.marketingAirlineCode,
              airlineName: response.dictionaries?.airlines?.[flight.validatingAirlineCode]?.name || 
                          response.dictionaries?.airlines?.[firstSegment.marketingAirlineCode]?.name || 
                          'Unknown Airline',
              flightNumber: `${firstSegment.marketingAirlineCode || ''}${firstSegment.flightNumber || ''}`.trim(),
              aircraftCode: firstSegment.aircraftCode || null,
              aircraftName: firstSegment.aircraftCode ? 
                (response.dictionaries?.aircraft?.[firstSegment.aircraftCode]?.name || firstSegment.aircraftCode) : null,
              departure: {
                time: firstSegment.departure?.time,
                airport: firstSegment.departure?.airportCode || firstSegment.departure?.airport,
                terminal: firstSegment.departure?.terminal,
                formatted: firstSegment.departure?.formatted
              },
              arrival: {
                time: lastSegment.arrival?.time, 
                airport: lastSegment.arrival?.airportCode || lastSegment.arrival?.airport,
                terminal: lastSegment.arrival?.terminal,
                formatted: lastSegment.arrival?.formatted,
                nextDay: lastSegment.arrival?.formatted?.nextDay || false
              },
              duration: flight.computed?.totalDurationMinutes || firstSlice.durationMinutes,
              durationFormatted: flight.computed?.totalDurationFormatted || firstSlice.durationFormatted,
              stops: flight.computed?.totalStops || (firstSlice.segments?.length - 1) || 0,
              cabinClass: firstSegment.cabinClass || 'ECONOMY',
              bookingClass: firstSegment.bookingClass,
              baggage: firstSegment.baggage || {
                checkIn: { pieces: 1, weightKg: 15 },
                cabin: { pieces: 1, weightKg: 7 }
              }
            }],
            // All segments for detailed view
            allSegments,
            // Layover information
            layovers,
            // Computed fields
            computed: {
              totalStops: flight.computed?.totalStops || 0,
              totalDurationMinutes: flight.computed?.totalDurationMinutes || firstSlice.durationMinutes,
              totalDurationFormatted: flight.computed?.totalDurationFormatted || firstSlice.durationFormatted,
              isNonStop: flight.computed?.isNonStop ?? (firstSlice.segments?.length === 1),
              isOvernight: flight.computed?.isOvernight || false,
              pricePerTraveler: flight.computed?.pricePerTraveler || null
            },
            // Pricing info
            price: {
              total: flight.pricing?.totalAmount || 0,
              currency: flight.pricing?.totalCurrency || 'INR',
              base: flight.pricing?.baseAmount || 0,
              taxes: flight.pricing?.taxesAmount || 0,
              isRefundable: flight.pricing?.isRefundable || false,
              isChangeable: flight.pricing?.isChangeable || true,
              fareFamily: flight.pricing?.fareFamily || null
            },
            // Traveler pricing breakdown
            travelerPricing: flight.travelerPricing || [],
            // Source info
            source: flight.source || {}
          };
        });
        
        console.log('✈️ Transformed flights:', transformedFlights[0]);
        setFlights(transformedFlights);
        
        // Calculate dynamic price range from flight data
        if (transformedFlights.length > 0) {
          const prices = transformedFlights.map(f => f.price?.total || 0).filter(p => p > 0);
          const currency = transformedFlights[0]?.price?.currency || 'INR';
          if (prices.length > 0) {
            const minPrice = Math.floor(Math.min(...prices));
            const maxPrice = Math.ceil(Math.max(...prices));
            setPriceRange({ min: minPrice, max: maxPrice, currency });
            // Update filters with new price range
            setFilters(prev => ({
              ...prev,
              priceRange: [minPrice, maxPrice]
            }));
          }
        }
      } else if (response && response.success && response.data) {
        // Fallback: if API uses success wrapper format
        const flightsData = Array.isArray(response.data) ? response.data : response.data.data || [];
        console.log('✈️ Flights data (success format):', flightsData.length, 'flights found');
        setFlights(flightsData);
      } else {
        console.error('❌ Invalid API response:', response);
        setError('No flights found or invalid response format');
        setFlights([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to search flights');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  // Reset sort when filters are reset
  const handleResetFilters = (defaultFilters) => {
    setFilters(defaultFilters);
    setSortBy('price'); // Reset to default sort
  };

  // Filter flights based on selected filters
  const filteredFlights = flights.filter(flight => {
    // Price filter
    const price = flight.price?.total || 0;
    if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
      return false;
    }

    // Stops filter
    if (filters.stops !== 'any') {
      const stops = flight.segments?.[0]?.stops || 0;
      if (filters.stops === 'nonstop' && stops > 0) return false;
      if (filters.stops === '1stop' && stops !== 1) return false;
    }

    // Departure time filter
    if (filters.departureTime !== 'any') {
      const departureTime = flight.segments?.[0]?.departure?.time;
      if (departureTime) {
        const hour = new Date(departureTime).getHours();
        if (filters.departureTime === 'morning' && (hour < 6 || hour >= 12)) return false;
        if (filters.departureTime === 'afternoon' && (hour < 12 || hour >= 18)) return false;
        if (filters.departureTime === 'evening' && (hour < 18 || hour >= 24)) return false;
      }
    }

    return true;
  });

  // Sort filtered flights
  const sortedFlights = [...filteredFlights].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return (a.price?.total || 0) - (b.price?.total || 0);
      case 'price-desc':
        return (b.price?.total || 0) - (a.price?.total || 0);
      case 'duration':
        return (a.computed?.totalDurationMinutes || 0) - (b.computed?.totalDurationMinutes || 0);
      case 'departure':
        const aTime = new Date(a.segments?.[0]?.departure?.time || 0).getTime();
        const bTime = new Date(b.segments?.[0]?.departure?.time || 0).getTime();
        return aTime - bTime;
      default:
        return 0;
    }
  });

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  return (
    <>
      <Header />
      <main className="search-page">
        <div className="container">
          {/* Compact Search Widget */}
          <SearchWidgetCompact onSearch={() => setLoading(true)} />
          
          <div className="search-layout">
            {/* Filters Sidebar */}
            <aside className="search-sidebar">
              <SearchFilters 
                filters={filters}
                priceRange={priceRange}
                onApplyFilters={applyFilters}
                onResetFilters={handleResetFilters}
              />
            </aside>

            {/* Results Section */}
            <section className="search-results">
              {/* Compact Results Header */}
              <div className="results-header-compact">
                <div className="route-summary">
                  <div className="route-city">
                    <span className="city-code">{searchParams.get('from')}</span>
                    <span className="city-name">{airportInfo.from?.city_name || searchParams.get('from')}</span>
                  </div>
                  <div className="route-arrow">
                    <i className="fas fa-arrow-right"></i>
                  </div>
                  <div className="route-city">
                    <span className="city-code">{searchParams.get('to')}</span>
                    <span className="city-name">{airportInfo.to?.city_name || searchParams.get('to')}</span>
                  </div>
                </div>
                <div className="trip-meta">
                  <span className="meta-item">
                    <i className="fas fa-calendar-alt"></i>
                    {new Date(searchParams.get('departDate')).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {searchParams.get('returnDate') && (
                    <span className="meta-item">
                      <i className="fas fa-exchange-alt"></i>
                      {new Date(searchParams.get('returnDate')).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="meta-item">
                    <i className="fas fa-user"></i>
                    {searchParams.get('passengers')} Traveller{parseInt(searchParams.get('passengers')) > 1 ? 's' : ''}
                  </span>
                  <span className="meta-item cabin-class">
                    {searchParams.get('cabinClass')?.replace('_', ' ') || 'Economy'}
                  </span>
                </div>
              </div>

              {loading && (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Searching for the best flights...</p>
                </div>
              )}

              {error && (
                <div className="error-state">
                  <p>⚠️ {error}</p>
                  <button className="btn btn-primary" onClick={searchFlights}>
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && filteredFlights.length === 0 && (
                <div className="empty-state">
                  <p>No flights found matching your criteria</p>
                </div>
              )}

              {!loading && !error && sortedFlights.length > 0 && (
                <div className="flights-list">
                  <div className="results-info-bar">
                    <span className="results-count">{sortedFlights.length} flights found</span>
                    <div className="sort-options">
                      <span className="sort-label">Sort by:</span>
                      <select 
                        className="sort-select"
                        value={sortBy}
                        onChange={handleSortChange}
                      >
                        <option value="price">Price - Low to High</option>
                        <option value="price-desc">Price - High to Low</option>
                        <option value="duration">Duration - Shortest</option>
                        <option value="departure">Departure - Earliest</option>
                      </select>
                    </div>
                  </div>
                  {sortedFlights.map((flight, index) => (
                    <FlightCard key={index} flight={flight} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
