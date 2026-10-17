'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../Icon/Icon';
import './PopularDestinations.css';

// Figma "Route Card" — photo, route, trip length; opens a live fare search
const ROUTES = {
  domestic: [
    { from: 'BOM', fromCity: 'Mumbai', to: 'DEL', toCity: 'New Delhi', days: 2, image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&h=440&fit=crop' },
    { from: 'DEL', fromCity: 'Delhi', to: 'GOI', toCity: 'Goa', days: 4, image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&h=440&fit=crop' },
    { from: 'BOM', fromCity: 'Mumbai', to: 'BLR', toCity: 'Bengaluru', days: 3, image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=600&h=440&fit=crop' },
    { from: 'DEL', fromCity: 'Delhi', to: 'MAA', toCity: 'Chennai', days: 3, image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&h=440&fit=crop' }
  ],
  international: [
    { from: 'BOM', fromCity: 'Mumbai', to: 'DXB', toCity: 'Dubai', days: 5, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=440&fit=crop' },
    { from: 'DEL', fromCity: 'Delhi', to: 'BKK', toCity: 'Bangkok', days: 6, image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&h=440&fit=crop' },
    { from: 'BOM', fromCity: 'Mumbai', to: 'SIN', toCity: 'Singapore', days: 5, image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&h=440&fit=crop' },
    { from: 'DEL', fromCity: 'Delhi', to: 'LHR', toCity: 'London', days: 10, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=440&fit=crop' }
  ]
};

const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function PopularDestinations() {
  const router = useRouter();
  const [region, setRegion] = useState('domestic');

  // Dates are picked at click time: two weeks out, for the route's typical stay
  const openRoute = (route) => {
    const depart = new Date();
    depart.setDate(depart.getDate() + 14);
    const ret = new Date(depart);
    ret.setDate(ret.getDate() + route.days);
    const params = new URLSearchParams({
      from: route.from,
      to: route.to,
      departDate: toIso(depart),
      returnDate: toIso(ret),
      passengers: 1,
      cabinClass: 'economy',
      tripType: 'roundtrip'
    });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section className="sw-section">
      <div className="container">
        <div className="sw-section__head">
          <div>
            <h2 className="sw-section__title">Popular routes</h2>
            <p className="sw-section__sub">Round trips two weeks out — tap to see live fares.</p>
          </div>
          <div className="sw-segment" role="group" aria-label="Region">
            {[['domestic', 'Within India'], ['international', 'International']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={region === id} onClick={() => setRegion(id)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="route-grid">
          {ROUTES[region].map(route => (
            <button key={`${route.from}-${route.to}`} type="button" className="route-card" onClick={() => openRoute(route)}>
              <span className="route-card__photo" style={{ backgroundImage: `url(${route.image})` }} />
              <span className="route-card__body">
                <span className="route-card__route">
                  <span>{route.fromCity}</span>
                  <Icon name="arrow-right" size={16} />
                  <span>{route.toCity}</span>
                </span>
                <span className="route-card__meta">{route.from} – {route.to} · Round trip · {route.days} nights</span>
                <span className="route-card__cta">See fares <Icon name="chevron-right" size={16} /></span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
