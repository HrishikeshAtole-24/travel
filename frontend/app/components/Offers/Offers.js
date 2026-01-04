'use client';

import { useState } from 'react';
import Link from 'next/link';
import './Offers.css';

export default function Offers() {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All Offers' },
    { id: 'flights', label: 'Flights' },
    { id: 'hotels', label: 'Hotels' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'trains', label: 'Trains' },
    { id: 'visa', label: 'Visa' },
    { id: 'cabs', label: 'Cabs' },
    { id: 'bank', label: 'Bank Offers' }
  ];

  const offers = [
    {
      id: 1,
      category: 'flights',
      tag: 'INTL FLIGHTS',
      title: 'Fly International at Up to 20% OFF*',
      description: 'On international flights to Dubai, Singapore, Bangkok & more.',
      cta: 'BOOK NOW',
      code: 'SKYFLY20',
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=300&h=200&fit=crop',
      bank: null
    },
    {
      id: 2,
      category: 'flights',
      tag: 'DOM FLIGHTS',
      title: 'Domestic Flights Starting ₹1,499*',
      description: 'Book domestic flights at lowest fares. Limited period offer.',
      cta: 'VIEW DETAILS',
      code: 'SKYDOM',
      image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=300&h=200&fit=crop',
      bank: null
    },
    {
      id: 3,
      category: 'bank',
      tag: 'BANK OFFER',
      title: 'Get 12% OFF* with HDFC Cards',
      description: 'On domestic & international flights. Max discount ₹2,000.',
      cta: 'BOOK NOW',
      code: 'SKYHDFC',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=200&fit=crop',
      bank: 'HDFC'
    },
    {
      id: 4,
      category: 'holidays',
      tag: 'HOLIDAYS',
      title: 'Summer Holiday Packages at 30% OFF*',
      description: 'Book your 2026 summer getaway in advance. Use code.',
      cta: 'EXPLORE',
      code: 'SKYSUMMER',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop',
      bank: null
    },
    {
      id: 5,
      category: 'hotels',
      tag: 'HOTELS',
      title: 'Luxury Stays at Flat 25% OFF*',
      description: 'Premium hotels & resorts across India. Limited rooms.',
      cta: 'VIEW DETAILS',
      code: 'SKYLUXE',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=200&fit=crop',
      bank: null
    },
    {
      id: 6,
      category: 'bank',
      tag: 'BANK OFFER',
      title: 'Flat ₹1,000 OFF with ICICI Cards',
      description: 'On flight bookings above ₹5,000. No upper limit.',
      cta: 'BOOK NOW',
      code: 'SKYICICI',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&h=200&fit=crop',
      bank: 'ICICI'
    },
    {
      id: 7,
      category: 'visa',
      tag: 'VISA',
      title: 'Dubai Visa at Just ₹5,499*',
      description: 'Fast processing. Get your visa in 3-4 working days.',
      cta: 'APPLY NOW',
      code: null,
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300&h=200&fit=crop',
      bank: null
    },
    {
      id: 8,
      category: 'cabs',
      tag: 'CABS',
      title: 'Airport Transfers at Flat ₹499*',
      description: 'Reliable airport pickup & drop. All major cities.',
      cta: 'BOOK NOW',
      code: 'SKYCAB',
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=300&h=200&fit=crop',
      bank: null
    },
    {
      id: 9,
      category: 'trains',
      tag: 'TRAINS',
      title: 'Train Bookings with Zero Convenience Fee',
      description: 'Book IRCTC tickets without any extra charges.',
      cta: 'BOOK NOW',
      code: null,
      image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=300&h=200&fit=crop',
      bank: null
    }
  ];

  const filteredOffers = activeTab === 'all' 
    ? offers 
    : offers.filter(offer => offer.category === activeTab);

  return (
    <section className="offers-section">
      <div className="container">
        {/* Header */}
        <div className="offers-header">
          <h2>Offers</h2>
          <div className="offers-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`offers-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link href="/offers" className="view-all-link">
            VIEW ALL <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        {/* Offers Grid */}
        <div className="offers-grid">
          {filteredOffers.map(offer => (
            <div key={offer.id} className="offer-card">
              <div className="offer-image">
                <img src={offer.image} alt={offer.title} />
                {offer.bank && (
                  <div className="offer-bank-badge">{offer.bank}</div>
                )}
              </div>
              <div className="offer-content">
                <div className="offer-tag-row">
                  <span className="offer-tag">{offer.tag}</span>
                  <span className="offer-tnc">T&C'S APPLY</span>
                </div>
                <h3 className="offer-title">{offer.title}</h3>
                <p className="offer-description">{offer.description}</p>
                {offer.code && (
                  <div className="offer-code">
                    Use code: <strong>{offer.code}</strong>
                  </div>
                )}
                <button className="offer-cta">{offer.cta}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
