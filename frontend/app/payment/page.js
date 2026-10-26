'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icon from '../components/Icon/Icon';
import { StateMessage } from '../components/Skeleton/Skeleton';
import './payment.css';

/**
 * Payment hand-off. Payments run on Razorpay's hosted checkout; this page only
 * forwards to a pending checkout link if one was saved, or explains where to pay.
 */
export default function PaymentPage() {
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
      const url = saved.checkoutUrl || saved.paymentUrl;
      if (url && /^https:\/\//.test(url)) {
        setCheckoutUrl(url);
        window.location.href = url;
      }
    } catch {
      // No saved checkout — fall through to the help state
    }
    setChecked(true);
  }, []);

  return (
    <>
      <Header />
      <main className="pay-page">
        <div className="container pay-wrap">
          {checkoutUrl ? (
            <div className="pay-card" role="status" aria-live="polite">
              <span className="pay-lock"><Icon name="shield-check" size={28} /></span>
              <h1>Taking you to secure payment…</h1>
              <p>You’ll pay on Razorpay’s checkout — UPI, cards and net banking. We never see your card details.</p>
              <span className="skel-note__bar" style={{ width: 160 }}><span /></span>
              <a href={checkoutUrl} className="btn btn-primary">Continue to Razorpay</a>
            </div>
          ) : checked ? (
            <StateMessage icon="shield-check" tone="brand" title="No payment in progress"
              action={<><Link href="/my-bookings" className="btn btn-primary">Go to My trips</Link><Link href="/" className="btn btn-secondary">Start a new search</Link></>}>
              Bookings waiting for payment show a “Complete payment” button in My trips.
            </StateMessage>
          ) : null}

          <ul className="pay-methods" aria-label="Accepted payment methods">
            {['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net banking'].map(m => <li key={m}>{m}</li>)}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
