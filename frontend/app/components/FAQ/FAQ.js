import Icon from '../Icon/Icon';
import './FAQ.css';

const FAQS = [
  {
    q: 'How do I book a flight or hotel?',
    a: 'Search from the home page, pick a fare or room, add traveller details and pay. Your e-ticket or hotel voucher arrives by email and stays in My trips.'
  },
  {
    q: 'What does “via Duffel” or “via Nuitée” mean?',
    a: 'It’s the supplier that issues your ticket or confirms your room. We show it on every result so you always know who you’re buying from.'
  },
  {
    q: 'Can the price change after I choose?',
    a: 'Fares and rates are live. We re-confirm the price with the supplier just before payment; if it has changed, you see the new total before paying anything.'
  },
  {
    q: 'How do cancellations and refunds work?',
    a: 'Each fare and room shows its policy before you book. Cancel from My trips and track the refund there — it goes back to the original payment method.'
  }
];

// Native <details> keeps this a server component with keyboard support built in
export default function FAQ() {
  return (
    <section className="sw-section sw-section--surface">
      <div className="container faq-layout">
        <div>
          <h2 className="sw-section__title">Questions, answered</h2>
          <p className="sw-section__sub">Still stuck? <a href="/contact">Talk to support</a>.</p>
        </div>

        <div className="faq-list">
          {FAQS.map((item, i) => (
            <details key={item.q} className="faq-item" open={i === 0}>
              <summary>
                <span>{item.q}</span>
                <Icon name="chevron-down" size={20} className="faq-item__chev" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
