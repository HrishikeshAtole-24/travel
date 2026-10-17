'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icon from '../components/Icon/Icon';
import '../hotels/hotels.css';
import './contact.css';

// Real contact channels come from env; nothing is shown that isn't configured
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '';

const TOPICS = ['Booking question', 'Change or cancel', 'Refund status', 'Payment issue', 'Feedback', 'Partnership', 'Other'];

const FAQ = [
  { q: 'How do I cancel or change a booking?', a: 'Open My trips, choose the booking and use Cancel booking. Refunds follow the airline’s fare rules or the hotel’s cancellation policy shown when you booked.' },
  { q: 'When will I get my refund?', a: 'Once a cancellation is approved, the refund goes back to your original payment method. Banks usually take 5–7 working days to show it.' },
  { q: 'Which payment methods can I use?', a: 'UPI, credit and debit cards, and net banking — all through Razorpay’s secure checkout. We never see or store your card details.' },
  { q: 'Why did my price change at checkout?', a: 'Fares and room rates are live. We re-confirm them with the supplier just before payment and always show you the final total before you pay.' }
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', reference: '', topic: TOPICS[0], message: '' });
  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  // Opens the visitor's mail app with everything filled in — no silent "sent" state
  const mailto = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${form.topic}${form.reference ? ` · ${form.reference}` : ''}`)}&body=${encodeURIComponent(`${form.message}\n\n— ${form.name}${form.email ? ` (${form.email})` : ''}`)}`
    : null;

  return (
    <>
      <Header />
      <main className="contact-page">
        <section className="contact-hero">
          <div className="container">
            <p className="sw-overline contact-eyebrow">Help &amp; support</p>
            <h1>How can we <em className="sw-editorial">help?</em></h1>
            <p>Most answers are a click away in My trips. For anything else, reach us below.</p>
          </div>
        </section>

        <div className="container contact-quick">
          <Link href="/my-bookings" className="contact-tile">
            <Icon name="ticket" size={22} />
            <strong>Manage a booking</strong>
            <span>Cancel, download tickets, check refunds</span>
          </Link>
          {SUPPORT_EMAIL && (
            <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-tile">
              <Icon name="mail" size={22} />
              <strong>Email support</strong>
              <span>{SUPPORT_EMAIL}</span>
            </a>
          )}
          {SUPPORT_PHONE && (
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className="contact-tile">
              <Icon name="headset" size={22} />
              <strong>Call us</strong>
              <span>{SUPPORT_PHONE}</span>
            </a>
          )}
          <div className="contact-tile contact-tile--static">
            <Icon name="info" size={22} />
            <strong>Chat assistant</strong>
            <span>Use the chat button at the bottom-right of any page</span>
          </div>
        </div>

        <section className="container contact-main">
          <div className="contact-form-card">
            <h2>Write to us</h2>
            <p className="hd-muted">Include your booking reference so we can find your trip quickly.</p>
            <form className="contact-form" onSubmit={(e) => { e.preventDefault(); if (mailto) window.location.href = mailto; }}>
              <div className="contact-grid">
                <label><span className="form-label">Your name</span><input className="form-input" value={form.name} onChange={set('name')} required autoComplete="name" /></label>
                <label><span className="form-label">Email</span><input className="form-input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
                <label><span className="form-label">Booking reference <span className="hb-optional">optional</span></span><input className="form-input" value={form.reference} onChange={set('reference')} placeholder="e.g. SKY-H7K2Q9" /></label>
                <label><span className="form-label">Topic</span>
                  <select className="form-select" value={form.topic} onChange={set('topic')}>{TOPICS.map(t => <option key={t}>{t}</option>)}</select>
                </label>
              </div>
              <label><span className="form-label">Message</span><textarea className="form-textarea" rows="5" value={form.message} onChange={set('message')} required placeholder="Tell us what happened" /></label>
              {mailto ? (
                <div className="contact-submit">
                  <p className="hd-muted">This opens your email app with your message ready to send.</p>
                  <button type="submit" className="btn btn-primary btn-lg"><Icon name="mail" size={18} /> Write email</button>
                </div>
              ) : (
                <p className="hb-price-change"><Icon name="info" size={16} /> Email support isn’t set up on this site yet — please use the chat assistant.</p>
              )}
            </form>
          </div>

          <div className="contact-faq">
            <h2>Common questions</h2>
            <div className="faq-list">
              {FAQ.map((item, i) => (
                <details key={item.q} className="faq-item" open={i === 0}>
                  <summary><span>{item.q}</span><Icon name="chevron-down" size={20} className="faq-item__chev" /></summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
