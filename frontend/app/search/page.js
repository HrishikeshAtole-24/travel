'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import SearchFilters from '../components/SearchFilters/SearchFilters';
import FlightCard from '../components/FlightCard/FlightCard';
import SearchWidgetCompact from '../components/SearchWidgetCompact/SearchWidgetCompact';
import Link from 'next/link';
import Icon from '../components/Icon/Icon';
import { FlightListSkeleton, StateMessage } from '../components/Skeleton/Skeleton';
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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
            airlineLogo: seg.marketingAirlineLogo || response.dictionaries?.airlines?.[seg.marketingAirlineCode]?.logo || null,
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
              airlineLogo: firstSegment.marketingAirlineLogo ||
                          response.dictionaries?.airlines?.[firstSegment.marketingAirlineCode]?.logo || null,
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

  const toggleMobileFilter = () => {
    setMobileFilterOpen(!mobileFilterOpen);
  };

  // Sort tabs show the best value for each mode (Figma "Best / Cheapest / Fastest")
  const pick = (fn) => filteredFlights.reduce((best, f) => (best === null || fn(f) < fn(best) ? f : best), null);
  const cheapest = pick(f => f.price?.total || Infinity);
  const fastest = pick(f => f.computed?.totalDurationMinutes || Infinity);
  const earliest = pick(f => new Date(f.segments?.[0]?.departure?.time || 0).getTime() || Infinity);
  const money = (f) => f ? `₹${Math.round(f.price?.total || 0).toLocaleString('en-IN')}` : '—';
  const mins = (m) => m ? `${Math.floor(m / 60)}h ${m % 60}m` : '—';
  const hhmm = (f) => f?.segments?.[0]?.departure?.time ? new Date(f.segments[0].departure.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
  const SORTS = [
    ['price', 'Cheapest', money(cheapest)],
    ['duration', 'Fastest', mins(fastest?.computed?.totalDurationMinutes)],
    ['departure', 'Earliest', hhmm(earliest)]
  ];

  // Fare-calendar strip: the searched day ±3, each a new search
  const departDate = searchParams.get('departDate');
  const dayStrip = departDate ? Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${departDate}T00:00:00`);
    d.setDate(d.getDate() + i - 3);
    return d;
  }) : [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayHref = (d) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('departDate', iso(d));
    const ret = searchParams.get('returnDate');
    if (ret && ret <= iso(d)) p.delete('returnDate');
    return `/search?${p.toString()}`;
  };

  const activeFilters = (filters.stops !== 'any' ? 1 : 0) + (filters.departureTime !== 'any' ? 1 : 0) + (filters.priceRange[1] < priceRange.max ? 1 : 0);

  return (
    <>
      <Header />
      <main className="search-page">
        <div className="search-top">
          <div className="container">
            <SearchWidgetCompact onSearch={() => setLoading(true)} />
          </div>
        </div>

        <div className="container">
          {dayStrip.length > 0 && (
            <nav className="fare-strip" aria-label="Nearby dates">
              {dayStrip.map(d => {
                const isActive = iso(d) === departDate;
                const past = d < today;
                return past ? (
                  <span key={iso(d)} className="fare-day is-past">
                    <span>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                    <strong>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>
                  </span>
                ) : (
                  <Link key={iso(d)} href={dayHref(d)} className={`fare-day ${isActive ? 'active' : ''}`} aria-current={isActive ? 'date' : undefined}>
                    <span>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                    <strong>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>
                    {isActive && cheapest && <em>from {money(cheapest)}</em>}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="search-layout">
            {mobileFilterOpen && <div className="mobile-filter-overlay" onClick={toggleMobileFilter} />}

            <aside className={`search-sidebar ${mobileFilterOpen ? 'open' : ''}`}>
              <div className="sheet-head">
                <strong>Filters</strong>
                <button type="button" className="header-icon-btn" onClick={toggleMobileFilter} aria-label="Close filters"><Icon name="x" size={20} /></button>
              </div>
              <SearchFilters filters={filters} priceRange={priceRange} onApplyFilters={applyFilters} onResetFilters={handleResetFilters} />
              <div className="sheet-foot">
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={toggleMobileFilter}>
                  Show {sortedFlights.length} flights
                </button>
              </div>
            </aside>

            <section className="search-results">
              <div className="results-head">
                <div>
                  <h1 className="results-title">
                    {airportInfo.from?.city_name || searchParams.get('from')}
                    <Icon name="arrow-right" size={22} />
                    {airportInfo.to?.city_name || searchParams.get('to')}
                  </h1>
                  <p className="results-sub">
                    {loading ? 'Searching live fares…' : error ? 'Live fares are temporarily unavailable' : `${sortedFlights.length} flights · prices include taxes & fees`}
                  </p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm mobile-filter-btn" onClick={toggleMobileFilter}>
                  <Icon name="sliders" size={16} /> Filters{activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
                </button>
              </div>

              {!loading && !error && sortedFlights.length > 0 && (
                <div className="sort-tabs" role="tablist" aria-label="Sort flights">
                  {SORTS.map(([value, label, hint]) => (
                    <button key={value} type="button" role="tab" aria-selected={sortBy === value}
                      className={`sort-tab ${sortBy === value ? 'active' : ''}`} onClick={() => setSortBy(value)}>
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </button>
                  ))}
                </div>
              )}

              {loading && <FlightListSkeleton />}

              {!loading && error && (
                <StateMessage icon="alert" tone="danger" title="We couldn’t load fares"
                  action={<button className="btn btn-primary" onClick={searchFlights}>Try again</button>}>
                  {error}
                </StateMessage>
              )}

              {!loading && !error && filteredFlights.length === 0 && (
                <StateMessage icon="plane" tone="brand" title={flights.length ? 'No flights match these filters' : 'No flights on this date'}
                  action={flights.length
                    ? <button className="btn btn-primary" onClick={() => handleResetFilters({ stops: 'any', priceRange: [priceRange.min, priceRange.max], departureTime: 'any', airlines: [] })}>Clear filters</button>
                    : <Link href="/" className="btn btn-secondary">Change search</Link>}>
                  {flights.length ? 'Try removing a filter or raising the price limit.' : 'Try a nearby date from the strip above.'}
                </StateMessage>
              )}

              {!loading && !error && sortedFlights.length > 0 && (
                <div className="flights-list">
                  {sortedFlights.map((flight, index) => (
                    <FlightCard key={flight.id || index} flight={flight} />
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
    <Suspense fallback={<><Header /><main className="search-page"><div className="container" style={{ paddingTop: 32 }}><FlightListSkeleton /></div></main></>}>
      <SearchContent />
    </Suspense>
  );
}
