import Link from 'next/link';
import './PopularFlights.css';

export default function PopularFlights() {
  const popularRoutes = [
    {
      city: 'Chennai',
      image: '🏛️',
      routes: ['Delhi', 'Mumbai', 'Coimbatore', 'Madurai']
    },
    {
      city: 'Goa',
      image: '🏖️',
      routes: ['Delhi', 'Mumbai', 'Bangalore', 'Ahmedabad']
    },
    {
      city: 'Mumbai',
      image: '🌆',
      routes: ['Delhi', 'Bangalore', 'Chennai', 'Ahmedabad']
    },
    {
      city: 'Hyderabad',
      image: '🕌',
      routes: ['Chennai', 'Mumbai', 'Bangalore', 'Delhi']
    },
    {
      city: 'Delhi',
      image: '🏰',
      routes: ['Mumbai', 'Pune', 'Bangalore', 'Chennai']
    },
    {
      city: 'Pune',
      image: '🌳',
      routes: ['Delhi', 'Bangalore', 'Chennai', 'Ahmedabad']
    },
    {
      city: 'Kolkata',
      image: '🌉',
      routes: ['Delhi', 'Mumbai', 'Bangalore', 'Pune']
    },
    {
      city: 'Bangalore',
      image: '🏢',
      routes: ['Delhi', 'Pune', 'Mumbai', 'Kolkata']
    },
    {
      city: 'Jaipur',
      image: '🏰',
      routes: ['Mumbai', 'Delhi', 'Pune', 'Bangalore']
    }
  ];

  return (
    <section className="popular-flights">
      <div className="container">
        <div className="section-header">
          <h2>Popular Flight Routes</h2>
          <p>Find the best deals on top domestic routes</p>
        </div>

        <div className="flights-grid">
          {popularRoutes.map((route, index) => (
            <Link 
              href={`/search?to=${route.city}`} 
              key={index} 
              className="flight-route-card"
            >
              <div className="route-icon">{route.image}</div>
              <div className="route-info">
                <h3>{route.city} Flights</h3>
                <p>Via - {route.routes.join(', ')}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
