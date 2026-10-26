'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icon from '../components/Icon/Icon';
import { PageSkeleton } from '../components/Skeleton/Skeleton';
import '../styles/confirmation.css';
import './payment-failed.css';

// Figma "Payment Failed" — same voucher language as Booking Confirmed
function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentReference = searchParams.get('payment_reference');
  const bookingReference = searchParams.get('booking') || searchParams.get('booking_reference');
  const reason = searchParams.get('reason');

  return (
    <>
      <Header />
      <main className="cf-page">
        <section className="cf-hero is-failed">
          <div className="container">
            <span className="cf-tick"><Icon name="x" size={34} strokeWidth={2.5} /></span>
            <h1 className="cf-title">Payment <em className="sw-editorial">didn’t go through</em></h1>
            <p className="cf-sub">No money was taken — or, if it was, it’s refunded automatically by your bank within 5–7 days.</p>
          </div>
        </section>

        <div className="cf-body">
          <article className="cf-voucher">
            {(paymentReference || bookingReference) && (
              <div className="cf-ref">
                <div>
                  <span className="sw-overline">{bookingReference ? 'Booking reference' : 'Payment reference'}</span>
                  <strong className="cf-ref__code">{bookingReference || paymentReference}</strong>
                </div>
                <span className="sw-badge sw-badge--danger">Payment failed</span>
              </div>
            )}

            <div className="cf-status is-warn">
              <Icon name="info" size={16} />
              {reason || 'The bank or payment provider declined this attempt. Your booking is saved — you can pay again.'}
            </div>

            <div className="pf-grid">
              <div>
                <h3>Common reasons</h3>
                <ul>
                  <li>Card declined or daily limit reached</li>
                  <li>Wrong OTP, CVV or UPI PIN</li>
                  <li>Payment window timed out</li>
                  <li>Bank server or network issue</li>
                </ul>
              </div>
              <div>
                <h3>What to try</h3>
                <ul>
                  <li>Pay again from My trips</li>
                  <li>Use UPI or a different card</li>
                  <li>Wait a few minutes, then retry</li>
                  <li>Call your bank if it keeps failing</li>
                </ul>
              </div>
            </div>

            <div className="cf-actions">
              <button className="btn btn-accent" onClick={() => router.push('/my-bookings')}><Icon name="ticket" size={16} /> Pay again from My trips</button>
              <button className="btn btn-secondary" onClick={() => router.push('/')}>New search</button>
              <span className="spacer" />
              <Link href="/contact" className="btn btn-ghost"><Icon name="headset" size={16} /> Contact support</Link>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<><Header /><PageSkeleton /></>}>
      <PaymentFailedContent />
    </Suspense>
  );
}
