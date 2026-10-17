import Link from 'next/link';
import Icon from '../Icon/Icon';
import './WhyChooseUs.css';

// Only promises the product actually keeps
const FEATURES = [
  {
    icon: 'tag',
    title: 'See who you’re buying from',
    description: 'Every fare and room shows its supplier — Duffel, Nuitée and more — so there are no mystery resellers.'
  },
  {
    icon: 'check',
    title: 'Prices checked before you pay',
    description: 'We re-confirm the fare or room rate with the supplier right before payment, so the total doesn’t move.'
  },
  {
    icon: 'shield-check',
    title: 'Secure payments',
    description: 'Pay by UPI, cards or net banking through Razorpay. We never store your card details.'
  },
  {
    icon: 'headset',
    title: 'Help when plans change',
    description: 'Manage, cancel and track refunds from My trips, or reach our support team any time.'
  }
];

export default function WhyChooseUs() {
  return (
    <section className="sw-section">
      <div className="container">
        <div className="sw-section__head">
          <div>
            <h2 className="sw-section__title">Booking, without the fine print</h2>
            <p className="sw-section__sub">What you get every time you book with SkyWings.</p>
          </div>
        </div>

        <div className="why-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="why-card">
              <span className="why-card__icon"><Icon name={f.icon} size={22} /></span>
              <h3 className="why-card__title">{f.title}</h3>
              <p className="why-card__text">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="why-banner">
          <div>
            <p className="sw-overline why-banner__eyebrow">Your trips, in one place</p>
            <h3 className="why-banner__title">Sign in to keep every booking, voucher and refund together.</h3>
          </div>
          <Link href="/auth/signup" className="btn btn-accent btn-lg">Create free account</Link>
        </div>
      </div>
    </section>
  );
}
