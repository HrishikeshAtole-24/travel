'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AirportAutocomplete from '../AirportAutocomplete/AirportAutocomplete';
import DatePicker from '../DatePicker/DatePicker';
import HotelSearchForm from '../HotelSearchForm/HotelSearchForm';
import Icon from '../Icon/Icon';
import './FlightSearchWidget.css';

const CABIN_CLASSES = [
  ['economy', 'Economy'],
  ['premium_economy', 'Premium economy'],
  ['business', 'Business'],
  ['first', 'First']
];

const TRAVELLER_ROWS = [
  { key: 'adults', label: 'Adults', hint: '12+ years', options: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { key: 'children', label: 'Children', hint: '2–12 years', options: [0, 1, 2, 3, 4, 5, 6] },
  { key: 'infants', label: 'Infants', hint: 'Under 2, on lap', options: [0, 1, 2, 3, 4, 5, 6] }
];

export default function FlightSearchWidget() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('flights');
  const [calendarOpen, setCalendarOpen] = useState(null); // null, 'departure', or 'return'
  const [travellersOpen, setTravellersOpen] = useState(false);
  const travellersRef = useRef(null);
  
  const [searchData, setSearchData] = useState({
    tripType: 'roundtrip',
    fromCode: '',
    fromAirport: null,
    toCode: '',
    toAirport: null,
    departDate: '', // Will be set dynamically
    returnDate: '',  // Will be set dynamically
    passengers: 1,
    cabinClass: 'economy',
    // MMT-style traveller breakdown (UI only)
    adults: 1,
    children: 0,
    infants: 0
  });

  // Set dynamic dates after component mounts to avoid hydration mismatch
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Fix timezone issue - use local date, not UTC
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    setSearchData(prev => ({
      ...prev,
      departDate: todayString,
      returnDate: tomorrowString
    }));
  }, []);

  // Close travellers dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (travellersRef.current && !travellersRef.current.contains(event.target)) {
        setTravellersOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs = [
    { id: 'flights', label: 'Flights', icon: 'plane' },
    { id: 'hotels', label: 'Hotels', icon: 'hotel' }
  ];

  // The tab lives in the URL (?tab=hotels) so the header's Hotels link lands here
  useEffect(() => {
    setActiveTab(searchParams?.get('tab') === 'hotels' ? 'hotels' : 'flights');
  }, [searchParams]);

  const selectTab = (id) => {
    setActiveTab(id);
    router.replace(id === 'hotels' ? '/?tab=hotels' : '/', { scroll: false });
  };

  const setTravellerCount = (type, num) => {
    setSearchData(prev => {
      const next = { ...prev, [type]: num };
      // Infants travel on an adult's lap
      if (type === 'adults') next.infants = Math.min(prev.infants, num);
      const total = next.adults + next.children + next.infants;
      if (total > 9) return prev;
      return { ...next, passengers: total };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate required fields
    if (!searchData.fromCode || !searchData.toCode) {
      alert('Please select departure and destination airports');
      return;
    }

    if (!searchData.departDate) {
      alert('Please select departure date');
      return;
    }

    if (searchData.tripType === 'roundtrip' && !searchData.returnDate) {
      alert('Please select return date for round trip');
      return;
    }

    const params = new URLSearchParams({
      from: searchData.fromCode,
      to: searchData.toCode,
      departDate: searchData.departDate,
      ...(searchData.tripType === 'roundtrip' && { returnDate: searchData.returnDate }),
      passengers: searchData.passengers,
      cabinClass: searchData.cabinClass,
      tripType: searchData.tripType
    });

    router.push(`/search?${params.toString()}`);
  };

  const handleChange = (field, value) => {
    setSearchData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Smart date handling: if departure date is changed and it's after return date, clear return date
      if (field === 'departDate' && prev.returnDate) {
        const newDepartDate = new Date(value);
        const currentReturnDate = new Date(prev.returnDate);
        
        if (newDepartDate >= currentReturnDate) {
          // Clear return date if departure is on or after current return date
          newData.returnDate = '';
        }
      }
      
      return newData;
    });
  };

  // Handle calendar opening/closing - MMT style
  const handleCalendarToggle = (calendarType) => {
    setCalendarOpen(calendarOpen === calendarType ? null : calendarType);
  };

  // Handle date selection in MMT flow
  const handleDateSelection = (field, value) => {
    handleChange(field, value);
    
    // MMT-style flow: if departure is selected, keep calendar open for return
    if (field === 'departDate' && searchData.tripType === 'roundtrip') {
      // Don't close calendar, user can now select return date
      setCalendarOpen('return');
    } else if (field === 'returnDate') {
      // Close calendar after return date is selected
      setCalendarOpen(null);
    }
  };

  // Close calendar when clicked outside
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

  const handleCabinClassChange = (cabinClass) => {
    setSearchData(prev => ({
      ...prev,
      cabinClass
    }));
  };

  const getTravellerSummary = () => {
    const total = searchData.adults + searchData.children + searchData.infants;
    return `${total} Traveller${total > 1 ? 's' : ''}`;
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

  return (
    <div className="sw-search">
      <div className="sw-search__top">
        <div className="sw-search__products" role="tablist" aria-label="What are you booking?">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`sw-search__product ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => selectTab(tab.id)}
            >
              <Icon name={tab.icon} size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'flights' && (
          <div className="sw-search__trip" role="radiogroup" aria-label="Trip type">
            {[['roundtrip', 'Round trip'], ['oneway', 'One way']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={searchData.tripType === value}
                className={`sw-chip ${searchData.tripType === value ? 'active' : ''}`}
                onClick={() => handleChange('tripType', value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'flights' ? (
        <form onSubmit={handleSubmit} className="sw-search__form">
          <div className="sw-search__fields sw-search__fields--flight">
            <div className="search-field-mmt sw-cell from-field">
              <AirportAutocomplete
                label="From"
                icon="fa-plane-departure"
                placeholder="Delhi"
                value={searchData.fromAirport?.displayText || ''}
                onChange={handleFromChange}
                required
              />
            </div>

            <button type="button" className="sw-swap" onClick={swapLocations} aria-label="Swap origin and destination">
              <Icon name="swap" size={18} />
            </button>

            <div className="search-field-mmt sw-cell to-field">
              <AirportAutocomplete
                label="To"
                icon="fa-plane-arrival"
                placeholder="Mumbai"
                value={searchData.toAirport?.displayText || ''}
                onChange={handleToChange}
                required
              />
            </div>

            <div className="search-field-mmt sw-cell date-field">
              <DatePicker
                label="Depart"
                icon="fa-calendar-alt"
                value={searchData.departDate}
                onChange={(date) => handleDateSelection('departDate', date)}
                isOpen={calendarOpen === 'departure'}
                onToggle={() => handleCalendarToggle('departure')}
                onClose={handleCalendarClose}
                departureDate={searchData.departDate}
                returnDate={searchData.returnDate}
                placeholder="Select date"
                isReturn={false}
                required
              />
            </div>

            {searchData.tripType === 'roundtrip' ? (
              <div className="search-field-mmt sw-cell date-field">
                <DatePicker
                  label="Return"
                  icon="fa-calendar-alt"
                  value={searchData.returnDate}
                  onChange={(date) => handleDateSelection('returnDate', date)}
                  isOpen={calendarOpen === 'return'}
                  onToggle={() => handleCalendarToggle('return')}
                  onClose={handleCalendarClose}
                  isReturn={true}
                  departureDate={searchData.departDate}
                  returnDate={searchData.returnDate}
                  placeholder="Add return"
                  required
                />
              </div>
            ) : (
              <button type="button" className="search-field-mmt sw-cell sw-cell--ghost" onClick={() => handleChange('tripType', 'roundtrip')}>
                <span className="field-label">Return</span>
                <span className="sw-cell__add"><Icon name="plus" size={16} /> Add return</span>
                <span className="field-subtext">Save more on round trips</span>
              </button>
            )}

            <div className="search-field-mmt sw-cell travelers-field" ref={travellersRef}>
              <span className="field-label">Travellers &amp; class</span>
              <button type="button" className="travellers-selector" onClick={() => setTravellersOpen(!travellersOpen)} aria-expanded={travellersOpen}>
                <span className="travellers-count">{getTravellerSummary()}</span>
                <i className={`fas fa-chevron-down ${travellersOpen ? 'rotated' : ''}`}></i>
              </button>
              <div className="field-subtext">{getCabinClassDisplay()}</div>

              {travellersOpen && (
                <div className="travellers-dropdown">
                  {TRAVELLER_ROWS.map(row => (
                    <div className="traveller-type-row" key={row.key}>
                      <div className="traveller-type-info">
                        <span className="traveller-type-label">{row.label}</span>
                        <span className="traveller-type-hint">{row.hint}</span>
                      </div>
                      <div className="traveller-counter">
                        {row.options.map(num => (
                          <button
                            key={num}
                            type="button"
                            className={`counter-btn ${searchData[row.key] === num ? 'active' : ''}`}
                            disabled={row.key === 'infants' && num > searchData.adults}
                            onClick={() => setTravellerCount(row.key, num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="travel-class-section">
                    <span className="travel-class-label">Cabin class</span>
                    <div className="travel-class-options">
                      {CABIN_CLASSES.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={`class-btn ${searchData.cabinClass === value ? 'active' : ''}`}
                          onClick={() => handleCabinClassChange(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="button" className="apply-btn" onClick={() => setTravellersOpen(false)}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="search-submit-btn-mmt">
            <Icon name="search" size={20} strokeWidth={2.5} />
            <span>Search</span>
          </button>
        </form>
      ) : (
        <HotelSearchForm />
      )}
    </div>
  );
}
