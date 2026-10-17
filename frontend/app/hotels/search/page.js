'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import HotelSearchForm from '../../components/HotelSearchForm/HotelSearchForm';
import { searchHotels, readStay, stayQuery, formatMoney, formatStayDate } from '@/lib/api/hotels';
import Icon from '../../components/Icon/Icon';
import { HotelListSkeleton, StateMessage } from '../../components/Skeleton/Skeleton';
import '../hotels.css';

const SORTS = [
  { id: 'POPULARITY', label: 'Recommended' },
  { id: 'PRICE_ASC', label: 'Lowest price' },
  { id: 'PRICE_DESC', label: 'Highest price' },
  { id: 'STARS_DESC', label: 'Stars' },
  { id: 'RATING_DESC', label: 'Top rated' }
];

const SORTERS = {
  POPULARITY: (a, b) => a.popularityRank - b.popularityRank,
  PRICE_ASC: (a, b) => a.minPricePerNight - b.minPricePerNight,
  PRICE_DESC: (a, b) => b.minPricePerNight - a.minPricePerNight,
  STARS_DESC: (a, b) => (b.stars || 0) - (a.stars || 0) || a.minPricePerNight - b.minPricePerNight,
  RATING_DESC: (a, b) => (b.rating || 0) - (a.rating || 0) || a.minPricePerNight - b.minPricePerNight
};

const EMPTY_FILTERS = {
  name: '',
  freeCancellation: false,
  breakfast: false,
  minPrice: '',
  maxPrice: '',
  stars: [],
  minRating: 0
};

const cleanRoomName = (name) => (name || '').replace(/^\d+(?=[A-Za-z])/, '');

const ratingLabel = (rating) => {
  if (rating >= 9) return 'Exceptional';
  if (rating >= 8) return 'Excellent';
  if (rating >= 7) return 'Very Good';
  if (rating >= 6) return 'Good';
  return 'Rated';
};

function Stars({ count }) {
  if (!count) return null;
  return (
    <span className="hotel-stars" aria-label={`${count} star hotel`}>
      {Array.from({ length: Math.round(count) }, (_, i) => <span key={i}>★</span>)}
    </span>
  );
}

function HotelCard({ hotel, stay }) {
  const detailsHref = `/hotels/${encodeURIComponent(hotel.hotelId)}?${stayQuery(stay)}`;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="hotel-card">
      <Link href={detailsHref} className="hotel-card-image">
        {hotel.photo && !imageFailed ? (
          <img src={hotel.thumbnail || hotel.photo} alt={hotel.name} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="hotel-image-placeholder"><Icon name="hotel" size={32} /></div>
        )}
      </Link>

      <div className="hotel-card-body">
        <Stars count={hotel.stars} />
        <h3 className="hotel-card-name">
          <Link href={detailsHref}>{hotel.name}</Link>
        </h3>
        <p className="hotel-card-address">
          <Icon name="map-pin" size={14} /> {[hotel.address, hotel.cityName].filter(Boolean).join(', ')}
        </p>

        {hotel.cheapestRoomName && (
          <p className="hotel-card-room">{cleanRoomName(hotel.cheapestRoomName)}{hotel.cheapestBoardName ? ` · ${hotel.cheapestBoardName}` : ''}</p>
        )}

        <div className="hotel-tags">
          {hotel.hasFreeCancellation && <span className="sw-badge sw-badge--success"><Icon name="check" size={12} /> Free cancellation</span>}
          {hotel.hasBreakfast && <span className="sw-badge"><Icon name="coffee" size={12} /> Breakfast available</span>}
          {hotel.offersCount > 1 && <span className="sw-badge">{hotel.offersCount} room options</span>}
        </div>
      </div>

      <div className="hotel-card-price">
        {hotel.rating ? (
          <div className="hotel-rating">
            <span className="hotel-rating-score">{Number(hotel.rating).toFixed(1)}</span>
            <span className="hotel-rating-text">
              {ratingLabel(hotel.rating)}
              {hotel.reviewCount ? <small>{hotel.reviewCount.toLocaleString('en-IN')} reviews</small> : null}
            </span>
          </div>
        ) : <div />}

        <div className="hotel-price-block">
          {hotel.supplierName && (
            <span className="sw-supplier" title={`Rates supplied by ${hotel.supplierName}`}>
              <Icon name="shield-check" size={12} /> via <strong>{hotel.supplierName}</strong>
            </span>
          )}
          <div className="hotel-price-amount">{formatMoney(hotel.minPricePerNight, hotel.currency)}</div>
          <div className="hotel-price-note">per night</div>
          {hotel.nights > 1 && (
            <div className="hotel-price-note">{formatMoney(hotel.minPrice, hotel.currency)} for {hotel.nights} nights</div>
          )}
          {hotel.payAtPropertyAmount > 0 && (
            <div className="hotel-price-note warn">+ {formatMoney(hotel.payAtPropertyAmount, hotel.currency)} taxes payable at hotel</div>
          )}
          <Link href={detailsHref} className="btn btn-primary hotel-select-btn">See rooms</Link>
        </div>
      </div>
    </article>
  );
}

function HotelSearchContent() {
  const searchParams = useSearchParams();
  const cityName = searchParams.get('city') || '';
  const countryCode = searchParams.get('country') || 'IN';
  const stay = useMemo(() => readStay(searchParams), [searchParams]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('POPULARITY');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    if (!cityName || !stay.checkInDate || !stay.checkOutDate) {
      setLoading(false);
      setError('Please choose a destination and dates to search hotels.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchHotels({
        cityName,
        countryCode,
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        adults: stay.adults,
        rooms: stay.rooms,
        childrenAges: stay.childrenAges.join(',') || undefined
      });
      setResult(data);
      setFilters(EMPTY_FILTERS);
    } catch (err) {
      setError(err.message || 'Could not load hotels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [cityName, countryCode, stay]);

  useEffect(() => { load(); }, [load]);

  const hotels = useMemo(() => result?.data || [], [result]);

  const priceBounds = useMemo(() => {
    if (hotels.length === 0) return { min: 0, max: 0 };
    const prices = hotels.map(h => h.minPricePerNight);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [hotels]);

  const visible = useMemo(() => {
    const name = filters.name.trim().toLowerCase();
    const min = parseFloat(filters.minPrice);
    const max = parseFloat(filters.maxPrice);
    return hotels
      .filter(h => !name || h.name?.toLowerCase().includes(name))
      .filter(h => !filters.freeCancellation || h.hasFreeCancellation)
      .filter(h => !filters.breakfast || h.hasBreakfast)
      .filter(h => isNaN(min) || h.minPricePerNight >= min)
      .filter(h => isNaN(max) || h.minPricePerNight <= max)
      .filter(h => filters.stars.length === 0 || filters.stars.includes(Math.round(h.stars || 0)))
      .filter(h => !filters.minRating || (h.rating || 0) >= filters.minRating)
      .sort(SORTERS[sortBy]);
  }, [hotels, filters, sortBy]);

  const toggleStar = (star) => setFilters(prev => ({
    ...prev,
    stars: prev.stars.includes(star) ? prev.stars.filter(s => s !== star) : [...prev.stars, star]
  }));

  const activeFilterCount = [
    filters.name, filters.freeCancellation, filters.breakfast, filters.minPrice, filters.maxPrice, filters.minRating
  ].filter(Boolean).length + filters.stars.length;

  return (
    <>
      <Header />
      <main className="hotels-page">
        <div className="hotels-search-bar">
          <div className="container">
            <HotelSearchForm
              compact
              initial={{ cityName, countryCode, checkInDate: stay.checkInDate, checkOutDate: stay.checkOutDate, adults: stay.adults, rooms: stay.rooms, childrenAges: stay.childrenAges }}
            />
          </div>
        </div>

        <div className="container">
          <nav className="hotels-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <Icon name="chevron-right" size={14} /> <span>Hotels in {cityName || '—'}</span>
          </nav>

          <div className="hotels-layout">
            {/* Filters */}
            <aside className={`hotels-filters ${filtersOpen ? 'open' : ''}`}>
              <div className="filters-header">
                <h2>Filters</h2>
                <button type="button" className="link-btn" onClick={() => setFilters(EMPTY_FILTERS)} disabled={activeFilterCount === 0}>
                  Clear all
                </button>
              </div>

              <section className="filter-group">
                <h3>Search by property name</h3>
                <div className="filter-search">
                  <Icon name="search" size={16} />
                  <input
                    value={filters.name}
                    placeholder="e.g. Taj, Marriott"
                    onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </section>

              <section className="filter-group">
                <h3>Popular</h3>
                <label className="filter-check">
                  <input type="checkbox" checked={filters.freeCancellation} onChange={(e) => setFilters(prev => ({ ...prev, freeCancellation: e.target.checked }))} />
                  Free cancellation
                </label>
                <label className="filter-check">
                  <input type="checkbox" checked={filters.breakfast} onChange={(e) => setFilters(prev => ({ ...prev, breakfast: e.target.checked }))} />
                  Breakfast included
                </label>
              </section>

              <section className="filter-group">
                <h3>Price per night</h3>
                {hotels.length > 0 && (
                  <p className="filter-hint">From {formatMoney(priceBounds.min)} to {formatMoney(priceBounds.max)}</p>
                )}
                <div className="filter-price">
                  <label>
                    Min
                    <input type="number" min="0" inputMode="numeric" value={filters.minPrice} placeholder={String(priceBounds.min)}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))} />
                  </label>
                  <label>
                    Max
                    <input type="number" min="0" inputMode="numeric" value={filters.maxPrice} placeholder={String(priceBounds.max)}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))} />
                  </label>
                </div>
              </section>

              <section className="filter-group">
                <h3>Star rating</h3>
                {[5, 4, 3, 2, 1].map(star => (
                  <label className="filter-check" key={star}>
                    <input type="checkbox" checked={filters.stars.includes(star)} onChange={() => toggleStar(star)} />
                    <span className="filter-stars">{'★'.repeat(star)}</span>
                  </label>
                ))}
              </section>

              <section className="filter-group">
                <h3>Guest rating</h3>
                {[[9, 'Exceptional 9+'], [8, 'Excellent 8+'], [7, 'Very good 7+'], [0, 'Any']].map(([value, label]) => (
                  <label className="filter-check" key={value}>
                    <input type="radio" name="minRating" checked={filters.minRating === value}
                      onChange={() => setFilters(prev => ({ ...prev, minRating: value }))} />
                    {label}
                  </label>
                ))}
              </section>

              <button type="button" className="btn btn-primary filters-done" onClick={() => setFiltersOpen(false)}>
                Show {visible.length} properties
              </button>
            </aside>

            {/* Results */}
            <section className="hotels-results">
              <div className="hotels-results-header">
                <div>
                  <h1>{cityName ? `Hotels in ${cityName}` : 'Hotels'}</h1>
                  <p className="hotels-results-sub">
                    {formatStayDate(stay.checkInDate)} – {formatStayDate(stay.checkOutDate)} · {stay.rooms} Room{stay.rooms > 1 ? 's' : ''}, {stay.adults} Adult{stay.adults > 1 ? 's' : ''}
                    {stay.childrenAges.length > 0 ? `, ${stay.childrenAges.length} Child${stay.childrenAges.length > 1 ? 'ren' : ''}` : ''}
                    {!loading && !error && ` · ${visible.length} of ${hotels.length} properties`}
                  </p>
                </div>
                <button type="button" className="btn btn-outline filters-toggle" onClick={() => setFiltersOpen(true)}>
                  <Icon name="sliders" size={16} /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
                </button>
              </div>

              <div className="hotels-sort" role="tablist" aria-label="Sort hotels">
                                {SORTS.map(sort => (
                  <button
                    key={sort.id}
                    type="button"
                    role="tab"
                    aria-selected={sortBy === sort.id}
                    className={`sort-chip ${sortBy === sort.id ? 'active' : ''}`}
                    onClick={() => setSortBy(sort.id)}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>

              {loading && <HotelListSkeleton />}

              {!loading && error && (
                <StateMessage icon="alert" tone="danger" title="We couldn’t load stays"
                  action={cityName && <button type="button" className="btn btn-primary" onClick={load}>Try again</button>}>
                  {error}
                </StateMessage>
              )}

              {!loading && !error && hotels.length === 0 && (
                <StateMessage icon="bed" tone="brand" title={`No rooms in ${cityName || 'this city'} for these dates`}>
                  Try different dates or a nearby city.
                </StateMessage>
              )}

              {!loading && !error && hotels.length > 0 && visible.length === 0 && (
                <StateMessage icon="sliders" title="No properties match your filters"
                  action={<button type="button" className="btn btn-primary" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>}>
                  Try removing a filter or widening the price range.
                </StateMessage>
              )}

              {!loading && !error && visible.length > 0 && (
                <div className="hotels-list">
                  {visible.map(hotel => <HotelCard key={hotel.hotelId} hotel={hotel} stay={stay} />)}
                </div>
              )}
            </section>
          </div>
        </div>
        {filtersOpen && <div className="filters-overlay" onClick={() => setFiltersOpen(false)} />}
      </main>
      <Footer />
    </>
  );
}

export default function HotelSearchPage() {
  return (
    <Suspense fallback={<main className="hotels-page"><div className="container" style={{ paddingTop: 32 }}><HotelListSkeleton /></div></main>}>
      <HotelSearchContent />
    </Suspense>
  );
}
