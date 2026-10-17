'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AirportAutocomplete from '../AirportAutocomplete/AirportAutocomplete';
import DatePicker from '../DatePicker/DatePicker';
import Icon from '../Icon/Icon';
import '../FlightSearchWidget/FlightSearchWidget.css';
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

  const setCount = (key, value) => {
    setSearchData(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'adults') next.infants = Math.min(prev.infants, value);
      return { ...next, passengers: next.adults + next.children + next.infants };
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
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

  const stepper = (key, min, canAdd) => (
    <div className="hsf-stepper">
      <button type="button" aria-label={`Fewer ${key}`} disabled={searchData[key] <= min} onClick={() => setCount(key, searchData[key] - 1)}>−</button>
      <span>{searchData[key]}</span>
      <button type="button" aria-label={`More ${key}`} disabled={!canAdd} onClick={() => setCount(key, searchData[key] + 1)}>+</button>
    </div>
  );
  const total = searchData.adults + searchData.children + searchData.infants;

  return (
    <div className="search-widget-compact" ref={widgetRef}>
      {!isExpanded ? (
        <div className="swc-summary">
          <button type="button" className="swc-summary__pill" onClick={() => setIsExpanded(true)}>
            <span className="swc-summary__route">
              <strong>{searchData.fromCode || 'From'}</strong>
              <Icon name={searchData.tripType === 'roundtrip' ? 'swap' : 'arrow-right'} size={16} />
              <strong>{searchData.toCode || 'To'}</strong>
            </span>
            <span className="swc-summary__meta">
              <Icon name="calendar" size={16} />
              {formatDate(searchData.departDate)}
              {searchData.tripType === 'roundtrip' && searchData.returnDate && <> – {formatDate(searchData.returnDate)}</>}
            </span>
            <span className="swc-summary__meta">
              <Icon name="users" size={16} />
              {getTravellerSummary()} · {getCabinClassDisplay()}
            </span>
          </button>
          <button type="button" className="btn btn-primary swc-summary__btn" onClick={() => setIsExpanded(true)}>
            <Icon name="search" size={16} /> Modify search
          </button>
        </div>
      ) : (
        <div className="swc-expanded">
          <div className="swc-expanded__top">
            <div className="sw-search__trip" role="radiogroup" aria-label="Trip type">
              {[['roundtrip', 'Round trip'], ['oneway', 'One way']].map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={searchData.tripType === value}
                  className={`sw-chip ${searchData.tripType === value ? 'active' : ''}`} onClick={() => handleChange('tripType', value)}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="header-icon-btn" onClick={() => setIsExpanded(false)} aria-label="Close">
              <Icon name="x" size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="sw-search__form">
            <div className="sw-search__fields sw-search__fields--flight">
              <div className="search-field-mmt sw-cell from-field">
                <AirportAutocomplete label="From" icon="fa-plane-departure" placeholder="City or airport"
                  value={searchData.fromAirport?.displayText || ''} onChange={handleFromChange} required />
              </div>
              <button type="button" className="sw-swap" onClick={swapLocations} aria-label="Swap origin and destination">
                <Icon name="swap" size={18} />
              </button>
              <div className="search-field-mmt sw-cell to-field">
                <AirportAutocomplete label="To" icon="fa-plane-arrival" placeholder="City or airport"
                  value={searchData.toAirport?.displayText || ''} onChange={handleToChange} required />
              </div>
              <div className="search-field-mmt sw-cell date-field">
                <DatePicker label="Depart" icon="fa-calendar-alt" value={searchData.departDate}
                  onChange={(date) => handleDateSelection('departDate', date)} isOpen={calendarOpen === 'departure'}
                  onToggle={() => handleCalendarToggle('departure')} onClose={handleCalendarClose}
                  departureDate={searchData.departDate} returnDate={searchData.returnDate} placeholder="Select date" isReturn={false} required />
              </div>
              {searchData.tripType === 'roundtrip' ? (
                <div className="search-field-mmt sw-cell date-field">
                  <DatePicker label="Return" icon="fa-calendar-alt" value={searchData.returnDate}
                    onChange={(date) => handleDateSelection('returnDate', date)} isOpen={calendarOpen === 'return'}
                    onToggle={() => handleCalendarToggle('return')} onClose={handleCalendarClose} isReturn={true}
                    departureDate={searchData.departDate} returnDate={searchData.returnDate} placeholder="Add return" required />
                </div>
              ) : (
                <button type="button" className="search-field-mmt sw-cell sw-cell--ghost" onClick={() => handleChange('tripType', 'roundtrip')}>
                  <span className="field-label">Return</span>
                  <span className="sw-cell__add"><Icon name="plus" size={16} /> Add return</span>
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
                  <div className="hsf-guests-dropdown">
                    {[
                      ['adults', 'Adults', '12+ years', 1, total < 9],
                      ['children', 'Children', '2–12 years', 0, total < 9],
                      ['infants', 'Infants', 'Under 2, on lap', 0, total < 9 && searchData.infants < searchData.adults]
                    ].map(([key, label, hint, min, canAdd]) => (
                      <div className="hsf-counter-row" key={key}>
                        <div>
                          <div className="hsf-counter-label">{label}</div>
                          <div className="hsf-counter-hint">{hint}</div>
                        </div>
                        {stepper(key, min, canAdd)}
                      </div>
                    ))}
                    <div className="travel-class-options" style={{ marginTop: 16 }}>
                      {['economy', 'premium_economy', 'business', 'first'].map(cabin => (
                        <button key={cabin} type="button" className={`class-btn ${searchData.cabinClass === cabin ? 'active' : ''}`}
                          onClick={() => handleChange('cabinClass', cabin)}>
                          {{ economy: 'Economy', premium_economy: 'Premium', business: 'Business', first: 'First' }[cabin]}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="apply-btn" onClick={() => setTravellersOpen(false)}>Done</button>
                  </div>
                )}
              </div>
            </div>
            <button type="submit" className="search-submit-btn-mmt">
              <Icon name="search" size={20} strokeWidth={2.5} />
              <span>Search</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
