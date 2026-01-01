'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import SearchFilters from '../components/SearchFilters/SearchFilters';
import FlightCard from '../components/FlightCard/FlightCard';
import apiClient from '@/lib/api/client';
import './search.css';

function SearchContent() {
  const searchParams = useSearchParams();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    stops: 'any',
    priceRange: [0, 100000],
    departureTime: 'any',
    airlines: []
  });

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
        
        // Transform API data to match FlightCard component expectations
        const transformedFlights = response.data.map(flight => {
          const itinerary = flight.itinerary || {};
          const firstSlice = itinerary.slices?.[0] || {};
          const firstSegment = firstSlice.segments?.[0] || {};
          const lastSegment = firstSlice.segments?.[firstSlice.segments?.length - 1] || firstSegment;
          
          return {
            ...flight,
            segments: [{
              airlineCode: flight.validatingAirlineCode || firstSegment.carrier || 'XX',
              airlineName: response.dictionaries?.airlines?.[flight.validatingAirlineCode]?.name || 
                          response.dictionaries?.airlines?.[firstSegment.carrier]?.name || 
                          'Unknown Airline',
              flightNumber: `${firstSegment.carrier || ''}${firstSegment.flightNumber || ''}`.trim(),
              departure: {
                time: firstSegment.departure?.time,
                airport: firstSegment.departure?.airport
              },
              arrival: {
                time: lastSegment.arrival?.time, 
                airport: lastSegment.arrival?.airport
              },
              duration: flight.computed?.totalDurationMinutes,
              stops: flight.computed?.totalStops || 0,
              cabinClass: firstSegment.cabin || 'Economy'
            }],
            price: {
              total: flight.pricing?.totalAmount || 0,
              currency: flight.pricing?.totalCurrency || 'EUR'
            }
          };
        });
        
        console.log('✈️ Transformed flights:', transformedFlights[0]);
        setFlights(transformedFlights);
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

    return true;
  });

  return (
    <>
      <Header />
      <main className="search-page">
        <div className="container">
          <div className="search-layout">
            {/* Filters Sidebar */}
            <aside className="search-sidebar">
              <SearchFilters filters={filters} onApplyFilters={applyFilters} />
            </aside>

            {/* Results Section */}
            <section className="search-results">
              <div className="results-header">
                <h1>
                  {searchParams.get('from')} → {searchParams.get('to')}
                </h1>
                <p>
                  {searchParams.get('departDate')} • {searchParams.get('passengers')} Passenger(s)
                </p>
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

              {!loading && !error && filteredFlights.length > 0 && (
                <div className="flights-list">
                  <div className="results-count">
                    {filteredFlights.length} flights found
                  </div>
                  {filteredFlights.map((flight, index) => (
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
