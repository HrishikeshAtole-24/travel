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
        { name: 'Customer Support', href: '/contact' },
        { name: 'Loyalty Program', href: '/loyalty' },
        { name: 'Payment Security', href: '/payment-security' },
        { name: 'Privacy Policy', href: '/privacy-policy' },
        { name: 'Cookie Policy', href: '/privacy-policy' },
        { name: 'User Agreement', href: '/terms-and-conditions' },
        { name: 'Terms of Service', href: '/terms-and-conditions' },
        { name: 'Refund Policy', href: '/refund-policy' },
        { name: 'Escalation Channel', href: '/contact' }
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
            <div className="app-icon-wrapper">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <div className="app-info">
              <h3>Download the SkyWings App</h3>
              <p>Get exclusive app-only deals & manage bookings on the go</p>
              <div className="app-offer-badge">
                <i className="fas fa-gift"></i>
                <span>Use code <strong>WELCOMESKY</strong> for <strong>FLAT 12% OFF</strong></span>
              </div>
            </div>
          </div>
          <div className="app-buttons">
            <a href="#" className="app-store-btn google-play">
              <i className="fab fa-google-play"></i>
              <span className="store-text">
                <small>GET IT ON</small>
                <strong>Google Play</strong>
              </span>
            </a>
            <a href="#" className="app-store-btn apple-store">
              <i className="fab fa-apple"></i>
              <span className="store-text">
                <small>Download on the</small>
                <strong>App Store</strong>
              </span>
            </a>
          </div>
        </div>

        {/* Social Links */}
        <div className="social-section">
          <div className="social-links">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Twitter">
              <i className="fab fa-x-twitter"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="YouTube">
              <i className="fab fa-youtube"></i>
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
