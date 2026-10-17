'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, Fragment } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import { HotelDetailsSkeleton, StateMessage } from '../../components/Skeleton/Skeleton';
import { getHotelDetails, readStay, stayQuery, formatMoney, formatStayDate } from '@/lib/api/hotels';
import '../hotels.css';

const AMENITIES_PREVIEW = 18;
const DESCRIPTION_PREVIEW = 3;

const cleanRoomName = (name) => (name || '').replace(/^\d+(?=[A-Za-z])/, '');

const ratingLabel = (rating) => {
  if (rating >= 9) return 'Exceptional';
  if (rating >= 8) return 'Excellent';
  if (rating >= 7) return 'Very good';
  if (rating >= 6) return 'Good';
  return 'Rated';
};

function Stars({ count }) {
  if (!count) return null;
  return (
    <span className="hotel-stars" aria-label={`${count} star hotel`}>
      {'★'.repeat(Math.round(count))}
    </span>
  );
}

function Lightbox({ images, index, onClose, onMove }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onMove]);

  const image = images[index];
  return (
    <div className="hd-lightbox" role="dialog" aria-modal="true" aria-label="Hotel photos" onClick={onClose}>
      <img src={image.url} alt={image.caption || `Photo ${index + 1}`} onClick={(e) => e.stopPropagation()} />
      <button type="button" className="lb-close" aria-label="Close" onClick={onClose}><Icon name="x" size={22} /></button>
      <button type="button" className="lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); onMove(-1); }}><Icon name="chevron-left" size={24} /></button>
      <button type="button" className="lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); onMove(1); }}><Icon name="chevron-right" size={24} /></button>
      <span className="hd-lightbox-caption">{index + 1} / {images.length}{image.caption ? ` · ${image.caption}` : ''}</span>
    </div>
  );
}

// Figma "Room card" + "Room Rate Row"
function RoomCard({ room, onSelect }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = !photoFailed && room.photos?.[0];

  return (
    <div className="hd-room">
      <div className="hd-room-media">
        {photo ? (
          <img className="hd-room-photo" src={photo} alt={cleanRoomName(room.name)} loading="lazy" onError={() => setPhotoFailed(true)} />
        ) : (
          <div className="hd-room-photo hotel-image-placeholder"><Icon name="bed" size={32} /></div>
        )}
      </div>

      <div className="hd-room-body">
        <div className="hd-room-info">
          <h3>{cleanRoomName(room.name)}</h3>
          <ul className="hd-room-facts">
            {room.sizeSqm ? <li>{room.sizeSqm} m²</li> : null}
            {room.bedTypes?.length ? <li><Icon name="bed" size={14} /> {room.bedTypes.join(', ')}</li> : null}
            {room.maxOccupancy ? <li><Icon name="users" size={14} /> Sleeps {room.maxOccupancy}</li> : null}
            {room.views?.length ? <li>{room.views.join(', ')}</li> : null}
            {room.amenities?.slice(0, 3).map(a => <li key={a}>{a}</li>)}
          </ul>
        </div>

        <div className="hd-rates">
          {room.offers.map(rate => (
            <div className="hd-rate" key={rate.offerId}>
              <div className="hd-rate-info">
                <h4>{rate.boardName || 'Room only'}</h4>
                {rate.refundable
                  ? <span className="sw-badge sw-badge--success"><Icon name="check" size={12} /> Free cancellation</span>
                  : <span className="sw-badge sw-badge--danger">Non-refundable</span>}
                {rate.cancellationText && <p className="hd-rate-policy">{rate.cancellationText}</p>}
              </div>
              <div className="hd-rate-price">
                <strong>{formatMoney(rate.pricePerNight, rate.currency)}</strong>
                <small>per night{rate.nights > 1 ? ` · ${formatMoney(rate.totalAmount, rate.currency)} total` : ''}</small>
                {rate.payAtProperty?.length > 0 && (
                  <small className="hotel-price-note warn">
                    + {formatMoney(rate.payAtProperty.reduce((sum, f) => sum + f.amount, 0), rate.currency)} at hotel
                  </small>
                )}
              </div>
              <button type="button" className="btn btn-primary hotel-select-btn" onClick={() => onSelect(room, rate)}>
                Select
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HotelDetailsContent() {
  const { hotelId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const stay = useMemo(() => readStay(searchParams), [searchParams]);

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHotelDetails(decodeURIComponent(hotelId), {
        checkInDate: stay.checkInDate || undefined,
        checkOutDate: stay.checkOutDate || undefined,
        adults: stay.adults,
        rooms: stay.rooms,
        childrenAges: stay.childrenAges.join(',') || undefined
      });
      setDetails(data);
    } catch (err) {
      setError(err.message || 'Could not load this hotel.');
    } finally {
      setLoading(false);
    }
  }, [hotelId, stay]);

  useEffect(() => { load(); }, [load]);

  const hotel = details?.hotel;
  const images = useMemo(() => (hotel?.images?.length ? hotel.images : (hotel?.mainPhoto ? [{ url: hotel.mainPhoto }] : [])), [hotel]);
  const moveLightbox = useCallback((step) => {
    setLightboxIndex(i => (i + step + images.length) % images.length);
  }, [images.length]);

  const selectRate = (room, rate) => {
    sessionStorage.setItem('hotelSelection', JSON.stringify({
      offerId: rate.offerId,
      hotel: {
        hotelId: hotel.hotelId,
        name: hotel.name,
        stars: hotel.stars,
        address: [hotel.address, hotel.city].filter(Boolean).join(', '),
        photo: images[0]?.url || null
      },
      room: { name: room.name, photo: room.photos?.[0] || null, bedTypes: room.bedTypes },
      rate,
      stay: { ...stay, nights: details.stay?.nights }
    }));
    router.push('/hotels/booking');
  };

  if (loading) return <HotelDetailsSkeleton />;

  if (error || !hotel) {
    return (
      <StateMessage icon="alert" tone="danger" title="We couldn’t load this hotel"
        action={<button type="button" className="btn btn-primary" onClick={load}>Try again</button>}>
        {error || 'Hotel not found.'}
      </StateMessage>
    );
  }

  const description = showFullDescription ? hotel.description : hotel.description.slice(0, DESCRIPTION_PREVIEW);
  const amenities = showAllAmenities ? hotel.facilities : hotel.facilities.slice(0, AMENITIES_PREVIEW);
  const hasStay = Boolean(details.stay);
  const lat = hotel.location?.latitude;
  const lng = hotel.location?.longitude;
  const searchHref = hotel.city ? `/hotels/search?city=${encodeURIComponent(hotel.city)}&country=${hotel.countryCode || 'IN'}&${stayQuery(stay)}` : null;

  return (
    <>
      <nav className="hotels-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <Icon name="chevron-right" size={14} />
        {searchHref ? <Link href={searchHref}>Hotels in {hotel.city}</Link> : <span>Hotels</span>}
        <Icon name="chevron-right" size={14} /> <span aria-current="page">{hotel.name}</span>
      </nav>

      <header className="hd-header">
        <div>
          <Stars count={hotel.stars} />
          <h1>{hotel.name}</h1>
          <p className="hd-address"><Icon name="map-pin" size={16} /> {[hotel.address, hotel.city, hotel.zip].filter(Boolean).join(', ')}
            {lat && lng ? <a href="#location"> · Show on map</a> : null}
          </p>
        </div>
        {hotel.rating ? (
          <div className="sw-rating hd-header__rating">
            <span className="sw-rating__score">{Number(hotel.rating).toFixed(1)}</span>
            <span>
              <span className="sw-rating__verdict">{ratingLabel(hotel.rating)}</span>
              {hotel.reviewCount ? <span className="sw-rating__reviews">{hotel.reviewCount.toLocaleString('en-IN')} reviews</span> : null}
            </span>
          </div>
        ) : null}
      </header>

      <div className={`hd-gallery ${images.length < 5 ? 'is-short' : ''}`}>
        {images.slice(0, 5).map((image, i) => (
          <button type="button" key={image.url} onClick={() => setLightboxIndex(i)} aria-label={`Open photo ${i + 1}`}>
            <img src={image.url} alt={image.caption || `${hotel.name} photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
          </button>
        ))}
        {images.length === 0 && <div className="hotel-image-placeholder"><Icon name="hotel" size={40} /></div>}
        {images.length > 1 && (
          <button type="button" className="hd-gallery-more" onClick={() => setLightboxIndex(0)}>
            <Icon name="menu" size={16} /> Show all {images.length} photos
          </button>
        )}
      </div>

      <nav className="hd-tabs" aria-label="Hotel sections">
        <a href="#overview">Overview</a>
        {hotel.facilities.length > 0 && <a href="#amenities">Amenities</a>}
        <a href="#rooms">Rooms</a>
        {lat && lng ? <a href="#location">Location</a> : null}
        <a href="#policies">Policies</a>
      </nav>

      <div className="hd-layout">
        <div className="hd-main">
          <section id="overview" className="hd-section hd-description">
            <h2>About this stay</h2>
            {description.length > 0 ? description.map((para, i) => <p key={i}>{para}</p>) : <p>No description available.</p>}
            {hotel.description.length > DESCRIPTION_PREVIEW && (
              <button type="button" className="link-btn" onClick={() => setShowFullDescription(v => !v)}>
                {showFullDescription ? 'Show less' : 'Read more'}
              </button>
            )}
            <div className="hd-highlights">
              {hotel.checkIn?.from && <div><Icon name="clock" size={20} /><span><strong>Check-in from {hotel.checkIn.from}</strong><small>{hotel.checkIn?.checkout ? `Check-out until ${hotel.checkIn.checkout}` : 'See policies'}</small></span></div>}
              <div><Icon name="shield-check" size={20} /><span><strong>Rate confirmed live</strong><small>{details.supplierName ? `Checked with ${details.supplierName}` : 'Checked before you pay'}</small></span></div>
              {hotel.facilities.some(f => /wi-?fi|internet/i.test(f)) && <div><Icon name="wifi" size={20} /><span><strong>Wi-Fi available</strong><small>See amenities</small></span></div>}
            </div>
          </section>

          {hotel.facilities.length > 0 && (
            <section id="amenities" className="hd-section">
              <h2>Amenities</h2>
              <ul className="hd-amenities">
                {amenities.map(item => <li key={item}><Icon name="check" size={16} /> {item}</li>)}
              </ul>
              {hotel.facilities.length > AMENITIES_PREVIEW && (
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllAmenities(v => !v)}>
                  {showAllAmenities ? 'Show fewer amenities' : `Show all ${hotel.facilities.length} amenities`}
                </button>
              )}
            </section>
          )}

          <section id="rooms" className="hd-section">
            <div className="hd-section__head">
              <h2>Choose your room</h2>
              {details.supplierName && <span className="sw-supplier"><Icon name="shield-check" size={12} /> via <strong>{details.supplierName}</strong></span>}
            </div>
            {details.rooms.length > 0 ? (
              <div className="hd-rooms">
                {details.rooms.map(room => <RoomCard key={`${room.roomId}-${room.name}`} room={room} onSelect={selectRate} />)}
              </div>
            ) : (
              <StateMessage icon="bed" tone="brand" title={hasStay ? 'Sold out for your dates' : 'Add dates to see rooms'}
                action={<Link href="/?tab=hotels" className="btn btn-primary">Change dates</Link>}>
                {hasStay ? 'No rooms are available for these dates. Try different dates.' : 'Search with dates to see live room rates.'}
              </StateMessage>
            )}
          </section>

          {lat && lng ? (
            <section id="location" className="hd-section">
              <h2>Location</h2>
              <p className="hd-muted">{[hotel.address, hotel.city].filter(Boolean).join(', ')}</p>
              <iframe
                className="hd-map"
                title={`Map of ${hotel.name}`}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
              />
              <a className="sw-link" href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
                Open in Google Maps <Icon name="arrow-right" size={14} />
              </a>
            </section>
          ) : null}

          <section id="policies" className="hd-section hd-policies">
            <h2>Policies</h2>
            <dl>
              {hotel.checkIn?.from && <><dt>Check-in</dt><dd>From {hotel.checkIn.from}{hotel.checkIn.until ? ` until ${hotel.checkIn.until}` : ''}</dd></>}
              {hotel.checkIn?.checkout && <><dt>Check-out</dt><dd>Until {hotel.checkIn.checkout}</dd></>}
              {hotel.childAllowed !== null && <><dt>Children</dt><dd>{hotel.childAllowed ? 'Children are welcome' : 'Children are not allowed'}</dd></>}
              {hotel.petsAllowed !== null && <><dt>Pets</dt><dd>{hotel.petsAllowed ? 'Pets allowed' : 'Pets not allowed'}</dd></>}
              {hotel.parking && <><dt>Parking</dt><dd>{hotel.parking}</dd></>}
              {hotel.policies.map((p, i) => <Fragment key={`${p.name}-${i}`}><dt>{p.name}</dt><dd>{p.description}</dd></Fragment>)}
            </dl>
            {hotel.importantInformation.length > 0 && (
              <div className="hd-description">
                <h3>Important information</h3>
                {hotel.importantInformation.map((para, i) => <p key={i}>{para}</p>)}
              </div>
            )}
          </section>
        </div>

        <aside className="hd-price-box">
          {details.fromPrice ? (
            <>
              <span className="hd-price-box__label">From</span>
              <span className="hd-price">{formatMoney(details.fromPrice.pricePerNight, details.fromPrice.currency)}<small> / night</small></span>
              <div className="hd-stay">
                <div><span className="sw-overline">Check-in</span><strong>{formatStayDate(details.stay.checkInDate)}</strong></div>
                <div><span className="sw-overline">Check-out</span><strong>{formatStayDate(details.stay.checkOutDate)}</strong></div>
                <div className="hd-stay__guests"><span className="sw-overline">Guests</span><strong>{details.stay.rooms || stay.rooms} Room{(details.stay.rooms || stay.rooms) > 1 ? 's' : ''} · {details.stay.adults || stay.adults} Adult{(details.stay.adults || stay.adults) > 1 ? 's' : ''}</strong></div>
              </div>
              <a href="#rooms" className="btn btn-accent btn-lg btn-block">Choose a room</a>
              <p className="hd-assure"><Icon name="shield-check" size={16} /> You won’t be charged until payment</p>
            </>
          ) : (
            <>
              <span className="hd-price">{hasStay ? 'Sold out' : 'Check availability'}</span>
              <p className="hd-muted">{hasStay ? 'No rooms available for your dates.' : 'Choose your dates to see live room rates.'}</p>
              <Link href="/?tab=hotels" className="btn btn-primary btn-lg btn-block">Change search</Link>
            </>
          )}
        </aside>
      </div>

      {details.fromPrice && (
        <div className="hd-sticky-cta">
          <div>
            <strong>{formatMoney(details.fromPrice.pricePerNight, details.fromPrice.currency)}</strong> <small>/ night</small>
          </div>
          <a href="#rooms" className="btn btn-accent">Choose room</a>
        </div>
      )}

      {lightboxIndex !== null && images.length > 0 && (
        <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onMove={moveLightbox} />
      )}
    </>
  );
}

export default function HotelDetailsPage() {
  return (
    <>
      <Header />
      <main className="hotels-page">
        <div className="container">
          <Suspense fallback={<HotelDetailsSkeleton />}>
            <HotelDetailsContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
