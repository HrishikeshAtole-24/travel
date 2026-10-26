import Link from 'next/link';
import Icon, { Logo } from '../components/Icon/Icon';

// Ink photo panel beside the auth forms — only promises the product keeps
const POINTS = [
  { icon: 'ticket', title: 'Every trip in one place', text: 'E-tickets, vouchers, PNRs and refunds under My trips.' },
  { icon: 'tag', title: 'Suppliers shown upfront', text: 'Each fare and room says who it comes from.' },
  { icon: 'shield-check', title: 'Secure checkout', text: 'Payments run on Razorpay — we never store card details.' }
];

export default function AuthPromo({ mode = 'login' }) {
  return (
    <div className="auth-promo-side">
      <div className="promo-content">
        <Link href="/" aria-label="SkyWings home"><Logo inverse /></Link>
        <h2 className="promo-title">
          {mode === 'login' ? <>Welcome <em className="sw-editorial">back.</em></> : <>Travel, <em className="sw-editorial">sorted.</em></>}
        </h2>
        <p className="promo-subtitle">
          {mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create a free account in under a minute.'}
        </p>
        <ul className="promo-points">
          {POINTS.map(p => (
            <li key={p.title}>
              <span className="promo-points__icon"><Icon name={p.icon} size={18} /></span>
              <span><strong>{p.title}</strong><small>{p.text}</small></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
