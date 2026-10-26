import Link from 'next/link';
import { Logo } from '../Icon/Icon';
import './Footer.css';

// Figma "Site Footer" — only routes that exist in the app
const COLUMNS = [
  {
    title: 'Book',
    links: [
      { name: 'Flights', href: '/' },
      { name: 'Hotels', href: '/?tab=hotels' },
      { name: 'My trips', href: '/my-bookings' },
      { name: 'Wishlist', href: '/wishlist' }
    ]
  },
  {
    title: 'Support',
    links: [
      { name: 'Help centre', href: '/contact' },
      { name: 'Manage booking', href: '/my-bookings' },
      { name: 'Cancellations & refunds', href: '/refund-policy' },
      { name: 'Contact us', href: '/contact' }
    ]
  },
  {
    title: 'For business',
    links: [
      { name: 'myBiz for companies', href: '/mybiz' },
      { name: 'List your property', href: '/list-property' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms of service', href: '/terms-and-conditions' },
      { name: 'Privacy policy', href: '/privacy-policy' },
      { name: 'Refund policy', href: '/refund-policy' }
    ]
  }
];

const SOCIAL = [
  { label: 'Instagram', icon: 'fa-instagram', href: 'https://instagram.com' },
  { label: 'X', icon: 'fa-x-twitter', href: 'https://twitter.com' },
  { label: 'LinkedIn', icon: 'fa-linkedin-in', href: 'https://linkedin.com' },
  { label: 'YouTube', icon: 'fa-youtube', href: 'https://youtube.com' }
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo inverse />
            <p className="footer-tagline">Flights and stays from trusted suppliers, priced honestly in rupees.</p>
            <div className="footer-social">
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="footer-social__link" aria-label={s.label}>
                  <i className={`fab ${s.icon}`} aria-hidden="true"></i>
                </a>
              ))}
            </div>
          </div>

          <div className="footer-columns">
            {COLUMNS.map(col => (
              <div key={col.title} className="footer-col">
                <h4 className="footer-col__title">{col.title}</h4>
                <ul>
                  {col.links.map(link => (
                    <li key={link.name}><Link href={link.href} className="footer-link">{link.name}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {currentYear} SkyWings Travel · Prices in INR, inclusive of taxes unless stated</p>
          <p className="footer-pay">Secure payments by Razorpay · UPI · Visa · Mastercard · RuPay</p>
        </div>
      </div>
    </footer>
  );
}
