'use client';

import Link from 'next/link';
import './AirlinePartners.css';

export default function AirlinePartners() {
  const airlines = [
    {
      name: 'Akasa Air',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Akasa_Air_logo_with_slogan.png',
      link: 'https://www.akasaair.com/',
      gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
    },
    {
      name: 'Air India',
      logo: 'https://thehardcopy.co/wp-content/uploads/Air-India-Logo-1200x522.jpg',
      link: 'https://www.airindia.com/',
      gradient: 'linear-gradient(135deg, #E31837 0%, #C41230 100%)'
    },
    {
      name: 'Lufthansa',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Lufthansa_Logo_2018.svg/1280px-Lufthansa_Logo_2018.svg.png',
      link: 'https://www.lufthansa.com/',
      gradient: 'linear-gradient(135deg, #05164D 0%, #0A2472 100%)'
    }
  ];

  return (
    <section className="airline-partners">
      <div className="container">
        <div className="airline-partners-header">
          <h2 className="section-title">Experience Flying with our Airline Partners</h2>
        </div>
        <div className="airline-partners-grid">
          {airlines.map((airline, index) => (
            <Link 
              href={airline.link} 
              key={index} 
              target="_blank"
              rel="noopener noreferrer"
              className="airline-card"
              style={{ background: airline.gradient }}
            >
              <div className="airline-card-content">
                <div className="airline-logo-wrapper">
                  <img 
                    src={airline.logo} 
                    alt={airline.name}
                    className="airline-logo"
                  />
                </div>
                <h3 className="airline-name">{airline.name}</h3>
              </div>
              <div className="airline-card-shine"></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
