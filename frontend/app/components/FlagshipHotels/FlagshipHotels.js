'use client';

import Link from 'next/link';
import './FlagshipHotels.css';

export default function FlagshipHotels() {
  const hotels = [
    {
      name: 'Hyatt Hotels',
      image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/23/b0/d9/67/exterior.jpg?w=900&h=500&s=1',
      link: 'https://www.hyatt.com/loyalty/',
      bgColor: '#1a1a2e'
    },
    {
      name: 'Marriott Hotels',
      image: 'https://www.portlandtangofest.com/wp-content/uploads/2022/03/Picture_marriott.jpg',
      link: 'https://www.marriott.com/',
      bgColor: '#8B0000'
    },
    {
      name: 'Taj Hotels',
      image: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/713031969.jpg?k=35bce585ebe5cff87dca1db2ec83ad536e258322179ecb3311551734bde042f3&o=',
      link: 'https://www.tajhotels.com/',
      bgColor: '#1e3a5f'
    },
    {
      name: 'ITC Hotels',
      image: 'https://s7ap1.scene7.com/is/image/itcportalprod/Hero_Banner_Hotels_ITC_Kohenoor?fmt=webp-alpha',
      link: 'https://www.itchotels.com/',
      bgColor: '#c19b59'
    }
  ];

  return (
    <section className="flagship-hotels">
      <div className="container">
        <div className="flagship-hotels-header">
          <h2 className="section-title">Flagship Hotel Stores on SkyWings</h2>
        </div>
        <div className="flagship-hotels-grid">
          {hotels.map((hotel, index) => (
            <Link 
              href={hotel.link} 
              key={index} 
              target="_blank"
              rel="noopener noreferrer"
              className="hotel-card"
            >
              <div className="hotel-card-image-wrapper">
                <img 
                  src={hotel.image} 
                  alt={hotel.name}
                  className="hotel-card-image"
                />
                <div className="hotel-card-overlay"></div>
              </div>
              <div className="hotel-card-content">
                <h3 className="hotel-card-title">{hotel.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
