/**
 * Airport Autocomplete Component
 * MMT-style airport search with dropdown
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import useAirportSearch from '../../../lib/hooks/useAirportSearch';
import './AirportAutocomplete.css';

export default function AirportAutocomplete({ 
  placeholder = "Enter city or airport", 
  value, 
  onChange, 
  label = "FROM",
  icon = "fa-plane-departure",
  required = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { query, setQuery, results, loading, error } = useAirportSearch(300);

  // Handle input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setQuery(newValue);
    setIsOpen(true);
    
    // Clear selection if user types
    if (selectedAirport) {
      setSelectedAirport(null);
      onChange && onChange('', null);
    }
  };

  // Handle airport selection
  const handleSelect = (airport) => {
    setSelectedAirport(airport);
    setInputValue(airport.displayText);
    setIsOpen(false);
    setQuery('');
    
    // Notify parent with both IATA code and airport object
    if (onChange) {
      onChange(airport.iata, airport);
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (inputValue.length >= 2) {
      setIsOpen(true);
    }
  };

  // Handle input blur (with delay for click handling)
  const handleBlur = () => {
    console.log('Input blurred');
    setTimeout(() => {
      setIsOpen(false);
    }, 300); // Increased delay from 200 to 300ms
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current && 
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  return (
    <div className="airport-autocomplete">
      <label className="field-label">
        <i className={`fas ${icon}`}></i> {label}
      </label>
      
      <div className="autocomplete-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="field-input city-input"
          required={required}
          autoComplete="off"
        />
        
        {selectedAirport && (
          <div className="field-subtext">
            {selectedAirport.subText}
          </div>
        )}
        
        {!selectedAirport && inputValue && (
          <div className="field-subtext">
            Enter at least 2 characters to search
          </div>
        )}

        {/* Dropdown Results */}
        {isOpen && (query.length >= 2 || results.length > 0) && (
          <div ref={dropdownRef} className="autocomplete-dropdown">
            {loading && (
              <div className="dropdown-item loading-item">
                <i className="fas fa-spinner fa-spin"></i>
                Searching airports...
              </div>
            )}
            
            {error && !loading && (
              <div className="dropdown-item error-item">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}
            
            {!loading && !error && results.length === 0 && query.length >= 2 && (
              <div className="dropdown-item no-results">
                <i className="fas fa-search"></i>
                No airports found for "{query}"
              </div>
            )}
            
            {!loading && results.length > 0 && (
              <>
                <div className="dropdown-header">
                  Popular Destinations
                </div>
                {results.map((airport, index) => (
                  <div
                    key={`${airport.iata}-${index}`}
                    className="dropdown-item airport-item"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(airport);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <div className="airport-main">
                      <span className="airport-city">{airport.city}</span>
                      <span className="airport-code">({airport.iata})</span>
                    </div>
                    <div className="airport-sub">
                      {airport.name}, {airport.country}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}