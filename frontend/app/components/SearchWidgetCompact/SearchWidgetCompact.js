'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AirportAutocomplete from '../AirportAutocomplete/AirportAutocomplete';
import DatePicker from '../DatePicker/DatePicker';
import './SearchWidgetCompact.css';

export default function SearchWidgetCompact({ onSearch }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(null);
  const [travellersOpen, setTravellersOpen] = useState(false);
  const travellersRef = useRef(null);
  const widgetRef = useRef(null);

  // Initialize from URL params
  const [searchData, setSearchData] = useState({
    tripType: 'roundtrip',
    fromCode: '',
    fromAirport: null,
    toCode: '',
    toAirport: null,
    departDate: '',
    returnDate: '',
    passengers: 1,
    cabinClass: 'economy',
    adults: 1,
    children: 0,
    infants: 0
  });

  // Parse URL params on mount
  useEffect(() => {
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const departDate = searchParams.get('departDate') || '';
    const returnDate = searchParams.get('returnDate') || '';
    const passengers = parseInt(searchParams.get('passengers')) || 1;
    const cabinClass = searchParams.get('cabinClass') || 'economy';
    const tripType = searchParams.get('tripType') || (returnDate ? 'roundtrip' : 'oneway');

    setSearchData(prev => ({
      ...prev,
      tripType,
      fromCode: from,
      fromAirport: from ? { code: from, displayText: from } : null,
      toCode: to,
      toAirport: to ? { code: to, displayText: to } : null,
      departDate,
      returnDate,
      passengers,
      cabinClass,
      adults: passengers,
    }));
  }, [searchParams]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (travellersRef.current && !travellersRef.current.contains(event.target)) {
        setTravellersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!searchData.fromCode || !searchData.toCode) {
      alert('Please select departure and destination airports');
      return;
    }

    if (!searchData.departDate) {
      alert('Please select departure date');
      return;
    }

    const params = new URLSearchParams({
      from: searchData.fromCode,
      to: searchData.toCode,
      departDate: searchData.departDate,
      ...(searchData.tripType === 'roundtrip' && searchData.returnDate && { returnDate: searchData.returnDate }),
      passengers: searchData.passengers,
      cabinClass: searchData.cabinClass,
      tripType: searchData.tripType
    });

    setIsExpanded(false);
    router.push(`/search?${params.toString()}`);
    
    if (onSearch) {
      onSearch();
    }
  };

  const handleChange = (field, value) => {
    setSearchData(prev => {
      const newData = { ...prev, [field]: value };
      
      if (field === 'departDate' && prev.returnDate) {
        const newDepartDate = new Date(value);
        const currentReturnDate = new Date(prev.returnDate);
        if (newDepartDate >= currentReturnDate) {
          newData.returnDate = '';
        }
      }
      
      return newData;
    });
  };

  const handleCalendarToggle = (calendarType) => {
    setCalendarOpen(calendarOpen === calendarType ? null : calendarType);
  };

  const handleDateSelection = (field, value) => {
    handleChange(field, value);
    if (field === 'departDate' && searchData.tripType === 'roundtrip') {
      setCalendarOpen('return');
    } else if (field === 'returnDate') {
      setCalendarOpen(null);
    }
  };

  const handleCalendarClose = () => {
    setCalendarOpen(null);
  };

  const swapLocations = () => {
    setSearchData(prev => ({
      ...prev,
      fromCode: prev.toCode,
      fromAirport: prev.toAirport,
      toCode: prev.fromCode,
      toAirport: prev.fromAirport
    }));
  };

  const handleFromChange = (code, airport) => {
    setSearchData(prev => ({
      ...prev,
      fromCode: code,
      fromAirport: airport
    }));
  };

  const handleToChange = (code, airport) => {
    setSearchData(prev => ({
      ...prev,
      toCode: code,
      toAirport: airport
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getCabinClassDisplay = () => {
    const classMap = {
      'economy': 'Economy',
      'premium_economy': 'Premium Economy',
      'business': 'Business',
      'first': 'First Class'
    };
    return classMap[searchData.cabinClass] || 'Economy';
  };

  const getTravellerSummary = () => {
    const total = searchData.adults + searchData.children + searchData.infants;
    return `${total} Traveller${total > 1 ? 's' : ''}`;
  };

  return (
    <div className="search-widget-compact" ref={widgetRef}>
      {/* Collapsed View - Summary Bar */}
      {!isExpanded && (
        <div className="compact-summary" onClick={() => setIsExpanded(true)}>
          <div className="summary-route">
            <span className="summary-city">{searchData.fromCode || 'From'}</span>
            <i className="fas fa-exchange-alt summary-swap"></i>
            <span className="summary-city">{searchData.toCode || 'To'}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-dates">
            <i className="fas fa-calendar-alt"></i>
            <span>{formatDate(searchData.departDate)}</span>
            {searchData.tripType === 'roundtrip' && searchData.returnDate && (
              <>
                <span className="date-separator">-</span>
                <span>{formatDate(searchData.returnDate)}</span>
              </>
            )}
          </div>
          <div className="summary-divider"></div>
          <div className="summary-travellers">
            <i className="fas fa-user"></i>
            <span>{getTravellerSummary()}, {getCabinClassDisplay()}</span>
          </div>
          <button type="button" className="modify-search-btn">
            <i className="fas fa-edit"></i> Modify
          </button>
        </div>
      )}

      {/* Expanded View - Full Search Form */}
      {isExpanded && (
        <div className="compact-expanded">
          <div className="compact-header">
            <h3>Modify Search</h3>
            <button 
              type="button" 
              className="close-expanded-btn"
              onClick={() => setIsExpanded(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="compact-form">
            {/* Trip Type */}
            <div className="compact-trip-type">
              <label className={`trip-type-option ${searchData.tripType === 'roundtrip' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="tripType"
                  value="roundtrip"
                  checked={searchData.tripType === 'roundtrip'}
                  onChange={(e) => handleChange('tripType', e.target.value)}
                />
                <span>Round Trip</span>
              </label>
              <label className={`trip-type-option ${searchData.tripType === 'oneway' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="tripType"
                  value="oneway"
                  checked={searchData.tripType === 'oneway'}
                  onChange={(e) => handleChange('tripType', e.target.value)}
                />
                <span>One Way</span>
              </label>
            </div>

            {/* Search Fields */}
            <div className="compact-fields-row">
              {/* From */}
              <div className="compact-field from-field">
                <AirportAutocomplete
                  label="FROM"
                  icon="fa-plane-departure"
                  placeholder="City or Airport"
                  value={searchData.fromAirport?.displayText || ''}
                  onChange={handleFromChange}
                  required
                />
              </div>

              {/* Swap Button */}
              <button 
                type="button" 
                className="compact-swap-btn" 
                onClick={swapLocations}
                title="Swap locations"
              >
                <i className="fas fa-exchange-alt"></i>
              </button>

              {/* To */}
              <div className="compact-field to-field">
                <AirportAutocomplete
                  label="TO"
                  icon="fa-plane-arrival"
                  placeholder="City or Airport"
                  value={searchData.toAirport?.displayText || ''}
                  onChange={handleToChange}
                  required
                />
              </div>

              {/* Departure Date */}
              <div className="compact-field date-field">
                <DatePicker
                  label="DEPARTURE"
                  icon="fa-calendar-alt"
                  value={searchData.departDate}
                  onChange={(date) => handleDateSelection('departDate', date)}
                  isOpen={calendarOpen === 'departure'}
                  onToggle={() => handleCalendarToggle('departure')}
                  onClose={handleCalendarClose}
                  departureDate={searchData.departDate}
                  returnDate={searchData.returnDate}
                  placeholder="Select Date"
                  isReturn={false}
                  required
                />
              </div>

              {/* Return Date */}
              {searchData.tripType === 'roundtrip' && (
                <div className="compact-field date-field">
                  <DatePicker
                    label="RETURN"
                    icon="fa-calendar-alt"
                    value={searchData.returnDate}
                    onChange={(date) => handleDateSelection('returnDate', date)}
                    isOpen={calendarOpen === 'return'}
                    onToggle={() => handleCalendarToggle('return')}
                    onClose={handleCalendarClose}
                    isReturn={true}
                    departureDate={searchData.departDate}
                    returnDate={searchData.returnDate}
                    placeholder="Select Date"
                    required
                  />
                </div>
              )}

              {/* Travelers & Class */}
              <div className="compact-field travellers-field" ref={travellersRef}>
                <label className="compact-field-label">
                  <i className="fas fa-user"></i> TRAVELLERS & CLASS
                </label>
                <div 
                  className="compact-travellers-selector"
                  onClick={() => setTravellersOpen(!travellersOpen)}
                >
                  <span>{getTravellerSummary()}</span>
                  <span className="traveller-class">{getCabinClassDisplay()}</span>
                  <i className={`fas fa-chevron-down ${travellersOpen ? 'rotated' : ''}`}></i>
                </div>

                {travellersOpen && (
                  <div className="compact-travellers-dropdown">
                    {/* Adults */}
                    <div className="traveller-row">
                      <div className="traveller-info">
                        <span className="traveller-type">Adults</span>
                        <span className="traveller-hint">(12+ years)</span>
                      </div>
                      <div className="traveller-controls">
                        <button
                          type="button"
                          className="control-btn"
                          onClick={() => setSearchData(prev => {
                            const newAdults = Math.max(1, prev.adults - 1);
                            const newInfants = Math.min(prev.infants, newAdults);
                            return { ...prev, adults: newAdults, infants: newInfants, passengers: newAdults + prev.children + newInfants };
                          })}
                          disabled={searchData.adults <= 1}
                        >-</button>
                        <span className="count">{searchData.adults}</span>
                        <button
                          type="button"
                          className="control-btn"
                          onClick={() => setSearchData(prev => {
                            if (prev.adults + prev.children + prev.infants >= 9) return prev;
                            return { ...prev, adults: prev.adults + 1, passengers: prev.adults + 1 + prev.children + prev.infants };
                          })}
                        >+</button>
                      </div>
                    </div>

                    {/* Children */}
                    <div className="traveller-row">
                      <div className="traveller-info">
                        <span className="traveller-type">Children</span>
                        <span className="traveller-hint">(2-12 years)</span>
                      </div>
                      <div className="traveller-controls">
                        <button
                          type="button"
                          className="control-btn"
                          onClick={() => setSearchData(prev => {
                            const newChildren = Math.max(0, prev.children - 1);
                            return { ...prev, children: newChildren, passengers: prev.adults + newChildren + prev.infants };
                          })}
                          disabled={searchData.children <= 0}
                        >-</button>
                        <span className="count">{searchData.children}</span>
                        <button
                          type="button"
                          className="control-btn"
                          onClick={() => setSearchData(prev => {
                            if (prev.adults + prev.children + prev.infants >= 9) return prev;
                            return { ...prev, children: prev.children + 1, passengers: prev.adults + prev.children + 1 + prev.infants };
                          })}
                        >+</button>
                      </div>
                    </div>

                    {/* Infants */}
                    <div className="traveller-row">
                      <div className="traveller-info">
                        <span className="traveller-type">Infants</span>
                        <span className="traveller-hint">(below 2 years)</span>
                      </div>
                      <div className="traveller-controls">
                        <button
                          type="button"
                          className="control-btn"
                          onClick={() => setSearchData(prev => {
                            const newInfants = Math.max(0, prev.infants - 1);
                            return { ...prev, infants: newInfants, passengers: prev.adults + prev.children + newInfants };
                          })}
                          disabled={searchData.infants <= 0}
                        >-</button>
                        <span className="count">{searchData.infants}</span>
                        <button
                          type="button"
                          className="control-btn"
                          onClick={() => setSearchData(prev => {
                            if (prev.infants >= prev.adults || prev.adults + prev.children + prev.infants >= 9) return prev;
                            return { ...prev, infants: prev.infants + 1, passengers: prev.adults + prev.children + prev.infants + 1 };
                          })}
                          disabled={searchData.infants >= searchData.adults}
                        >+</button>
                      </div>
                    </div>

                    {/* Cabin Class */}
                    <div className="cabin-class-row">
                      <span className="cabin-label">Cabin Class</span>
                      <div className="cabin-options">
                        {['economy', 'premium_economy', 'business', 'first'].map(cabin => (
                          <button
                            key={cabin}
                            type="button"
                            className={`cabin-option ${searchData.cabinClass === cabin ? 'active' : ''}`}
                            onClick={() => handleChange('cabinClass', cabin)}
                          >
                            {cabin === 'economy' ? 'Economy' : 
                             cabin === 'premium_economy' ? 'Premium' : 
                             cabin === 'business' ? 'Business' : 'First'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="apply-travellers-btn"
                      onClick={() => setTravellersOpen(false)}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Search Button */}
              <button type="submit" className="compact-search-btn">
                <i className="fas fa-search"></i>
                SEARCH
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
