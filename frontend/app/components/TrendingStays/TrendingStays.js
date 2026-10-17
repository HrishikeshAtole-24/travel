'use client';

import { useRouter } from 'next/navigation';
import Icon from '../Icon/Icon';
import './TrendingStays.css';

// Figma "Stay Tile" — city stays that open a live hotel search
const CITIES = [
  { city: 'Goa', note: 'Beach resorts & villas', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&h=1000&fit=crop' },
  { city: 'Mumbai', note: 'Sea-facing city hotels', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=1000&fit=crop' },
  { city: 'New Delhi', note: 'Heritage & business stays', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=1000&fit=crop' },
  { city: 'Bengaluru', note: 'Close to tech parks', image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&h=1000&fit=crop' }
];

const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TrendingStays() {
  const router = useRouter();

  // A two-night weekend-style stay, two weeks out
  const openCity = (city) => {
    const checkin = new Date();
    checkin.setDate(checkin.getDate() + 14);
    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + 2);
    const params = new URLSearchParams({
      city,
      country: 'IN',
      checkin: toIso(checkin),
      checkout: toIso(checkout),
      rooms: '1',
      adults: '2'
    });
    router.push(`/hotels/search?${params.toString()}`);
  };

  return (
    <section className="sw-section sw-section--surface">
      <div className="container">
        <div className="sw-section__head">
          <div>
            <h2 className="sw-section__title">Stays travellers love</h2>
            <p className="sw-section__sub">Live rates from Nuitée, with free-cancellation options in every city.</p>
          </div>
        </div>

        <div className="stay-grid">
          {CITIES.map(item => (
            <button key={item.city} type="button" className="stay-tile" onClick={() => openCity(item.city)}>
              <span className="stay-tile__photo" style={{ backgroundImage: `url(${item.image})` }} />
              <span className="stay-tile__shade" />
              <span className="stay-tile__body">
                <span className="stay-tile__city">{item.city}</span>
                <span className="stay-tile__note">{item.note}</span>
                <span className="stay-tile__cta"><Icon name="hotel" size={16} /> Browse hotels</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
