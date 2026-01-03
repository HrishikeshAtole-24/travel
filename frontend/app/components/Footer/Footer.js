import Link from 'next/link';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = {
    skywings: {
      title: 'SKYWINGS',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Investor Relations', href: '/investors' },
        { name: 'Careers', href: '/careers' },
        { name: 'Sustainability', href: '/sustainability' },
        { name: 'Legal Notices', href: '/legal' },
        { name: 'Travel Agent Portal', href: '/partners' },
        { name: 'List Your Hotel', href: '/list-hotel' },
        { name: 'Advertise with Us', href: '/advertise' }
      ]
    },
    aboutSite: {
      title: 'ABOUT THE SITE',
      links: [
        { name: 'Customer Support', href: '/support' },
        { name: 'Loyalty Program', href: '/loyalty' },
        { name: 'Payment Security', href: '/payment-security' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'User Agreement', href: '/user-agreement' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Refund Policy', href: '/refund' },
        { name: 'Escalation Channel', href: '/escalation' }
      ]
    },
    productOffering: {
      title: 'PRODUCT OFFERING',
      links: [
        { name: 'Flights', href: '/search' },
        { name: 'International Flights', href: '/search?type=international' },
        { name: 'Hotels', href: '/hotels' },
        { name: 'International Hotels', href: '/hotels?type=international' },
        { name: 'Homestays and Villas', href: '/homestays' },
        { name: 'Holiday Packages', href: '/holidays' },
        { name: 'International Holidays', href: '/holidays?type=international' },
        { name: 'Corporate Travel', href: '/corporate' },
        { name: 'Trip Planner', href: '/planner' },
        { name: 'Travel Insurance', href: '/insurance' },
        { name: 'Gift Cards', href: '/gift-cards' },
        { name: 'Travel Blog', href: '/blog' }
      ]
    },
    quickLinks: {
      title: 'QUICK LINKS',
      links: [
        { name: 'Flight Discount Coupons', href: '/coupons' },
        { name: 'Domestic Airlines', href: '/airlines/domestic' },
        { name: 'Indigo Airlines', href: '/airlines/indigo' },
        { name: 'Air India', href: '/airlines/air-india' },
        { name: 'SpiceJet', href: '/airlines/spicejet' },
        { name: 'Air Asia', href: '/airlines/air-asia' },
        { name: 'New Delhi Mumbai Flights', href: '/search?from=DEL&to=BOM' },
        { name: 'Delhi Chennai Flights', href: '/search?from=DEL&to=MAA' },
        { name: 'Mumbai Bangalore Flights', href: '/search?from=BOM&to=BLR' },
        { name: 'Delhi Goa Flights', href: '/search?from=DEL&to=GOI' }
      ]
    },
    visaOfferings: {
      title: 'VISA OFFERINGS',
      links: [
        { name: 'Australia Visa', href: '/visa/australia' },
        { name: 'Dubai - UAE Visa', href: '/visa/uae' },
        { name: 'Singapore Visa', href: '/visa/singapore' },
        { name: 'Thailand Visa', href: '/visa/thailand' },
        { name: 'Malaysia Visa', href: '/visa/malaysia' },
        { name: 'UK Visa', href: '/visa/uk' },
        { name: 'USA Visa', href: '/visa/usa' },
        { name: 'Schengen Visa', href: '/visa/schengen' },
        { name: 'Japan Visa', href: '/visa/japan' },
        { name: 'Indonesia Visa', href: '/visa/indonesia' }
      ]
    },
    importantLinks: {
      title: 'IMPORTANT LINKS',
      links: [
        { name: 'Cheap Flights', href: '/search?sort=price' },
        { name: 'Flight Status', href: '/flight-status' },
        { name: 'Domestic Airlines', href: '/airlines/domestic' },
        { name: 'International Airlines', href: '/airlines/international' },
        { name: 'Honeymoon Destinations', href: '/destinations/honeymoon' },
        { name: 'Popular Destinations', href: '/destinations/popular' },
        { name: 'Beach Destinations', href: '/destinations/beach' },
        { name: 'Domestic Flight Offers', href: '/offers/domestic' },
        { name: 'International Flight Offers', href: '/offers/international' },
        { name: 'Weekend Getaways', href: '/destinations/weekend' }
      ]
    },
    corporateTravel: {
      title: 'CORPORATE TRAVEL',
      links: [
        { name: 'Business Travel', href: '/corporate/business' },
        { name: 'Corporate Travel Management', href: '/corporate/management' },
        { name: 'Corporate Hotel Booking', href: '/corporate/hotels' },
        { name: 'Corporate Flight Booking', href: '/corporate/flights' },
        { name: 'Expense Management', href: '/corporate/expenses' },
        { name: 'GST on Flight Tickets', href: '/corporate/gst-flights' },
        { name: 'GST Invoice', href: '/corporate/gst-invoice' },
        { name: 'Travel & Expense', href: '/corporate/travel-expense' }
      ]
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        {/* Main Footer Links */}
        <div className="footer-links-grid">
          {Object.values(footerSections).map((section, index) => (
            <div key={index} className="footer-link-section">
              <h4 className="footer-section-title">{section.title}</h4>
              <div className="footer-link-list">
                {section.links.map((link, linkIndex) => (
                  <Link key={linkIndex} href={link.href} className="footer-link">
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* App Download Section */}
        <div className="app-download-section">
          <div className="app-download-content">
            <div className="app-icon">✈️</div>
            <div className="app-info">
              <h3>Download App Now!</h3>
              <p>Use code <strong>WELCOMESKY</strong> and get <strong>FLAT 12% OFF*</strong> on your first domestic flight booking</p>
            </div>
          </div>
          <div className="app-buttons">
            <button className="app-store-btn">
              <span className="store-icon">▶</span>
              <span className="store-text">
                <small>GET IT ON</small>
                <strong>Google Play</strong>
              </span>
            </button>
            <button className="app-store-btn">
              <span className="store-icon">🍎</span>
              <span className="store-text">
                <small>Download on the</small>
                <strong>App Store</strong>
              </span>
            </button>
          </div>
        </div>

        {/* Social Links */}
        <div className="social-section">
          <div className="social-links">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p>&copy; {currentYear} SkyWings. All rights reserved.</p>
          <p className="footer-disclaimer">
            SkyWings is your trusted travel partner for booking flights worldwide. We are committed to making travel simple, affordable, and accessible for everyone.
          </p>
        </div>
      </div>
    </footer>
  );
}
