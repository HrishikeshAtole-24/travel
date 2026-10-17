'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '../DatePicker/DatePicker';
import { searchDestinations } from '@/lib/api/hotels';
import '../FlightSearchWidget/FlightSearchWidget.css';
import '../AirportAutocomplete/AirportAutocomplete.css';
import './HotelSearchForm.css';

const MAX_ROOMS = 5;
const MAX_ADULTS_PER_ROOM = 4;
const MAX_CHILDREN = 4;

const toDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
};

/**
 * Hotel search form - destination, dates, rooms & guests.
 * Used on the home page Hotels tab and (compact) on the results page.
 *
 * @param {Object} props
 * @param {Object} [props.initial] - { cityName, countryCode, checkInDate, checkOutDate, adults, rooms, childrenAges }
 * @param {boolean} [props.compact] - Single-row layout for the results page header
 */
export default function HotelSearchForm({ initial = {}, compact = false }) {
  const router = useRouter();
  const destinationRef = useRef(null);
  const guestsRef = useRef(null);

  const [destination, setDestination] = useState(
    initial.cityName ? { cityName: initial.cityName, countryCode: initial.countryCode || 'IN', label: initial.cityName } : null
  );
  const [query, setQuery] = useState(initial.cityName || '');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [checkInDate, setCheckInDate] = useState(initial.checkInDate || '');
  const [checkOutDate, setCheckOutDate] = useState(initial.checkOutDate || '');
  const [calendarOpen, setCalendarOpen] = useState(null); // 'checkin' | 'checkout' | null

  const [rooms, setRooms] = useState(initial.rooms || 1);
  const [adults, setAdults] = useState(initial.adults || 2);
  const [childrenAges, setChildrenAges] = useState(initial.childrenAges || []);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [error, setError] = useState('');

  // Default dates (tomorrow → day after) after mount to avoid hydration mismatch
  useEffect(() => {
    if (!initial.checkInDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const checkIn = toDateString(tomorrow);
      setCheckInDate(checkIn);
      setCheckOutDate(addDays(checkIn, 1));
    }
  }, [initial.checkInDate]);

  // Destination suggestions (debounced)
  useEffect(() => {
    if (!suggestionsOpen) return undefined;
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        setSuggestions(await searchDestinations(query));
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, suggestionsOpen]);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (destinationRef.current && !destinationRef.current.contains(event.target)) setSuggestionsOpen(false);
      if (guestsRef.current && !guestsRef.current.contains(event.target)) setGuestsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectDestination = (item) => {
    setDestination(item);
    setQuery(item.cityName);
    setSuggestionsOpen(false);
    setError('');
  };

  const handleCheckIn = (date) => {
    setCheckInDate(date);
    // Keep at least one night
    if (!checkOutDate || checkOutDate <= date) setCheckOutDate(addDays(date, 1));
    setCalendarOpen('checkout');
  };

  const handleCheckOut = (date) => {
    if (date <= checkInDate) {
      setCheckOutDate(addDays(checkInDate, 1));
    } else {
      setCheckOutDate(date);
    }
    setCalendarOpen(null);
  };

  const updateRooms = (value) => {
    const next = Math.max(1, Math.min(MAX_ROOMS, value));
    setRooms(next);
    // Every room needs at least one adult
    setAdults(prev => Math.max(next, Math.min(prev, next * MAX_ADULTS_PER_ROOM)));
  };

  const updateAdults = (value) => {
    setAdults(Math.max(rooms, Math.min(rooms * MAX_ADULTS_PER_ROOM, value)));
  };

  const updateChildren = (count) => {
    const next = Math.max(0, Math.min(MAX_CHILDREN, count));
    setChildrenAges(prev => (next > prev.length ? [...prev, ...Array(next - prev.length).fill(5)] : prev.slice(0, next)));
  };

  const nights = checkInDate && checkOutDate
    ? Math.round((new Date(checkOutDate) - new Date(checkInDate)) / 86400000)
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();

    const chosen = destination || suggestions.find(s => s.cityName.toLowerCase() === query.trim().toLowerCase());
    if (!chosen) {
      setError('Please choose a destination from the list');
      setSuggestionsOpen(true);
      return;
    }
    if (!checkInDate || !checkOutDate || nights < 1) {
      setError('Please choose check-in and check-out dates');
      return;
    }
    if (nights > 30) {
      setError('Stays longer than 30 nights are not supported');
      return;
    }

    const params = new URLSearchParams({
      city: chosen.cityName,
      country: chosen.countryCode,
      checkin: checkInDate,
      checkout: checkOutDate,
      rooms: String(rooms),
      adults: String(adults)
    });
    if (childrenAges.length > 0) params.set('children', childrenAges.join(','));

    router.push(`/hotels/search?${params.toString()}`);
  };

  const guestsSummary = `${rooms} Room${rooms > 1 ? 's' : ''}, ${adults} Adult${adults > 1 ? 's' : ''}${childrenAges.length ? `, ${childrenAges.length} Child${childrenAges.length > 1 ? 'ren' : ''}` : ''}`;

  return (
    <form onSubmit={handleSubmit} className={`sw-search__form hotel-search-form ${compact ? 'compact' : ''}`}>
      <div className="sw-search__fields sw-search__fields--hotel">
        {/* Destination */}
        <div className="search-field-mmt sw-cell hsf-destination" ref={destinationRef}>
          <label className="field-label" htmlFor="hotel-destination">
            <i className="fas fa-map-marker-alt"></i> Destination
          </label>
          <input
            id="hotel-destination"
            className="field-input city-input"
            value={query}
            placeholder="Where are you going?"
            autoComplete="off"
            onFocus={() => setSuggestionsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setDestination(null);
              setSuggestionsOpen(true);
            }}
          />
          <div className="field-subtext">
            {destination ? destination.label : 'City, area or landmark'}
          </div>

          {suggestionsOpen && (
            <div className="autocomplete-dropdown hsf-suggestions">
              {loadingSuggestions && suggestions.length === 0 && (
                <div className="dropdown-item loading-item">
                  <i className="fas fa-spinner fa-spin"></i> Searching…
                </div>
              )}
              {!loadingSuggestions && suggestions.length === 0 && (
                <div className="dropdown-item no-results">
                  <i className="fas fa-search"></i> No destinations found
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="dropdown-header">{query.trim().length < 2 ? 'POPULAR DESTINATIONS' : 'DESTINATIONS'}</div>
              )}
              {suggestions.map(item => (
                <button
                  type="button"
                  key={`${item.cityName}-${item.countryCode}`}
                  className="dropdown-item hsf-suggestion"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectDestination(item)}
                >
                  <i className="fas fa-city"></i>
                  <span>
                    <strong>{item.cityName}</strong>
                    <small>{item.label}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Check-in */}
        <div className="search-field-mmt sw-cell date-field">
          <DatePicker
            label="Check-in"
            icon="fa-calendar-alt"
            value={checkInDate}
            onChange={handleCheckIn}
            isOpen={calendarOpen === 'checkin'}
            onToggle={() => setCalendarOpen(calendarOpen === 'checkin' ? null : 'checkin')}
            onClose={() => setCalendarOpen(null)}
            departureDate={checkInDate}
            returnDate={checkOutDate}
            isReturn={false}
            showPrices={false}
            placeholder="Check-in"
          />
        </div>

        {/* Check-out */}
        <div className="search-field-mmt sw-cell date-field">
          <DatePicker
            label={`Check-out${nights > 0 ? ` · ${nights} night${nights > 1 ? 's' : ''}` : ''}`}
            icon="fa-calendar-alt"
            value={checkOutDate}
            onChange={handleCheckOut}
            isOpen={calendarOpen === 'checkout'}
            onToggle={() => setCalendarOpen(calendarOpen === 'checkout' ? null : 'checkout')}
            onClose={() => setCalendarOpen(null)}
            departureDate={checkInDate}
            returnDate={checkOutDate}
            isReturn={true}
            showPrices={false}
            placeholder="Check-out"
          />
        </div>

        {/* Rooms & Guests */}
        <div className="search-field-mmt sw-cell hsf-guests" ref={guestsRef}>
          <label className="field-label">
            <i className="fas fa-user-friends"></i> Rooms & guests
          </label>
          <button type="button" className="travellers-selector hsf-guests-toggle" onClick={() => setGuestsOpen(!guestsOpen)}>
            <span className="travellers-count">{guestsSummary}</span>
            <i className={`fas fa-chevron-down ${guestsOpen ? 'rotated' : ''}`}></i>
          </button>

          {guestsOpen && (
            <div className="hsf-guests-dropdown">
              {[
                { label: 'Rooms', hint: `Up to ${MAX_ROOMS}`, value: rooms, onChange: updateRooms },
                { label: 'Adults', hint: '18+ years', value: adults, onChange: updateAdults },
                { label: 'Children', hint: '0–17 years', value: childrenAges.length, onChange: updateChildren }
              ].map(row => (
                <div className="hsf-counter-row" key={row.label}>
                  <div>
                    <div className="hsf-counter-label">{row.label}</div>
                    <div className="hsf-counter-hint">{row.hint}</div>
                  </div>
                  <div className="hsf-stepper">
                    <button type="button" aria-label={`Fewer ${row.label}`} onClick={() => row.onChange(row.value - 1)}>−</button>
                    <span>{row.value}</span>
                    <button type="button" aria-label={`More ${row.label}`} onClick={() => row.onChange(row.value + 1)}>+</button>
                  </div>
                </div>
              ))}

              {childrenAges.length > 0 && (
                <div className="hsf-child-ages">
                  {childrenAges.map((age, i) => (
                    <label key={i}>
                      Child {i + 1} age
                      <select
                        value={age}
                        onChange={(e) => setChildrenAges(prev => prev.map((a, idx) => (idx === i ? Number(e.target.value) : a)))}
                      >
                        {Array.from({ length: 18 }, (_, n) => (
                          <option key={n} value={n}>{n === 0 ? 'Under 1' : `${n} yr${n > 1 ? 's' : ''}`}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}

              <button type="button" className="apply-btn hsf-apply" onClick={() => setGuestsOpen(false)}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="search-submit-btn-mmt">
        <i className="fas fa-search" aria-hidden="true"></i>
        <span>Search</span>
      </button>

      {error && <p className="hsf-error" role="alert">{error}</p>}
    </form>
  );
}
