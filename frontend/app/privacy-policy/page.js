import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import './privacy-policy.css';

export const metadata = {
  title: 'Privacy Policy - SkyWings',
  description: 'Privacy Policy for SkyWings Travel Booking Platform'
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="policy-page">
        <div className="container">
          <div className="policy-content">
            <h1>Privacy Policy</h1>
            <p className="last-updated">Last Updated: January 11, 2026</p>

            <section>
              <h2>1. Introduction</h2>
              <p>
                Welcome to SkyWings ("we," "our," or "us"). We are committed to protecting your personal 
                information and your right to privacy. This Privacy Policy explains how we collect, use, 
                disclose, and safeguard your information when you visit our website and use our flight 
                booking services.
              </p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>
              
              <h3>2.1 Personal Information</h3>
              <p>We collect personal information that you voluntarily provide to us when you:</p>
              <ul>
                <li>Register for an account</li>
                <li>Make a flight booking</li>
                <li>Subscribe to our newsletter</li>
                <li>Contact our customer support</li>
              </ul>
              
              <p>This information may include:</p>
              <ul>
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Passport details (for international bookings)</li>
                <li>Date of birth</li>
                <li>Payment information</li>
                <li>Billing address</li>
              </ul>

              <h3>2.2 Automatically Collected Information</h3>
              <p>When you visit our website, we automatically collect certain information, including:</p>
              <ul>
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>Pages visited and time spent</li>
                <li>Referring website</li>
                <li>Location data</li>
              </ul>
            </section>

            <section>
              <h2>3. How We Use Your Information</h2>
              <p>We use the collected information for the following purposes:</p>
              <ul>
                <li><strong>Process Bookings:</strong> To complete your flight reservations and send booking confirmations</li>
                <li><strong>Customer Service:</strong> To respond to your inquiries and provide support</li>
                <li><strong>Account Management:</strong> To create and manage your user account</li>
                <li><strong>Payment Processing:</strong> To process payments securely through our payment partners (Razorpay, Stripe)</li>
                <li><strong>Communication:</strong> To send booking updates, promotional offers, and important notices</li>
                <li><strong>Analytics:</strong> To understand how users interact with our platform and improve our services</li>
                <li><strong>Security:</strong> To detect and prevent fraudulent activities</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and resolve disputes</li>
              </ul>
            </section>

            <section>
              <h2>4. Sharing Your Information</h2>
              <p>We may share your information with third parties in the following situations:</p>
              
              <h3>4.1 Service Providers</h3>
              <ul>
                <li><strong>Airlines:</strong> To complete flight bookings</li>
                <li><strong>Payment Processors:</strong> Razorpay, Stripe for secure payment processing</li>
                <li><strong>Amadeus:</strong> For flight data and booking management</li>
                <li><strong>Email Services:</strong> For sending booking confirmations and notifications</li>
              </ul>

              <h3>4.2 Legal Requirements</h3>
              <p>We may disclose your information if required by law or in response to valid requests by public authorities.</p>

              <h3>4.3 Business Transfers</h3>
              <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>
            </section>

            <section>
              <h2>5. Payment Security</h2>
              <p>
                We do not store complete payment card details on our servers. All payment transactions are processed 
                through PCI-DSS compliant payment gateways (Razorpay and Stripe). Your payment information is encrypted 
                and transmitted securely using industry-standard SSL/TLS protocols.
              </p>
            </section>

            <section>
              <h2>6. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
                Privacy Policy, unless a longer retention period is required or permitted by law. Booking records are 
                typically retained for 7 years for accounting and tax purposes.
              </p>
            </section>

            <section>
              <h2>7. Your Privacy Rights</h2>
              <p>Depending on your location, you may have the following rights:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Objection:</strong> Object to processing of your personal data</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Withdraw Consent:</strong> Withdraw your consent for data processing</li>
              </ul>
              <p>To exercise these rights, please contact us at privacy@skywings.com</p>
            </section>

            <section>
              <h2>8. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our website and store certain 
                information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent. 
                However, some features of our service may not function properly without cookies.
              </p>
            </section>

            <section>
              <h2>9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and maintained on computers located outside of your country where 
                data protection laws may differ. We ensure appropriate safeguards are in place to protect your information 
                during such transfers.
              </p>
            </section>

            <section>
              <h2>10. Children's Privacy</h2>
              <p>
                Our services are not directed to individuals under the age of 18. We do not knowingly collect personal 
                information from children. If you are a parent or guardian and believe your child has provided us with 
                personal information, please contact us.
              </p>
            </section>

            <section>
              <h2>11. Security Measures</h2>
              <p>We implement appropriate technical and organizational security measures to protect your personal information, including:</p>
              <ul>
                <li>SSL/TLS encryption for data transmission</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
                <li>Encrypted database storage</li>
              </ul>
            </section>

            <section>
              <h2>12. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
                Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy 
                Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2>13. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="contact-info">
                <p><strong>Email:</strong> contact@hrishikeshatole.com, rishiatole4545@gmail.com</p>
                <p><strong>Phone:</strong> +91 1800-123-4567</p>
                <p><strong>Address:</strong> SkyWings Travel Services, Mumbai, India</p>
              </div>
            </section>

            <section>
              <h2>14. Consent</h2>
              <p>
                By using our website and services, you consent to the collection and use of your information as described 
                in this Privacy Policy.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
