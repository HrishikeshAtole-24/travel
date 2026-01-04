import './WhyChooseUs.css';

export default function WhyChooseUs() {
  const features = [
    {
      icon: 'fa-indian-rupee-sign',
      title: 'Best Price Guarantee',
      description: 'We guarantee the lowest fares. Found a lower price? We\'ll refund the difference.',
    },
    {
      icon: 'fa-clock',
      title: 'Quick & Easy Booking',
      description: 'Complete your booking in under 2 minutes with our streamlined process.',
    },
    {
      icon: 'fa-lock',
      title: 'Secure Payments',
      description: 'Your transactions are protected with bank-grade 256-bit SSL encryption.',
    },
    {
      icon: 'fa-phone',
      title: '24/7 Customer Support',
      description: 'Our dedicated team is available round the clock to assist you.',
    }
  ];

  const stats = [
    { number: '10M+', label: 'Bookings Completed' },
    { number: '500+', label: 'Partner Airlines' },
    { number: '98%', label: 'Customer Satisfaction' },
    { number: '24/7', label: 'Support Available' }
  ];

  return (
    <section className="why-choose-section">
      <div className="container">
        {/* Header */}
        <div className="why-header">
          <h2>Why Book With SkyWings?</h2>
          <p>Trusted by millions of travelers for reliable flight bookings</p>
        </div>

        {/* Features */}
        <div className="why-features">
          {features.map((feature, index) => (
            <div key={index} className="why-feature">
              <div className="why-feature-icon">
                <i className={`fas ${feature.icon}`}></i>
              </div>
              <div className="why-feature-content">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="why-stats">
          {stats.map((stat, index) => (
            <div key={index} className="why-stat">
              <span className="why-stat-number">{stat.number}</span>
              <span className="why-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="trust-indicators">
          <div className="trust-item">
            <i className="fas fa-shield-halved"></i>
            <span>Secure Checkout</span>
          </div>
          <div className="trust-item">
            <i className="fas fa-certificate"></i>
            <span>IATA Accredited</span>
          </div>
          <div className="trust-item">
            <i className="fas fa-credit-card"></i>
            <span>All Major Cards Accepted</span>
          </div>
          <div className="trust-item">
            <i className="fas fa-rotate-left"></i>
            <span>Easy Cancellation</span>
          </div>
        </div>
      </div>
    </section>
  );
}
