import Link from 'next/link';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import Icon from '../Icon/Icon';
import './ComingSoon.css';

/**
 * Honest placeholder for products that aren't live yet.
 * <ComingSoon icon="heart" eyebrow="Wishlist" title="…" text="…" points={[…]} />
 */
export default function ComingSoon({ icon, eyebrow, title, text, points = [], children }) {
  return (
    <>
      <Header />
      <main className="cs-page">
        <section className="cs-hero">
          <div className="container cs-hero__inner">
            <span className="cs-icon"><Icon name={icon} size={28} /></span>
            <p className="sw-overline cs-eyebrow">{eyebrow} · Coming soon</p>
            <h1 className="cs-title">{title}</h1>
            <p className="cs-text">{text}</p>
            <div className="cs-actions">
              <Link href="/contact" className="btn btn-accent btn-lg">Talk to us</Link>
              <Link href="/" className="btn btn-secondary btn-lg cs-btn-light">Back to search</Link>
            </div>
          </div>
        </section>

        {points.length > 0 && (
          <section className="container cs-points">
            {points.map(p => (
              <div key={p.title} className="cs-point">
                <Icon name={p.icon} size={20} />
                <strong>{p.title}</strong>
                <p>{p.text}</p>
              </div>
            ))}
          </section>
        )}
        {children}
      </main>
      <Footer />
    </>
  );
}
