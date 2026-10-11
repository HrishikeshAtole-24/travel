'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, Fragment } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import { getHotelDetails, readStay, stayQuery, formatMoney, formatStayDate } from '@/lib/api/hotels';
import '../hotels.css';

const AMENITIES_PREVIEW = 18;
const DESCRIPTION_PREVIEW = 3;

function Stars({ count }) {
  if (!count) return null;
  return (
    <span className="hotel-stars" aria-label={`${count} star hotel`}>
      {Array.from({ length: Math.round(count) }, (_, i) => <i key={i} className="fas fa-star"></i>)}
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
      <button type="button" className="lb-close" aria-label="Close" onClick={onClose}><i className="fas fa-times"></i></button>
      <button type="button" className="lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); onMove(-1); }}><i className="fas fa-chevron-left"></i></button>
      <button type="button" className="lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); onMove(1); }}><i className="fas fa-chevron-right"></i></button>
      <span className="hd-lightbox-caption">{index + 1} / {images.length}{image.caption ? ` · ${image.caption}` : ''}</span>
    </div>
  );
}

function RoomCard({ room, onSelect }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = !photoFailed && room.photos?.[0];

  return (
    <div className="hd-room">
      <div className="hd-room-info">
        {photo ? (
          <img className="hd-room-photo" src={photo} alt={room.name} loading="lazy" onError={() => setPhotoFailed(true)} />
        ) : (
          <div className="hd-room-photo hotel-image-placeholder"><i className="fas fa-bed"></i></div>
        )}
        <h3>{room.name}</h3>
        <ul className="hd-room-facts">
          {room.sizeSqm ? <li><i className="fas fa-ruler-combined"></i> {room.sizeSqm} m²</li> : null}
          {room.bedTypes?.length ? <li><i className="fas fa-bed"></i> {room.bedTypes.join(', ')}</li> : null}
          {room.maxOccupancy ? <li><i className="fas fa-user-friends"></i> Sleeps up to {room.maxOccupancy}</li> : null}
          {room.views?.length ? <li><i className="fas fa-mountain"></i> {room.views.join(', ')}</li> : null}
          {room.amenities?.slice(0, 4).map(a => <li key={a}><i className="fas fa-check"></i> {a}</li>)}
        </ul>
      </div>

      <div className="hd-rates">
        {room.offers.map(rate => (
          <div className="hd-rate" key={rate.offerId}>
            <div>
              <h4>{rate.boardName || 'Room Only'}</h4>
              <div className="hotel-tags">
                {rate.refundable
                  ? <span className="hotel-tag success"><i className="fas fa-check"></i> Refundable</span>
                  : <span className="hotel-tag danger">Non-refundable</span>}
              </div>
              {rate.cancellationText && <p className="hd-rate-policy">{rate.cancellationText}</p>}
            </div>
            <div className="hd-rate-price">
              <strong>{formatMoney(rate.pricePerNight, rate.currency)}</strong>
              <small>per night</small>
              {rate.nights > 1 && <small>{formatMoney(rate.totalAmount, rate.currency)} for {rate.nights} nights</small>}
              {rate.payAtProperty?.length > 0 && (
                <small className="hotel-price-note warn">
                  + {formatMoney(rate.payAtProperty.reduce((sum, f) => sum + f.amount, 0), rate.currency)} payable at hotel
                </small>
              )}
              <button type="button" className="btn btn-primary hotel-select-btn" onClick={() => onSelect(room, rate)}>
                Select
              </button>
            </div>
          </div>
        ))}
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

  if (loading) {
    return (
      <div className="hotels-state">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading hotel details and live room rates…</p>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="hotels-state">
        <i className="fas fa-exclamation-circle"></i>
        <p>{error || 'Hotel not found.'}</p>
        <button type="button" className="btn btn-primary" onClick={load}>Try again</button>
      </div>
    );
  }

  const description = showFullDescription ? hotel.description : hotel.description.slice(0, DESCRIPTION_PREVIEW);
  const amenities = showAllAmenities ? hotel.facilities : hotel.facilities.slice(0, AMENITIES_PREVIEW);
  const hasStay = Boolean(details.stay);
  const lat = hotel.location?.latitude;
  const lng = hotel.location?.longitude;

  return (
    <>
      <nav className="hotels-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span>/</span>
        {hotel.city ? (
          <Link href={`/hotels/search?city=${encodeURIComponent(hotel.city)}&country=${hotel.countryCode || 'IN'}&${stayQuery(stay)}`}>Hotel Search</Link>
        ) : <span>Hotel Search</span>}
        <span>/</span> <span>{hotel.name}</span>
      </nav>

      <div className="hd-card">
        <div className="hd-header">
          <div>
            <Stars count={hotel.stars} />
            <h1>{hotel.name}</h1>
            <p><i className="fas fa-map-marker-alt"></i> {[hotel.address, hotel.city, hotel.zip].filter(Boolean).join(', ')}</p>
          </div>
          {hotel.rating ? (
            <div className="hotel-rating">
              <span className="hotel-rating-score">{Number(hotel.rating).toFixed(1)}</span>
              <span className="hotel-rating-text">
                Guest rating
                {hotel.reviewCount ? <small>{hotel.reviewCount.toLocaleString('en-IN')} reviews</small> : null}
              </span>
            </div>
          ) : null}
        </div>

        <div className="hd-top">
          <div className="hd-gallery">
            {images.slice(0, 3).map((image, i) => (
              <button type="button" key={image.url} onClick={() => setLightboxIndex(i)} aria-label={`Open photo ${i + 1}`}>
                <img src={image.url} alt={image.caption || `${hotel.name} photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
                {i === 2 && images.length > 3 && <span className="hd-gallery-more">+{images.length - 3}</span>}
              </button>
            ))}
            {images.length === 0 && <div className="hotel-image-placeholder"><i className="fas fa-hotel"></i></div>}
          </div>

          <aside className="hd-price-box">
            {details.fromPrice ? (
              <>
                <small>Starting from</small>
                <span className="hd-price">{formatMoney(details.fromPrice.pricePerNight, details.fromPrice.currency)}</span>
                <small>per night · {formatStayDate(details.stay.checkInDate)} – {formatStayDate(details.stay.checkOutDate)}</small>
                <small>{details.stay.rooms} Room{details.stay.rooms > 1 ? 's' : ''}, {details.stay.adults} Adult{details.stay.adults > 1 ? 's' : ''}</small>
                {details.supplierName && <span className="supplier-badge">via <strong>{details.supplierName}</strong></span>}
                <a href="#rooms" className="btn btn-primary">Select Room</a>
              </>
            ) : (
              <>
                <span className="hd-price">{hasStay ? 'Sold out' : 'Check availability'}</span>
                <small>{hasStay ? 'No rooms available for your dates.' : 'Choose your dates to see live room rates.'}</small>
                <Link href="/" className="btn btn-primary">Change search</Link>
              </>
            )}
          </aside>
        </div>
      </div>

      <div className="hd-card">
        <nav className="hd-tabs" aria-label="Hotel sections">
          <a href="#overview">Overview</a>
          <a href="#amenities">Amenities</a>
          <a href="#rooms">Rooms</a>
          {lat && lng ? <a href="#location">Location</a> : null}
          <a href="#policies">Policies</a>
        </nav>

        <section id="overview" className="hd-section hd-description">
          <h2>About {hotel.name}</h2>
          {description.length > 0 ? description.map((para, i) => <p key={i}>{para}</p>) : <p>No description available.</p>}
          {hotel.description.length > DESCRIPTION_PREVIEW && (
            <button type="button" className="link-btn" onClick={() => setShowFullDescription(v => !v)}>
              {showFullDescription ? 'Show less' : 'Read more'}
            </button>
          )}
        </section>

        {hotel.facilities.length > 0 && (
          <section id="amenities" className="hd-section">
            <h2>Amenities</h2>
            <ul className="hd-amenities">
              {amenities.map(item => <li key={item}><i className="fas fa-check-circle"></i> {item}</li>)}
            </ul>
            {hotel.facilities.length > AMENITIES_PREVIEW && (
              <button type="button" className="link-btn" onClick={() => setShowAllAmenities(v => !v)}>
                {showAllAmenities ? 'Show fewer amenities' : `Show all ${hotel.facilities.length} amenities`}
              </button>
            )}
          </section>
        )}

        <section id="rooms" className="hd-section">
          <h2>Select your Room</h2>
          {details.rooms.length > 0 ? (
            details.rooms.map(room => <RoomCard key={`${room.roomId}-${room.name}`} room={room} onSelect={selectRate} />)
          ) : (
            <div className="hotels-state">
              <i className="fas fa-bed"></i>
              <p>{hasStay ? 'No rooms are available for your dates. Try different dates.' : 'Search with dates to see available rooms.'}</p>
            </div>
          )}
        </section>

        {lat && lng ? (
          <section id="location" className="hd-section">
            <h2>Location</h2>
            <p>{[hotel.address, hotel.city].filter(Boolean).join(', ')}</p>
            <iframe
              className="hd-map"
              title={`Map of ${hotel.name}`}
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
            />
            <a className="link-btn" href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
              Open in Google Maps <i className="fas fa-external-link-alt"></i>
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
          <Suspense fallback={<div className="hotels-state"><p>Loading…</p></div>}>
            <HotelDetailsContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
