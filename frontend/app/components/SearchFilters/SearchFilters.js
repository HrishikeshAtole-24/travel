'use client';

import { useState, useEffect } from 'react';
import getSymbolFromCurrency from 'currency-symbol-map';
import Icon from '../Icon/Icon';
import './SearchFilters.css';

const STOPS = [['any', 'Any'], ['nonstop', 'Non-stop'], ['1stop', '1 stop']];
const SLOTS = [
  ['morning', 'Morning', '6 AM – 12 PM'],
  ['afternoon', 'Afternoon', '12 – 6 PM'],
  ['evening', 'Evening', '6 PM – 12 AM'],
  ['any', 'Any time', 'All departures']
];

// Figma "Filters" rail (Flight Results · Desktop)
export default function SearchFilters({ filters, priceRange = { min: 0, max: 100000, currency: 'INR' }, onApplyFilters, onResetFilters }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const currencySymbol = getSymbolFromCurrency(priceRange.currency) || priceRange.currency;

  // Sync when the parent recalculates (e.g. the price range from results)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...localFilters, [filterName]: value };
    setLocalFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const handleReset = () => {
    const defaultFilters = { stops: 'any', priceRange: [priceRange.min, priceRange.max], departureTime: 'any', airlines: [] };
    setLocalFilters(defaultFilters);
    if (onResetFilters) onResetFilters(defaultFilters);
    else onApplyFilters(defaultFilters);
  };

  const maxSelected = Math.min(Math.max(localFilters.priceRange[1] || priceRange.max, priceRange.min), priceRange.max);
  const pct = priceRange.max > priceRange.min ? ((maxSelected - priceRange.min) / (priceRange.max - priceRange.min)) * 100 : 100;
  const isDirty = localFilters.stops !== 'any' || localFilters.departureTime !== 'any' || maxSelected < priceRange.max;

  return (
    <div className="search-filters">
      <div className="filters-head">
        <h3 className="filters-title">Filters</h3>
        {isDirty && <button type="button" className="filters-reset" onClick={handleReset}>Clear all</button>}
      </div>

      <div className="filter-section">
        <h4 className="filter-heading">Stops</h4>
        <div className="filter-chips" role="radiogroup" aria-label="Stops">
          {STOPS.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={localFilters.stops === value}
              className={`filter-chip ${localFilters.stops === value ? 'active' : ''}`}
              onClick={() => handleFilterChange('stops', value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h4 className="filter-heading">Departure time</h4>
        <div className="filter-slots" role="radiogroup" aria-label="Departure time">
          {SLOTS.map(([value, label, hint]) => (
            <button key={value} type="button" role="radio" aria-checked={localFilters.departureTime === value}
              className={`filter-slot ${localFilters.departureTime === value ? 'active' : ''}`}
              onClick={() => handleFilterChange('departureTime', value)}>
              <strong>{label}</strong>
              <span>{hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-heading-row">
          <h4 className="filter-heading">Max price</h4>
          <span className="filter-value" suppressHydrationWarning>{currencySymbol}{maxSelected.toLocaleString('en-IN')}</span>
        </div>
        <input
          type="range"
          min={priceRange.min}
          max={priceRange.max}
          step="1"
          value={maxSelected}
          onChange={(e) => handleFilterChange('priceRange', [priceRange.min, parseInt(e.target.value)])}
          className="price-slider"
          style={{ '--fill': `${pct}%` }}
          aria-label="Maximum price"
        />
        <div className="price-values">
          <span suppressHydrationWarning>{currencySymbol}{priceRange.min.toLocaleString('en-IN')}</span>
          <span suppressHydrationWarning>{currencySymbol}{priceRange.max.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="filter-note">
        <Icon name="shield-check" size={16} />
        <span>Fares are re-checked with the supplier before you pay.</span>
      </div>
    </div>
  );
}
