'use client';

import Link from 'next/link';
import './AdBanner.css';

export default function AdBanner() {
  // This can be easily changed or fetched from API/CMS later
  const adData = {
    image: '/images/icici_lombard.png',
    link: 'https://www.icicilombard.com/travel-insurance?utm_source=MMT&utm_medium=CPM&utm_campaign=Travel_MMT_Banner&open=browser',
    alt: 'ICICI Lombard Travel Insurance',
    isActive: true
  };

  // Don't render if ad is not active
  if (!adData.isActive) return null;

  return (
    <section className="ad-banner">
      <div className="container">
        <Link 
          href={adData.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="ad-banner-link"
        >
          <div className="ad-banner-content">
            <img 
              src={adData.image} 
              alt={adData.alt}
              className="ad-banner-image"
            />
            <div className="ad-label">Ad</div>
          </div>
        </Link>
      </div>
    </section>
  );
}
