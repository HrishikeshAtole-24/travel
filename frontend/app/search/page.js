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

      // Build API request
      const requestBody = {
        origin: from,
        destination: to,
        departureDate: departDate,
        ...(returnDate && { returnDate }),
        adults: parseInt(passengers),
        cabinClass: cabinClass.toUpperCase(),
        currency: 'INR'
      };

      const response = await apiClient.post('/flights/search', requestBody);
      
      if (response.success && response.data?.flights) {
        setFlights(response.data.flights);
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
