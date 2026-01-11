import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import '../privacy-policy/privacy-policy.css';

export const metadata = {
  title: 'Terms and Conditions - SkyWings',
  description: 'Terms and Conditions for SkyWings Travel Booking Platform'
};

export default function TermsAndConditionsPage() {
  return (
    <>
      <Header />
      <main className="policy-page">
        <div className="container">
          <div className="policy-content">
            <h1>Terms and Conditions</h1>
            <p className="last-updated">Last Updated: January 11, 2026</p>

            <section>
              <h2>1. Agreement to Terms</h2>
              <p>
                By accessing and using the SkyWings platform ("Service"), you agree to be bound by these Terms and 
                Conditions ("Terms"). If you disagree with any part of these terms, you may not access the Service.
              </p>
            </section>

            <section>
              <h2>2. Service Description</h2>
              <p>
                SkyWings is an online travel booking platform that facilitates flight reservations through third-party 
                airlines and service providers. We act as an intermediary between travelers and airlines, providing a 
                convenient platform for searching, comparing, and booking flights.
              </p>
            </section>

            <section>
              <h2>3. Booking and Reservations</h2>
              
              <h3>3.1 Booking Process</h3>
              <ul>
                <li>All bookings are subject to availability and confirmation by the airline</li>
                <li>Prices are subject to change until payment is completed</li>
                <li>You must provide accurate passenger information during booking</li>
                <li>Bookings are confirmed only after successful payment</li>
              </ul>

              <h3>3.2 Pricing</h3>
              <ul>
                <li>All prices are displayed in the selected currency (INR, EUR, USD, etc.)</li>
                <li>Prices include applicable taxes and fees unless otherwise stated</li>
                <li>Currency conversion rates may vary and are subject to change</li>
                <li>Additional airline baggage fees may apply separately</li>
              </ul>

              <h3>3.3 Booking Confirmation</h3>
              <ul>
                <li>You will receive a booking confirmation via email after successful payment</li>
                <li>Booking reference (PNR) will be provided in the confirmation email</li>
                <li>It is your responsibility to verify all booking details</li>
              </ul>
            </section>

            <section>
              <h2>4. Payment Terms</h2>
              
              <h3>4.1 Accepted Payment Methods</h3>
              <ul>
                <li>Credit/Debit Cards (Visa, Mastercard, American Express)</li>
                <li>UPI (Unified Payments Interface)</li>
                <li>Net Banking</li>
                <li>Digital Wallets</li>
              </ul>

              <h3>4.2 Payment Processing</h3>
              <ul>
                <li>Payments are processed through secure payment gateways (Razorpay, Stripe)</li>
                <li>We do not store complete credit card information</li>
                <li>Payment must be completed within 15 minutes of booking initiation</li>
                <li>Failed payments will result in booking cancellation</li>
              </ul>

              <h3>4.3 Payment Security</h3>
              <ul>
                <li>All transactions are encrypted using SSL/TLS technology</li>
                <li>We comply with PCI-DSS standards for payment security</li>
                <li>3D Secure authentication may be required for certain transactions</li>
              </ul>
            </section>

            <section>
              <h2>5. Cancellation and Refund Policy</h2>
              
              <h3>5.1 Cancellation Rules</h3>
              <ul>
                <li>Cancellation rules are determined by the airline's fare rules</li>
                <li>Non-refundable tickets cannot be cancelled for a refund</li>
                <li>Cancellation fees may apply as per airline policy</li>
                <li>Cancellation requests must be made through our platform</li>
              </ul>

              <h3>5.2 Refund Processing</h3>
              <ul>
                <li>Refunds are processed within 7-14 business days</li>
                <li>Refunds are credited to the original payment method</li>
                <li>Service fees and payment gateway charges are non-refundable</li>
                <li>Airlines may deduct cancellation charges before processing refunds</li>
              </ul>
            </section>

            <section>
              <h2>6. User Responsibilities</h2>
              
              <h3>6.1 Account Security</h3>
              <ul>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must notify us immediately of any unauthorized account access</li>
                <li>You are responsible for all activities under your account</li>
              </ul>

              <h3>6.2 Accurate Information</h3>
              <ul>
                <li>You must provide accurate and complete information during booking</li>
                <li>Passenger names must match government-issued ID/passport</li>
                <li>Incorrect information may result in denied boarding</li>
              </ul>

              <h3>6.3 Travel Documents</h3>
              <ul>
                <li>You are responsible for obtaining necessary travel documents (passport, visa, etc.)</li>
                <li>Check visa requirements for your destination country</li>
                <li>Ensure passport validity (minimum 6 months for international travel)</li>
              </ul>
            </section>

            <section>
              <h2>7. Service Limitations</h2>
              <ul>
                <li>We are not responsible for airline schedule changes or flight delays</li>
                <li>We do not guarantee seat assignments</li>
                <li>Special meal requests are subject to airline availability</li>
                <li>We are not liable for airline bankruptcy or closure</li>
              </ul>
            </section>

            <section>
              <h2>8. Prohibited Activities</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Scrape or extract data from our platform</li>
                <li>Impersonate another person or entity</li>
                <li>Upload malicious code or viruses</li>
                <li>Make fraudulent bookings or payments</li>
              </ul>
            </section>

            <section>
              <h2>9. Intellectual Property</h2>
              <p>
                All content on the SkyWings platform, including text, graphics, logos, images, and software, is the 
                property of SkyWings or its licensors and is protected by copyright, trademark, and other intellectual 
                property laws.
              </p>
            </section>

            <section>
              <h2>10. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, SkyWings shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
                directly or indirectly.
              </p>
              <p>Our total liability for any claim shall not exceed the amount paid by you for the specific booking.</p>
            </section>

            <section>
              <h2>11. Force Majeure</h2>
              <p>
                We are not liable for any failure to perform our obligations due to circumstances beyond our reasonable 
                control, including but not limited to natural disasters, wars, pandemics, strikes, or technical failures.
              </p>
            </section>

            <section>
              <h2>12. Dispute Resolution</h2>
              
              <h3>12.1 Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to 
                its conflict of law provisions.
              </p>

              <h3>12.2 Arbitration</h3>
              <p>
                Any disputes arising from these Terms shall be resolved through binding arbitration in Mumbai, India, 
                in accordance with the Arbitration and Conciliation Act, 1996.
              </p>
            </section>

            <section>
              <h2>13. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon 
                posting on our website. Your continued use of the Service after changes constitutes acceptance of the 
                modified Terms.
              </p>
            </section>

            <section>
              <h2>14. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior notice, 
                for any reason, including breach of these Terms.
              </p>
            </section>

            <section>
              <h2>15. Contact Information</h2>
              <p>For questions about these Terms and Conditions, please contact us:</p>
              <div className="contact-info">
                <p><strong>Email:</strong> contact@hrishikeshatole.com, rishiatole4545@gmail.com</p>
                <p><strong>Phone:</strong> +91 1800-123-4567</p>
                <p><strong>Address:</strong> SkyWings Travel Services, Mumbai, India</p>
              </div>
            </section>

            <section>
              <h2>16. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited 
                or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force 
                and effect.
              </p>
            </section>

            <section>
              <h2>17. Entire Agreement</h2>
              <p>
                These Terms constitute the entire agreement between you and SkyWings regarding the use of the Service 
                and supersede all prior agreements and understandings.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
