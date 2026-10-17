import { Suspense } from 'react';
import FlightSearchWidget from '../FlightSearchWidget/FlightSearchWidget';
import Icon from '../Icon/Icon';
import './Hero.css';

const TRUST = [
  { icon: 'shield-check', label: 'Secure payments via Razorpay' },
  { icon: 'check', label: 'Fares confirmed live before you pay' },
  { icon: 'headset', label: 'Real people, 24×7' }
];

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__media" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="hero__eyebrow sw-overline">Flights &amp; stays · priced in ₹</p>
          <h1 className="hero__title sw-display-2xl">
            Go further, pay <em className="sw-editorial">less.</em>
          </h1>
          <p className="hero__subtitle">
            Live fares and hotel rates from trusted suppliers — and we always show you who they are.
          </p>
        </div>

        {/* The widget reads ?tab= from the URL */}
        <Suspense fallback={<div className="hero__search-placeholder" />}>
          <FlightSearchWidget />
        </Suspense>

        <ul className="hero__trust">
          {TRUST.map(item => (
            <li key={item.label}>
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
