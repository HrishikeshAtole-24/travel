import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Offers from './components/Offers/Offers';
import TravelInsights from './components/TravelInsights/TravelInsights';
import AdBanner from './components/AdBanner/AdBanner';
import PopularDestinations from './components/PopularDestinations/PopularDestinations';
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
        <Offers />
        <TravelInsights />
        <AdBanner />
        <PopularDestinations />
        <WhyChooseUs />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
