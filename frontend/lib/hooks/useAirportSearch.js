/**
 * Airport Search Hook - PRODUCTION VERSION
 * Real API calls only (no static fallback)
 */
import { useState, useEffect, useCallback } from 'react';

const useAirportSearch = (debounceMs = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // PRODUCTION: Real API search only
  const searchAirports = useCallback(
    async (searchQuery) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/airports/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.data?.results) {
          setResults(data.data.results);
          console.log(`✅ Found ${data.data.results.length} airports for "${searchQuery}"`);
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (err) {
        console.error('❌ Airport API error:', err.message);
        setError(`Search failed: ${err.message}`);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchAirports(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, searchAirports, debounceMs]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    searchAirports
  };
};

export default useAirportSearch;