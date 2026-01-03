'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AirportAutocomplete from '../AirportAutocomplete/AirportAutocomplete';
import DatePicker from '../DatePicker/DatePicker';
import './FlightSearchWidget.css';

export default function FlightSearchWidget() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('flights');
  const [calendarOpen, setCalendarOpen] = useState(null); // null, 'departure', or 'return'
  
  const [searchData, setSearchData] = useState({
    tripType: 'roundtrip',
    fromCode: '',
    fromAirport: null,
    toCode: '',
    toAirport: null,
    departDate: '', // Will be set dynamically
    returnDate: '',  // Will be set dynamically
    passengers: 1,
    cabinClass: 'economy'
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

  const tabs = [
    { id: 'flights', label: 'Flights', icon: 'fa-plane' },
    { id: 'hotels', label: 'Hotels', icon: 'fa-hotel' },
    { id: 'homestays', label: 'Homestays & Villas', icon: 'fa-house' },
    { id: 'holiday', label: 'Holiday Packages', icon: 'fa-umbrella-beach' },
    { id: 'trains', label: 'Trains', icon: 'fa-train' },
    { id: 'buses', label: 'Buses', icon: 'fa-bus' },
    { id: 'cabs', label: 'Cabs', icon: 'fa-car' },
    { id: 'forex', label: 'Forex Card & Currency', icon: 'fa-credit-card' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (activeTab !== 'flights') {
      alert(`${activeTab} booking coming soon!`);
      return;
    }

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

  return (
    <div className="flight-search-widget-mmt">
      {/* Tab Navigation */}
      <div className="search-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`fas ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search Widget Card */}
      <div className="search-widget-card-mmt">
        {activeTab === 'flights' && (
          <form onSubmit={handleSubmit} className="search-form-mmt">
            {/* Trip Type Selector */}
            <div className="trip-type-selector-mmt">
              <label className="trip-type-radio">
                <input
                  type="radio"
                  name="tripType"
                  value="roundtrip"
                  checked={searchData.tripType === 'roundtrip'}
                  onChange={(e) => handleChange('tripType', e.target.value)}
                />
                <span>Round Trip</span>
              </label>
              <label className="trip-type-radio">
                <input
                  type="radio"
                  name="tripType"
                  value="oneway"
                  checked={searchData.tripType === 'oneway'}
                  onChange={(e) => handleChange('tripType', e.target.value)}
                />
                <span>One Way</span>
              </label>
              <label className="trip-type-radio">
                <input
                  type="radio"
                  name="tripType"
                  value="multicity"
                  disabled
                />
                <span>Multi City</span>
              </label>
            </div>

            {/* Search Fields */}
            <div className="search-fields-row">
              {/* From */}
              <div className="search-field-mmt from-field">
                <AirportAutocomplete
                  label="FROM"
                  icon="fa-plane-departure"
                  placeholder="Delhi"
                  value={searchData.fromAirport?.displayText || ''}
                  onChange={handleFromChange}
                  required
                />
              </div>

              {/* Swap Button */}
              <button 
                type="button" 
                className="swap-button-mmt" 
                onClick={swapLocations}
                title="Swap locations"
              >
                <i className="fas fa-exchange-alt"></i>
              </button>

              {/* To */}
              <div className="search-field-mmt to-field">
                <AirportAutocomplete
                  label="TO"
                  icon="fa-plane-arrival"
                  placeholder="Mumbai"
                  value={searchData.toAirport?.displayText || ''}
                  onChange={handleToChange}
                  required
                />
              </div>

              {/* Departure Date */}
              <div className="search-field-mmt date-field">
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
                <div className="search-field-mmt date-field">
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
                    placeholder={searchData.returnDate ? "Select Date" : "Select Return Date"}
                    required
                  />
                </div>
              )}

              {/* Travelers & Class */}
              <div className="search-field-mmt travelers-field">
                <label className="field-label">
                  <i className="fas fa-user"></i> TRAVELLERS & CLASS
                </label>
                <select
                  value={searchData.passengers}
                  onChange={(e) => handleChange('passengers', e.target.value)}
                  className="field-input"
                >
                  {[1,2,3,4,5,6,7,8,9].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'Traveller' : 'Travellers'}</option>
                  ))}
                </select>
                <div className="field-subtext">
                  {searchData.cabinClass === 'economy' ? 'Economy/Premium Economy' : searchData.cabinClass}
                </div>
              </div>
            </div>

            {/* Special Fares */}
            <div className="special-fares">
              <span className="special-fares-label">Select A Fare Type:</span>
              <label className="fare-type">
                <input type="radio" name="fareType" defaultChecked />
                <span>Regular Fares</span>
              </label>
              <label className="fare-type">
                <input type="radio" name="fareType" />
                <span>
                  <i className="fas fa-briefcase"></i> Corporate Fares
                </span>
              </label>
              <label className="fare-type">
                <input type="radio" name="fareType" />
                <span>
                  <i className="fas fa-graduation-cap"></i> Student Fares
                </span>
              </label>
              <label className="fare-type">
                <input type="radio" name="fareType" />
                <span>
                  <i className="fas fa-medal"></i> Senior Citizen
                </span>
              </label>
              <label className="fare-type">
                <input type="radio" name="fareType" />
                <span>
                  <i className="fas fa-user-md"></i> Armed Forces
                </span>
              </label>
            </div>

            {/* Search Button */}
            <button type="submit" className="search-submit-btn-mmt">
              <i className="fas fa-search"></i> SEARCH
            </button>
          </form>
        )}

        {activeTab !== 'flights' && (
          <div className="coming-soon">
            <i className={`fas ${tabs.find(t => t.id === activeTab)?.icon} fa-3x`}></i>
            <h3>{tabs.find(t => t.id === activeTab)?.label}</h3>
            <p>This feature is coming soon! Stay tuned.</p>
          </div>
        )}
      </div>
    </div>
  );
}
