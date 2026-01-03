import './FAQ.css';

export default function FAQ() {
  const faqs = [
    {
      question: "How do I make a flight booking on SkyWings?",
      answer: "You can book a flight on SkyWings in five easy steps: Head over to the SkyWings flight booking page, Enter your departure and arrival destinations, Select your air travel dates, Choose from our wide range of cheap flights based on your airfare preferences, Click on 'Book Now' and your air flight booking is done. Alternatively, you can also use our mobile-friendly website for your flight ticket booking."
    },
    {
      question: "Can I avail domestic flight offers on SkyWings?",
      answer: "Of course, you can. While making domestic flight bookings, you can avail any special offer that is active at that time. In accordance with the offer selected, a listing of eligible cheapest flights would show up on your screen. You can then apply the price filter and click on the downwards arrow, following which budget-friendly flights would start showing up in ascending order from the top (lowest price on top)."
    },
    {
      question: "How can I avail budget air tickets on SkyWings?",
      answer: "It's super-easy to avail budget airfare while booking your cheap flight tickets on SkyWings. Just select the 'Price' filter once the available flight options are displayed and adjust according to your convenience. You can select the downward arrow, which will show the lowest airfare at the top and continue downward in ascending order."
    },
    {
      question: "Why could I not avail the flight booking offers at the time of checkout?",
      answer: "SkyWings makes use of a world-class real-time reservation database to list airfare and availability. As dynamic changes in airfare take place, or the available flight tickets sell out, the database reflects the changes in real-time. Hence, we suggest you double-check online flight booking prices when purchasing flight tickets, as the airfare might have been dynamically updated since you first selected the air travel dates or planned your itinerary."
    }
  ];

  return (
    <section className="faq-section">
      <div className="container">
        <div className="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about booking flights</p>
        </div>

        <div className="faq-grid">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-card">
              <h3 className="faq-question">Q - {faq.question}</h3>
              <p className="faq-answer">A: {faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
