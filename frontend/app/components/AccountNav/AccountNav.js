import Link from 'next/link';
import Icon from '../Icon/Icon';
import './AccountNav.css';

const ITEMS = [
  { id: 'trips', href: '/my-bookings', label: 'My trips', icon: 'ticket' },
  { id: 'wishlist', href: '/wishlist', label: 'Wishlist', icon: 'heart' },
  { id: 'profile', href: '/profile', label: 'Profile', icon: 'user' },
  { id: 'support', href: '/contact', label: 'Help & support', icon: 'headset' }
];

/** Left rail on account pages (Profile, Wishlist) */
export default function AccountNav({ active }) {
  return (
    <nav className="acct-nav" aria-label="Account">
      {ITEMS.map(item => (
        <Link key={item.id} href={item.href} className={`acct-nav__item ${active === item.id ? 'active' : ''}`} aria-current={active === item.id ? 'page' : undefined}>
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
