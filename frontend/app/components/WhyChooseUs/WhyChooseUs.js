import './WhyChooseUs.css';

export default function WhyChooseUs() {
  const features = [
    {
      icon: '💰',
      title: 'Best Price Guarantee',
      description: 'Find the lowest prices or get refunded the difference'
    },
    {
      icon: '🌟',
      title: 'Easy Booking',
      description: 'Book flights in just a few clicks with our simple interface'
    },
    {
      icon: '🔒',
      title: 'Secure Payment',
      description: 'Your data is protected with industry-leading security'
    },
    {
      icon: '🎧',
      title: '24/7 Support',
      description: 'Get help anytime, anywhere with our dedicated support team'
    }
  ];

  return (
    <section className="why-choose-us">
      <div className="container">
        <div className="section-header">
          <h2>Why Choose SkyWings?</h2>
          <p>Your trusted partner for hassle-free travel</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
