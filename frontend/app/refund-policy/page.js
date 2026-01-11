import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import '../privacy-policy/privacy-policy.css';

export const metadata = {
  title: 'Refund Policy - SkyWings',
  description: 'Refund and Cancellation Policy for SkyWings Travel Bookings'
};

export default function RefundPolicyPage() {
  return (
    <>
      <Header />
      <main className="policy-page">
        <div className="container">
          <div className="policy-content">
            <h1>Refund and Cancellation Policy</h1>
            <p className="last-updated">Last Updated: January 11, 2026</p>

            <section>
              <h2>1. Overview</h2>
              <p>
                This Refund Policy outlines the terms and conditions for cancellations and refunds on flight bookings 
                made through SkyWings. Please read this policy carefully before making a booking.
              </p>
            </section>

            <section>
              <h2>2. Cancellation Timeframes</h2>
              
              <h3>2.1 Free Cancellation Period (Risk-Free Booking)</h3>
              <ul>
                <li><strong>Within 24 hours of booking:</strong> Full refund (if flight is 7+ days away)</li>
                <li>No cancellation fees from SkyWings</li>
                <li>Refund processed within 5-7 business days</li>
              </ul>

              <h3>2.2 Standard Cancellation</h3>
              <p>Cancellations made after the 24-hour risk-free period are subject to airline fare rules:</p>
              <ul>
                <li><strong>More than 7 days before departure:</strong> Moderate cancellation charges apply</li>
                <li><strong>3-7 days before departure:</strong> Higher cancellation charges apply</li>
                <li><strong>Less than 3 days before departure:</strong> Significant cancellation charges apply</li>
                <li><strong>Within 24 hours of departure:</strong> May not be eligible for refund</li>
              </ul>

              <h3>2.3 No-Show Policy</h3>
              <ul>
                <li>Failure to board the flight without prior cancellation is considered a "no-show"</li>
                <li>No-show bookings are typically non-refundable</li>
                <li>Airline may charge 100% of the ticket value</li>
              </ul>
            </section>

            <section>
              <h2>3. Refund Eligibility</h2>

              <h3>3.1 Refundable Tickets</h3>
              <ul>
                <li>Clearly marked as "Refundable" at the time of booking</li>
                <li>Full or partial refund based on fare rules</li>
                <li>Cancellation charges as per airline policy</li>
                <li>Service fees may be non-refundable</li>
              </ul>

              <h3>3.2 Non-Refundable Tickets</h3>
              <ul>
                <li>Marked as "Non-Refundable" during booking</li>
                <li>Generally no refund on cancellation</li>
                <li>May be eligible for airline credit or rebooking</li>
                <li>Airport taxes may be refundable in some cases</li>
              </ul>

              <h3>3.3 Partially Refundable Tickets</h3>
              <ul>
                <li>Partial refund after deducting cancellation fees</li>
                <li>Refund amount depends on airline fare rules</li>
                <li>Applicable taxes and fees are refundable</li>
              </ul>
            </section>

            <section>
              <h2>4. Refund Processing</h2>

              <h3>4.1 Processing Time</h3>
              <ul>
                <li><strong>Credit/Debit Cards:</strong> 7-14 business days</li>
                <li><strong>UPI/Net Banking:</strong> 5-10 business days</li>
                <li><strong>Digital Wallets:</strong> 3-7 business days</li>
                <li><strong>Airline Credits:</strong> Instant to 24 hours</li>
              </ul>

              <h3>4.2 Refund Method</h3>
              <ul>
                <li>Refunds are processed to the original payment method</li>
                <li>If original method is unavailable, bank transfer may be arranged</li>
                <li>Airline credits (if applicable) are issued directly by the airline</li>
              </ul>

              <h3>4.3 Refund Components</h3>
              <p>Your refund may include:</p>
              <ul>
                <li><strong>Base Fare:</strong> Subject to airline cancellation policy</li>
                <li><strong>Taxes:</strong> Usually fully refundable</li>
                <li><strong>Fuel Surcharge:</strong> May be partially refundable</li>
                <li><strong>Service Fee:</strong> Non-refundable</li>
                <li><strong>Payment Gateway Charges:</strong> Non-refundable</li>
              </ul>
            </section>

            <section>
              <h2>5. Cancellation Charges</h2>

              <h3>5.1 SkyWings Cancellation Fees</h3>
              <ul>
                <li><strong>Domestic Flights:</strong> ₹250 - ₹500 per passenger</li>
                <li><strong>International Flights:</strong> ₹500 - ₹1000 per passenger</li>
                <li>Waived during the 24-hour risk-free period</li>
              </ul>

              <h3>5.2 Airline Cancellation Fees</h3>
              <ul>
                <li>Vary by airline, route, and fare type</li>
                <li>Can range from 10% to 100% of ticket value</li>
                <li>Displayed before confirming cancellation</li>
              </ul>

              <h3>5.3 Total Deductions</h3>
              <p>The final refund amount is calculated as:</p>
              <div className="contact-info">
                <p><strong>Refund Amount = Total Paid - Airline Cancellation Fee - SkyWings Service Fee - Payment Gateway Charges</strong></p>
              </div>
            </section>

            <section>
              <h2>6. Special Circumstances</h2>

              <h3>6.1 Flight Cancellation by Airline</h3>
              <ul>
                <li>Full refund of ticket value (including all fees)</li>
                <li>Or rebooking on next available flight at no extra cost</li>
                <li>Airline compensation may apply for EU/UK flights</li>
              </ul>

              <h3>6.2 Flight Delays</h3>
              <ul>
                <li><strong>Delay &gt; 3 hours:</strong> Rebooking or refund option</li>
                <li><strong>Delay &gt; 5 hours:</strong> Full refund without cancellation charges</li>
                <li>Airline may provide accommodation for significant delays</li>
              </ul>

              <h3>6.3 Schedule Changes</h3>
              <ul>
                <li>If airline changes flight time by more than 2 hours</li>
                <li>Option to accept new schedule or cancel with full refund</li>
                <li>No cancellation fees apply</li>
              </ul>

              <h3>6.4 Medical Emergencies</h3>
              <ul>
                <li>Medical certificate required for consideration</li>
                <li>Subject to airline approval</li>
                <li>Reduced cancellation fees may apply</li>
                <li>Documentation must be submitted within 24 hours</li>
              </ul>
            </section>

            <section>
              <h2>7. Payment Failure Refunds</h2>
              <ul>
                <li>If payment is deducted but booking fails, full refund within 5-7 days</li>
                <li>No cancellation fees apply</li>
                <li>Automatic refund initiation</li>
                <li>Contact support if refund not received within 14 days</li>
              </ul>
            </section>

            <section>
              <h2>8. Group Booking Cancellations</h2>
              <ul>
                <li>Group bookings (9+ passengers) have special cancellation rules</li>
                <li>Partial cancellations allowed</li>
                <li>Different cancellation charges may apply</li>
                <li>Contact support for group cancellation requests</li>
              </ul>
            </section>

            <section>
              <h2>9. How to Cancel Your Booking</h2>

              <h3>9.1 Online Cancellation</h3>
              <ol>
                <li>Log in to your SkyWings account</li>
                <li>Go to "My Bookings"</li>
                <li>Select the booking you want to cancel</li>
                <li>Click "Cancel Booking"</li>
                <li>Review cancellation charges</li>
                <li>Confirm cancellation</li>
                <li>Receive cancellation confirmation via email</li>
              </ol>

              <h3>9.2 Customer Support Cancellation</h3>
              <ul>
                <li>Call: +91 1800-123-4567</li>
                <li>Email: support@skywings.com</li>
                <li>Live Chat: Available on website</li>
                <li>Provide booking reference and reason for cancellation</li>
              </ul>
            </section>

            <section>
              <h2>10. Refund Tracking</h2>
              <ul>
                <li>Check refund status in "My Bookings" section</li>
                <li>Email notifications sent at each refund stage</li>
                <li>Refund reference number provided for tracking</li>
                <li>Contact support if refund is delayed beyond stated timeframe</li>
              </ul>
            </section>

            <section>
              <h2>11. Non-Refundable Components</h2>
              <p>The following are typically non-refundable:</p>
              <ul>
                <li>SkyWings service fee/convenience fee</li>
                <li>Payment gateway charges</li>
                <li>Travel insurance (if purchased separately)</li>
                <li>Seat selection charges</li>
                <li>Meal pre-booking charges</li>
                <li>Extra baggage charges</li>
              </ul>
            </section>

            <section>
              <h2>12. International Bookings</h2>
              <ul>
                <li>Subject to international airline policies</li>
                <li>Currency conversion charges may apply on refunds</li>
                <li>Processing time may be longer (10-21 days)</li>
                <li>Visa/travel document cancellation is customer's responsibility</li>
              </ul>
            </section>

            <section>
              <h2>13. Dispute Resolution</h2>
              <ul>
                <li>Contact customer support for refund disputes</li>
                <li>Provide booking reference and transaction details</li>
                <li>Response within 24-48 hours</li>
                <li>Escalation to management if unresolved</li>
              </ul>
            </section>

            <section>
              <h2>14. Important Notes</h2>
              <ul>
                <li>Refund policies are subject to airline terms and conditions</li>
                <li>SkyWings acts as an intermediary and follows airline policies</li>
                <li>Always check fare rules before booking</li>
                <li>Consider travel insurance for flexible cancellation</li>
                <li>Save all booking and cancellation confirmations</li>
              </ul>
            </section>

            <section>
              <h2>15. Contact for Refund Queries</h2>
              <div className="contact-info">
                <p><strong>Email:</strong> contact@hrishikeshatole.com, rishiatole4545@gmail.com</p>
                <p><strong>Phone:</strong> +91 1800-123-4567</p>
                <p><strong>Hours:</strong> 24/7 Customer Support</p>
                <p><strong>Address:</strong> SkyWings Travel Services, Mumbai, India</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
