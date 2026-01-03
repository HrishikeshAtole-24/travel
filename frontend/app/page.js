import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import PopularDestinations from './components/PopularDestinations/PopularDestinations';
import PopularFlights from './components/PopularFlights/PopularFlights';
import WhyChooseUs from './components/WhyChooseUs/WhyChooseUs';
import FAQ from './components/FAQ/FAQ';
import Footer from './components/Footer/Footer';
import './page.css';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <PopularFlights />
        <PopularDestinations />
        <WhyChooseUs />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
