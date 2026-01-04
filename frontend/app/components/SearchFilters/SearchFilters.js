'use client';

import { useState } from 'react';
import './SearchFilters.css';

export default function SearchFilters({ filters, onApplyFilters, onResetFilters }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...localFilters, [filterName]: value };
    setLocalFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const handleReset = () => {
    const defaultFilters = {
      stops: 'any',
      priceRange: [0, 100000],
      departureTime: 'any',
      airlines: []
    };
    setLocalFilters(defaultFilters);
    if (onResetFilters) {
      onResetFilters(defaultFilters);
    } else {
      onApplyFilters(defaultFilters);
    }
  };

  return (
    <div className="search-filters">
      <h3 className="filters-title">Filters</h3>

      {/* Stops Filter */}
      <div className="filter-section">
        <h4 className="filter-heading">Stops</h4>
        <div className="filter-options">
          <label className="filter-option">
            <input
              type="radio"
              name="stops"
              value="any"
              checked={localFilters.stops === 'any'}
              onChange={(e) => handleFilterChange('stops', e.target.value)}
            />
            <span>Any</span>
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="stops"
              value="nonstop"
              checked={localFilters.stops === 'nonstop'}
              onChange={(e) => handleFilterChange('stops', e.target.value)}
            />
            <span>Non-stop</span>
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="stops"
              value="1stop"
              checked={localFilters.stops === '1stop'}
              onChange={(e) => handleFilterChange('stops', e.target.value)}
            />
            <span>1 Stop</span>
          </label>
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="filter-section">
        <h4 className="filter-heading">Price Range</h4>
        <div className="price-range">
          <input
            type="range"
            min="0"
            max="100000"
            step="1000"
            value={localFilters.priceRange[1]}
            onChange={(e) => handleFilterChange('priceRange', [0, parseInt(e.target.value)])}
            className="price-slider"
          />
          <div className="price-values">
            <span>₹0</span>
            <span suppressHydrationWarning>₹{localFilters.priceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Departure Time Filter */}
      <div className="filter-section">
        <h4 className="filter-heading">Departure Time</h4>
        <div className="filter-options">
          <label className="filter-option">
            <input
              type="radio"
              name="departureTime"
              value="any"
              checked={localFilters.departureTime === 'any'}
              onChange={(e) => handleFilterChange('departureTime', e.target.value)}
            />
            <span>Any Time</span>
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="departureTime"
              value="morning"
              checked={localFilters.departureTime === 'morning'}
              onChange={(e) => handleFilterChange('departureTime', e.target.value)}
            />
            <span>Morning (6AM - 12PM)</span>
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="departureTime"
              value="afternoon"
              checked={localFilters.departureTime === 'afternoon'}
              onChange={(e) => handleFilterChange('departureTime', e.target.value)}
            />
            <span>Afternoon (12PM - 6PM)</span>
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="departureTime"
              value="evening"
              checked={localFilters.departureTime === 'evening'}
              onChange={(e) => handleFilterChange('departureTime', e.target.value)}
            />
            <span>Evening (6PM - 12AM)</span>
          </label>
        </div>
      </div>

      <button
        className="btn btn-outline reset-btn"
        onClick={handleReset}
      >
        Reset Filters
      </button>
    </div>
  );
}
