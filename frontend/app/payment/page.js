'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import './payment.css';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingData, setBookingData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  useEffect(() => {
    const data = sessionStorage.getItem('bookingData');
    if (data) {
      setBookingData(JSON.parse(data));
    } else {
      router.push('/');
    }
  }, []);

  const handlePayment = () => {
    // In real implementation, this would initiate Razorpay/Stripe payment
    alert('Payment processing would happen here. Integration with Razorpay/Stripe required.');
    // For now, redirect to confirmation
    router.push(`/confirmation?bookingId=${bookingData?.bookingId}`);
  };

  if (!bookingData) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="payment-page">
        <div className="container">
          <div className="payment-layout">
            <section className="payment-methods">
              <h1>Payment</h1>

              <div className="payment-card">
                <h2>Select Payment Method</h2>

                <div className="payment-options">
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="payment-option-content">
                      <div className="payment-icon">💳</div>
                      <div>
                        <div className="payment-name">Credit/Debit Card</div>
                        <div className="payment-desc">Pay with Razorpay</div>
                      </div>
                    </div>
                  </label>

                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="payment-option-content">
                      <div className="payment-icon">📱</div>
                      <div>
                        <div className="payment-name">UPI</div>
                        <div className="payment-desc">Google Pay, PhonePe, Paytm</div>
                      </div>
                    </div>
                  </label>

                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="netbanking"
                      checked={paymentMethod === 'netbanking'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="payment-option-content">
                      <div className="payment-icon">🏦</div>
                      <div>
                        <div className="payment-name">Net Banking</div>
                        <div className="payment-desc">Pay via your bank</div>
                      </div>
                    </div>
                  </label>
                </div>

                <button 
                  className="btn btn-primary btn-lg payment-submit-btn"
                  onClick={handlePayment}
                >
                  Proceed to Pay ₹{bookingData.totalAmount?.toLocaleString()}
                </button>
              </div>
            </section>

            <aside className="payment-summary">
              <div className="summary-card">
                <h3>Booking Details</h3>
                
                <div className="summary-item">
                  <span>Booking ID</span>
                  <span className="summary-value">{bookingData.bookingId}</span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-item">
                  <span>Total Amount</span>
                  <span className="summary-total-amount">
                    ₹{bookingData.totalAmount?.toLocaleString()}
                  </span>
                </div>

                <div className="security-badge">
                  <span>🔒</span>
                  <span>Secure Payment</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
