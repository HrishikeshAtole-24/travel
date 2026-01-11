'use client';

import { useState } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import './contact.css';

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoading(false);
    setSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  const contactInfo = [
    {
      icon: 'fas fa-phone-alt',
      title: 'Call Us',
      content: '+91 1800-123-4567',
      subtext: 'Mon-Sun, 24/7 Support',
      action: 'tel:+911800123456'
    },
    {
      icon: 'fas fa-envelope',
      title: 'Email Us',
      content: 'support@skywings.com',
      subtext: 'We reply within 24 hours',
      action: 'mailto:support@skywings.com'
    },
    {
      icon: 'fas fa-map-marker-alt',
      title: 'Visit Us',
      content: 'Cyber Hub, Gurugram',
      subtext: 'Haryana, India 122002',
      action: '#'
    },
    {
      icon: 'fas fa-comments',
      title: 'Live Chat',
      content: 'Chat with our team',
      subtext: 'Available 24/7',
      action: '#'
    }
  ];

  const faqItems = [
    {
      question: 'How can I cancel or modify my booking?',
      answer: 'You can cancel or modify your booking through the "My Bookings" section. Cancellation charges may apply based on the airline policy.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, UPI, net banking, and popular wallets like Paytm, PhonePe, and Google Pay.'
    },
    {
      question: 'How do I get my refund?',
      answer: 'Refunds are processed within 7-10 business days to your original payment method after cancellation approval.'
    },
    {
      question: 'Is my payment information secure?',
      answer: 'Yes, we use industry-standard SSL encryption and are PCI DSS compliant to ensure your payment data is always secure.'
    }
  ];

  return (
    <>
      <Header />
      <main className="contact-page">
        {/* Hero Section */}
        <section className="contact-hero">
          <div className="contact-hero-overlay"></div>
          <div className="contact-hero-content">
            <h1>Get in Touch</h1>
            <p>We're here to help you plan your perfect journey</p>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="contact-cards-section">
          <div className="container">
            <div className="contact-cards-grid">
              {contactInfo.map((info, index) => (
                <a href={info.action} key={index} className="contact-card">
                  <div className="contact-card-icon">
                    <i className={info.icon}></i>
                  </div>
                  <h3>{info.title}</h3>
                  <p className="contact-card-content">{info.content}</p>
                  <span className="contact-card-subtext">{info.subtext}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Main Contact Section */}
        <section className="contact-main-section">
          <div className="container">
            <div className="contact-grid">
              {/* Contact Form */}
              <div className="contact-form-wrapper">
                <div className="contact-form-header">
                  <h2>Send us a Message</h2>
                  <p>Fill out the form below and we'll get back to you as soon as possible.</p>
                </div>

                {submitted ? (
                  <div className="success-message">
                    <div className="success-icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <h3>Message Sent Successfully!</h3>
                    <p>Thank you for reaching out. Our team will contact you within 24 hours.</p>
                    <button 
                      className="send-another-btn"
                      onClick={() => setSubmitted(false)}
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="contact-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="name">
                          <i className="fas fa-user"></i>
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">
                          <i className="fas fa-envelope"></i>
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="phone">
                          <i className="fas fa-phone"></i>
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="subject">
                          <i className="fas fa-tag"></i>
                          Subject
                        </label>
                        <select
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select a topic</option>
                          <option value="booking">Booking Inquiry</option>
                          <option value="refund">Refund Request</option>
                          <option value="cancellation">Cancellation</option>
                          <option value="complaint">Complaint</option>
                          <option value="feedback">Feedback</option>
                          <option value="partnership">Partnership</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="message">
                        <i className="fas fa-comment-alt"></i>
                        Your Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows="5"
                        placeholder="Tell us how we can help you..."
                      ></textarea>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* FAQ Section */}
              <div className="contact-faq-wrapper">
                <div className="faq-header">
                  <h2>Frequently Asked Questions</h2>
                  <p>Quick answers to common queries</p>
                </div>

                <div className="faq-list">
                  {faqItems.map((item, index) => (
                    <details key={index} className="faq-item">
                      <summary className="faq-question">
                        <span>{item.question}</span>
                        <i className="fas fa-chevron-down"></i>
                      </summary>
                      <div className="faq-answer">
                        <p>{item.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>

                <div className="need-more-help">
                  <div className="help-icon">
                    <i className="fas fa-headset"></i>
                  </div>
                  <div className="help-content">
                    <h3>Need More Help?</h3>
                    <p>Our support team is available 24/7</p>
                    <a href="tel:+911800123456" className="call-btn">
                      <i className="fas fa-phone-alt"></i>
                      Call Now
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="contact-map-section">
          <div className="container">
            <div className="map-wrapper">
              <div className="map-info">
                <h3>Our Office</h3>
                <p><i className="fas fa-building"></i> SkyWings Travel Pvt. Ltd.</p>
                <p><i className="fas fa-map-marker-alt"></i> Tower A, Cyber Hub, DLF Phase 2</p>
                <p><i className="fas fa-city"></i> Gurugram, Haryana 122002</p>
                <p><i className="fas fa-clock"></i> Mon - Sat: 9:00 AM - 8:00 PM</p>
                <div className="social-links">
                  <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                  <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                  <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                  <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                </div>
              </div>
              <div className="map-embed">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3507.2986154882373!2d77.08798731507937!3d28.459497082490867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d18ed12a8ceb5%3A0x6e34e4b9a6a9c5d2!2sCyber%20Hub!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="SkyWings Office Location"
                ></iframe>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default ContactPage;