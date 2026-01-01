import './PopularDestinations.css';

export default function PopularDestinations() {
  const destinations = [
    {
      city: 'Dubai',
      country: 'United Arab Emirates',
      image: '/destinations/dubai.jpg',
      price: 'from ₹25,999',
    },
    {
      city: 'Singapore',
      country: 'Singapore',
      image: '/destinations/singapore.jpg',
      price: 'from ₹18,500',
    },
    {
      city: 'Bangkok',
      country: 'Thailand',
      image: '/destinations/bangkok.jpg',
      price: 'from ₹12,000',
    },
    {
      city: 'London',
      country: 'United Kingdom',
      image: '/destinations/london.jpg',
      price: 'from ₹45,000',
    },
  ];

  return (
    <section className="popular-destinations">
      <div className="container">
        <div className="section-header">
          <h2>Popular Destinations</h2>
          <p>Explore the world's most amazing places</p>
        </div>

        <div className="destinations-grid">
          {destinations.map((dest, index) => (
            <div key={index} className="destination-card">
              <div className="destination-image">
                <div className="destination-image-placeholder">
                  <span>{dest.city}</span>
                </div>
              </div>
              <div className="destination-info">
                <h3>{dest.city}</h3>
                <p>{dest.country}</p>
                <div className="destination-price">{dest.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
